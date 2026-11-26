# Original score + sound design + voice-over mix, laid out on timeline.json.
# Everything here is synthesised from scratch (no samples, no third-party music).
import sys, os, json, subprocess
import numpy as np

S, VIDEO_DIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FF = os.path.join(S, 'avlib', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
TL = json.load(open(os.path.join(S, 'render', 'timeline.json'), encoding='utf-8'))
SR = 48000
T = TL['total']
N = int(T * SR) + SR
rng = np.random.default_rng(2026)
scenes = {s['id']: s for s in TL['scenes']}
order = TL['scenes']

def decode(path, filt=None):
    cmd = [FF, '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(SR)]
    if filt: cmd += ['-af', filt]
    raw = subprocess.run(cmd + ['-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)

# ---------- voice-over bus ----------
vo = np.zeros(N)
face = decode(os.path.join(VIDEO_DIR, 'raw', 'WhatsApp Video 2026-11-26 at 16.58.40.mp4'),
              'highpass=f=80,afftdn=nf=-30:tn=1,loudnorm=I=-16:TP=-1.5:LRA=11')
vo[:len(face)] += face[:N]
for s in order:
    if s.get('kind') == 'vo':
        a = decode(os.path.join(VIDEO_DIR, 'processed', f"scene{s['id']}.wav"))
        i = int((s['start'] + s['voStart']) * SR)
        vo[i:i + len(a)] += a[:N - i]

# ---------- score ----------
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
BPM = 96; beat = 60 / BPM; bar = 4 * beat
# D minor colour: Dm9, Bbmaj7, Fmaj7/A, C(add9)
CH = [[50, 57, 60, 64, 65, 69], [46, 53, 57, 62, 65, 69], [45, 53, 57, 60, 64, 67], [48, 55, 60, 62, 64, 67]]
t = np.arange(N) / SR
def sect(x):
    """Intensity 0..1 per layer from the chapter structure."""
    ids = [s for s in order if s['start'] <= x]
    cur = ids[-1]['id'] if ids else '1'
    k = [s['id'] for s in order].index(cur)
    return k
idx_of = {s['id']: i for i, s in enumerate(order)}
def tstart(i): return scenes[i]['start']
# layer envelopes (piecewise, seconds)
def env(points):
    xs, ys = zip(*points); return np.interp(t, xs, ys)
pad_env = env([(0, .35), (tstart('2') - 1.5, .35), (tstart('2'), 1), (tstart('C6'), 1), (T - 3, .8), (T, 0)])
sub_env = env([(0, 0), (tstart('2'), 0), (tstart('2') + .2, .9), (tstart('C6'), .9), (tstart('C6') + 1, .5), (T - 2, .5), (T, 0)])
arp_env = env([(0, 0), (tstart('C3') - .5, 0), (tstart('C3') + 1.5, .9), (tstart('C6') - .5, .9), (tstart('C6') + 1, .0), (tstart('28'), 0), (tstart('28') + 2, .5), (T - 4, .5), (T - 2, 0)])
hat_env = env([(0, 0), (tstart('C4'), 0), (tstart('C4') + 1, .8), (tstart('C6') - .5, .8), (tstart('C6'), 0), (T, 0)])
pulse_env = env([(0, 0), (tstart('C2'), 0), (tstart('C2') + .5, .8), (tstart('C6'), .8), (tstart('C6') + 1, 0), (T, 0)])

chord_len = 2 * bar
ci = (t // chord_len).astype(int) % 4
music = np.zeros((N, 2))
# pad: detuned additive saws per chord tone, crossfaded between chords
for c in range(4):
    on = (ci == c).astype(float)
    k = int(0.35 * SR); w = np.convolve(on, np.ones(k) / k, mode='same')  # soft chord transitions
    sigL = np.zeros(N); sigR = np.zeros(N)
    for m in CH[c]:
        f = mtof(m + 12 if m < 52 else m)
        for det, side in ((-0.11, 0), (0.0, 2), (0.12, 1)):
            ff = f * 2 ** (det / 12)
            ph = rng.uniform(0, 2 * np.pi)
            x = sum(np.sin(2 * np.pi * ff * h * t + ph * h) / h ** 1.6 for h in range(1, 6))
            if side in (0, 2): sigL += x
            if side in (1, 2): sigR += x
    music[:, 0] += sigL * w; music[:, 1] += sigR * w
# gentle movement: slow low-pass via moving average plus tremolo
def smooth(x, n):
    return np.convolve(x, np.ones(n) / n, mode='same')
for ch in range(2): music[:, ch] = smooth(music[:, ch], 9)
music *= (0.82 + 0.18 * np.sin(2 * np.pi * t / 7.0))[:, None]
music *= pad_env[:, None] * 0.010

# sub bass on chord roots
roots = np.array([mtof(CH[c][0] - 12) for c in range(4)])[ci]
phase = 2 * np.pi * np.cumsum(roots) / SR
barpos = (t % bar) / bar
sub = np.sin(phase) * (0.6 + 0.4 * np.exp(-barpos * 4))
music += (sub * sub_env * 0.07)[:, None]

# pluck arpeggio, eighth notes
step = beat / 2
arp = np.zeros((N, 2))
pattern = [2, 3, 4, 5, 4, 3, 2, 4]
n_steps = int(T / step)
L = int(0.9 * SR); tt = np.arange(L) / SR
for k in range(n_steps):
    t0 = k * step; i0 = int(t0 * SR)
    a = arp_env[min(i0, N - 1)]
    if a <= 0.01: continue
    c = int(t0 // chord_len) % 4
    m = CH[c][pattern[k % 8] % len(CH[c])] + 12
    f = mtof(m)
    note = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt) + 0.08 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt / 0.28)
    note *= np.minimum(1, tt / 0.004)
    vel = 0.75 + 0.25 * ((k % 4) == 0)
    pan = 0.5 + 0.35 * np.sin(k * 0.9)
    j = min(N, i0 + L) - i0
    arp[i0:i0 + j, 0] += note[:j] * a * vel * (1 - pan)
    arp[i0:i0 + j, 1] += note[:j] * a * vel * pan
music += arp * 0.05

# soft pulse (beats 1 and 3) and off-beat hats
L = int(0.35 * SR); tt = np.arange(L) / SR
kick = np.sin(2 * np.pi * (45 * tt + 60 * 0.06 * (1 - np.exp(-tt / 0.06)))) * np.exp(-tt / 0.12)
hatL = int(0.06 * SR); hat = rng.standard_normal(hatL) * np.exp(-np.arange(hatL) / SR / 0.012)
hat = hat - smooth(hat, 6)  # crude high-pass
for b in range(int(T / beat)):
    i0 = int(b * beat * SR)
    if i0 >= N: break
    if b % 2 == 0 and pulse_env[i0] > 0.01:
        j = min(N, i0 + L) - i0; music[i0:i0 + j] += (kick[:j] * pulse_env[i0] * 0.10)[:, None]
    ih = int((b + 0.5) * beat * SR)
    if ih < N and hat_env[ih] > 0.01:
        j = min(N, ih + hatL) - ih; music[ih:ih + j, 0] += hat[:j] * hat_env[ih] * 0.012; music[ih:ih + j, 1] += hat[:j] * hat_env[ih] * 0.009

# simple stereo reverb (FFT convolution with decaying noise IR), applied to the music bus
def reverb(x, secs=2.4, mix=0.28):
    L = int(secs * SR)
    ir = rng.standard_normal((L, 2)) * np.exp(-np.arange(L) / SR / (secs / 6.9))[:, None]
    ir = ir - np.array([smooth(ir[:, c], 4) for c in range(2)]).T * 0.6
    ir /= np.sqrt((ir ** 2).sum(0))
    out = np.zeros_like(x); B = 1 << 17; nfft = 1 << int(np.ceil(np.log2(B + L)))
    IR = np.fft.rfft(ir, nfft, axis=0)
    for s0 in range(0, len(x), B):
        seg = x[s0:s0 + B]; Y = np.fft.irfft(np.fft.rfft(seg, nfft, axis=0) * IR, nfft, axis=0)
        e = min(len(x), s0 + nfft) - s0; out[s0:s0 + e] += Y[:e]
    return x * (1 - mix) + out * mix * 1.6
music = reverb(music)

# ---------- sound design ----------
sfx = np.zeros((N, 2))
def place(sig, at, gain):
    i0 = int(at * SR)
    if i0 < 0 or i0 >= N: return
    j = min(N, i0 + len(sig)) - i0
    sfx[i0:i0 + j] += sig[:j] * gain
def whoosh(d=0.55):
    L = int(d * SR); x = np.arange(L) / L
    n = rng.standard_normal((L, 2))
    out = np.zeros((L, 2))
    for c in range(2):  # sweeping band-pass approximated by two moving averages of varying width
        lp1 = smooth(n[:, c], 3); lp2 = smooth(n[:, c], 24)
        out[:, c] = (lp1 - lp2) * (0.3 + 0.7 * x) + lp2 * (1 - x)
    e = np.sin(np.pi * x) ** 2 * np.exp(-x * 1.2)
    return out * e[:, None]
def boom(d=1.6):
    L = int(d * SR); tt = np.arange(L) / SR
    x = np.sin(2 * np.pi * (38 * tt + 40 * 0.1 * (1 - np.exp(-tt / 0.1)))) * np.exp(-tt / 0.45)
    return np.stack([x, x], 1)
def tick():
    L = int(0.03 * SR); tt = np.arange(L) / SR
    x = np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt / 0.004)
    return np.stack([x, x], 1)
def click():
    L = int(0.05 * SR); tt = np.arange(L) / SR
    x = (np.sin(2 * np.pi * 1600 * tt) * 0.6 + rng.standard_normal(L) * 0.4) * np.exp(-tt / 0.006)
    return np.stack([x, x], 1)
def riser(d=1.6):
    L = int(d * SR); x = np.arange(L) / L
    n = rng.standard_normal((L, 2)); out = np.zeros((L, 2))
    for c in range(2): out[:, c] = n[:, c] - smooth(n[:, c], 8)
    return out * (x ** 2.2)[:, None]

for s in order[1:]:
    place(whoosh(), s['start'] - 0.28, 0.05 if s.get('kind') != 'chapter' else 0.07)
    if s.get('kind') == 'chapter': place(boom(), s['start'] + 0.02, 0.22)
place(riser(1.8), tstart('2') - 1.8, 0.02); place(boom(2.0), tstart('2'), 0.32)
s7 = scenes['7']; place(click(), s7['start'] + s7['phrases'][4]['s'] + 0.05, 0.35)
# number ticks on count-ups (scene 17 values, scene 20 ring), spacing grows as the count eases out
def ticks(at, dur, gain=0.05):
    k = 0.0
    while k < dur:
        place(tick(), at + k, gain * (1 - 0.6 * k / dur)); k += 0.045 + 0.12 * (k / dur) ** 2
s17 = scenes['17']; P = lambda s, i: s['phrases'][i]['s']
ticks(s17['start'] + P(s17, 2) - 0.2, 1.3); ticks(s17['start'] + P(s17, 3) - 0.1, 1.3); ticks(s17['start'] + P(s17, 4) - 0.1, 1.2)
s20 = scenes['20']; ticks(s20['start'] + P(s20, 0) + 0.3, 1.8)
s18 = scenes['18']; ticks(s18['start'] + P(s18, 1) - 0.4, 1.4, 0.04)

# ---------- ducking + mix ----------
envv = np.abs(vo)
att, rel = int(0.03 * SR), int(0.45 * SR)
fast = smooth(envv, att)
# release: running max over a trailing window, then smooth
w = rel
# trailing-window max via strided blocks
blk = 2400
coarse = np.array([fast[i:i + blk].max() for i in range(0, N, blk)])
coarse_hold = np.maximum.reduce([np.roll(coarse, k) for k in range(0, 9)])
coarse_hold[:9] = np.maximum.accumulate(coarse[:9])
level = np.repeat(coarse_hold, blk)[:N]
level = smooth(level, int(0.12 * SR))
active = np.clip(level / 0.02, 0, 1)
duck_db = -11.0
gain = 10 ** (duck_db * active / 20)
mus = music * gain[:, None]
mix = mus + sfx + np.stack([vo, vo], 1) * 1.0
peak = np.abs(mix).max()
print('peak before norm', round(float(peak), 3))
mix = mix / max(peak, 1e-9) * 0.89
# write float WAV via ffmpeg
raw = mix.astype(np.float32).tobytes()
subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', OUT], input=raw, check=True)
# stems for checking
for name, x in (('music', mus), ('sfx', sfx)):
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', OUT.replace('.wav', f'_{name}.wav')],
                   input=(x / max(np.abs(x).max(), 1e-9) * 0.9).astype(np.float32).tobytes(), check=True)
print('wrote', OUT, round(T, 2), 's')
