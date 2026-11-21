"""Clean the competition voice-over so every word is clear.

    python scripts/clean_vo.py

Reads   public/assets/vo-comp-raw/s01..s11.wav  (untouched conversions)
Writes  public/assets/vo-comp/s01..s11.wav      (used by the video)

Chain, per clip (all in numpy/scipy, no extra installs):
  1. High-pass at 80 Hz       removes rumble and hum
  2. Spectral gating          noise profile from the quietest 10% of frames,
                              soft mask with smoothing, so hiss and room noise
                              drop without a "watery" sound
  3. Presence lift            +3 dB peak at 3 kHz for consonant clarity
  4. Gentle levelling         slow RMS compression, then peak-normalise to -3 dBFS
"""
import glob
import os

import numpy as np
from scipy import ndimage, signal
from scipy.io import wavfile

SRC = 'public/assets/vo-comp-raw'
DST = 'public/assets/vo-comp'


def peaking(fs, f0, gain_db, q):
    a = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / fs
    alpha = np.sin(w0) / (2 * q)
    b = [1 + alpha * a, -2 * np.cos(w0), 1 - alpha * a]
    den = [1 + alpha / a, -2 * np.cos(w0), 1 - alpha / a]
    return np.array(b) / den[0], np.array(den) / den[0]


def clean(x, fs):
    # 1. high-pass
    sos = signal.butter(4, 80, 'highpass', fs=fs, output='sos')
    x = signal.sosfiltfilt(sos, x)

    # 2. spectral gating
    nper = 1024
    f, t, Z = signal.stft(x, fs, nperseg=nper, noverlap=nper * 3 // 4)
    mag = np.abs(Z)
    energy = mag.mean(axis=0)
    quiet = energy <= np.percentile(energy, 10)
    noise = mag[:, quiet].mean(axis=1, keepdims=True)
    noise_std = mag[:, quiet].std(axis=1, keepdims=True)
    thresh = noise + 1.5 * noise_std
    mask = np.clip((mag - thresh) / (thresh + 1e-9), 0, 1)
    mask = ndimage.uniform_filter(mask, size=(3, 5))  # smooth across freq/time
    floor = 0.12  # keep a little ambience so speech never sounds gated
    gain = floor + (1 - floor) * mask
    _, y = signal.istft(Z * gain, fs, nperseg=nper, noverlap=nper * 3 // 4)
    y = y[: len(x)]

    # 3. presence lift
    b, a = peaking(fs, 3000, 3.0, 0.9)
    y = signal.lfilter(b, a, y)

    # 4. gentle levelling: slow RMS envelope, compress above -24 dBFS at 2:1
    win = int(0.05 * fs)
    env = np.sqrt(ndimage.uniform_filter1d(y ** 2, win) + 1e-12)
    env_db = 20 * np.log10(env)
    over = np.maximum(env_db - (-24), 0)
    g = 10 ** (-(over * 0.5) / 20)
    g = ndimage.uniform_filter1d(g, int(0.02 * fs))
    y = y * g
    y = y / (np.abs(y).max() + 1e-9) * 10 ** (-3 / 20)
    return y


for path in sorted(glob.glob(os.path.join(SRC, 's*.wav'))):
    fs, x = wavfile.read(path)
    x = x.astype(np.float64) / 32768.0
    if x.ndim > 1:
        x = x.mean(axis=1)
    y = clean(x, fs)
    # noise-floor estimate before/after, on the quietest 10% of 50 ms windows
    def floor_db(s):
        w = int(0.05 * fs)
        r = np.sqrt(np.array([np.mean(s[i:i + w] ** 2) for i in range(0, len(s) - w, w)]) + 1e-12)
        return 20 * np.log10(np.percentile(r, 10)), 20 * np.log10(np.percentile(r, 90))
    nb, sb = floor_db(x / (np.abs(x).max() + 1e-9))
    na, sa = floor_db(y / (np.abs(y).max() + 1e-9))
    wavfile.write(os.path.join(DST, os.path.basename(path)), fs, (y * 32767).astype(np.int16))
    print(f'{os.path.basename(path)}: speech-to-noise {sb - nb:5.1f} dB -> {sa - na:5.1f} dB')
