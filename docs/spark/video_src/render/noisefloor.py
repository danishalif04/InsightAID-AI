import sys, os, glob, subprocess
import numpy as np
S, V = sys.argv[1], sys.argv[2]
FF = os.path.join(S, 'avlib', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
def load(p):
    raw = subprocess.run([FF, '-v', 'error', '-i', p, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)
def stats(x):
    f = x[:len(x)//2400*2400].reshape(-1, 2400); r = np.sqrt((f**2).mean(1)) + 1e-9; db = 20*np.log10(r)
    return np.percentile(db, 10), np.percentile(db, 90)
files = [('face', os.path.join(V, sys.argv[3] if len(sys.argv) > 3 else 'processed', 'face.wav'))] + sorted([(os.path.basename(p)[5:-4], p) for p in glob.glob(os.path.join(V, sys.argv[3] if len(sys.argv) > 3 else 'processed', 'scene*.wav'))], key=lambda a: int(a[0]))
for k, p in files:
    lo, hi = stats(load(p)); print(f'{k:>5} floor {lo:6.1f} dB  speech {hi:6.1f} dB  SNR {hi-lo:5.1f}')
