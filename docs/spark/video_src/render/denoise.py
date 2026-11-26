# Voice clean-up v2: spectral noise reduction (Wiener-style, noise profile from each take's own pauses),
# a soft gate between phrases, then clarity EQ, gentle compression and loudness to -16 LUFS.
# Output length is identical to the input, so the video timeline does not change.
import sys, os, glob, json, subprocess
import numpy as np
from scipy.signal import stft, istft
from scipy.ndimage import uniform_filter

S, V, OUTD = sys.argv[1], sys.argv[2], sys.argv[3]
FF = os.path.join(S, 'avlib', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
SR = 48000
os.makedirs(OUTD, exist_ok=True)

def load(p, filt=None):
    cmd = [FF, '-v', 'error', '-i', p, '-vn', '-ac', '1', '-ar', str(SR)]
    if filt: cmd += ['-af', filt]
    raw = subprocess.run(cmd + ['-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)

def denoise(x):
    n = len(x)
    f, t, Z = stft(x, SR, nperseg=2048, noverlap=1536)
    P = np.abs(Z) ** 2
    # noise profile: per-bin low percentile over time (the pauses), slightly raised
    frame_e = P.sum(0)
    quiet = frame_e <= np.percentile(frame_e, 20)
    N = np.median(P[:, quiet], axis=1, keepdims=True) * 1.6
    # decision-directed a-priori SNR (Ephraim-Malah style smoothing) -> Wiener gain
    post = P / (N + 1e-12)
    G = np.zeros_like(P); prev = np.ones(P.shape[0])
    for k in range(P.shape[1]):
        prio = 0.96 * (prev ** 2) * post[:, max(k - 1, 0)] + 0.04 * np.maximum(post[:, k] - 1, 0)
        g = prio / (1 + prio)
        G[:, k] = g; prev = g
    G = uniform_filter(G, size=(3, 3))
    G = np.maximum(G, 10 ** (-24 / 20))
    _, y = istft(Z * G, SR, nperseg=2048, noverlap=1536)
    y = y[:n]
    if len(y) < n: y = np.pad(y, (0, n - len(y)))
    # soft gate between phrases: 10 ms frames, open above (floor + 14 dB), smooth attack/release
    hop = 480; m = n // hop
    e = np.sqrt((y[:m * hop].reshape(m, hop) ** 2).mean(1)) + 1e-9
    db = 20 * np.log10(e)
    floor = np.percentile(db, 15)
    thr = floor + 14
    open_ = (db > thr).astype(float)
    # hold 150 ms after speech, open 20 ms before it
    hold = np.convolve(open_, np.ones(15), mode='full')[:m] > 0
    pre = np.convolve(open_[::-1], np.ones(2), mode='full')[:m][::-1] > 0
    target = np.where(hold | pre, 1.0, 10 ** (-30 / 20))
    g = np.empty(m); cur = target[0]
    for i in range(m):
        a = 0.5 if target[i] > cur else 0.12   # fast attack, slower release
        cur = cur + a * (target[i] - cur); g[i] = cur
    gs = np.interp(np.arange(n), np.arange(m) * hop + hop / 2, g)
    return y * gs

def finish(y, out):
    tmp = out + '.tmp.wav'
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_f32le', tmp], input=y.astype(np.float64).tobytes(), check=True)
    chain = 'highpass=f=90,equalizer=f=280:t=o:w=1:g=-2,equalizer=f=3400:t=o:w=1.2:g=2.5,equalizer=f=9000:t=o:w=1:g=-1.5,acompressor=threshold=-22dB:ratio=2.5:attack=6:release=90:makeup=1.5'
    meas = subprocess.run([FF, '-hide_banner', '-i', tmp, '-af', chain + ',loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = f"loudnorm=I=-16:TP=-1.5:LRA=7:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
    subprocess.run([FF, '-v', 'error', '-y', '-i', tmp, '-af', chain + ',' + ln + ',aresample=48000', '-c:a', 'pcm_s24le', out], check=True)
    os.remove(tmp)

jobs = [('face', os.path.join(V, 'raw', 'WhatsApp Video 2026-11-26 at 16.58.40.mp4'))]
jobs += sorted([('scene' + os.path.basename(p)[5:-4], p) for p in glob.glob(os.path.join(V, 'processed', 'scene*.wav'))])
for name, p in jobs:
    x = load(p, 'highpass=f=70') if name == 'face' else load(p)
    y = denoise(x)
    finish(y, os.path.join(OUTD, name + '.wav'))
    print('cleaned', name, len(x), flush=True)
