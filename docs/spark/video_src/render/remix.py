# Re-balance the stems (voice-over + ducked music stem + sfx stem) without re-synthesising the score.
import sys, os, json, subprocess
import numpy as np
S, VIDEO_DIR, OUT, MUS_DB, SFX_DB = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5])
FF = os.path.join(S, 'avlib', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
TL = json.load(open(os.path.join(S, 'render', 'timeline.json'), encoding='utf-8'))
SR = 48000
def decode(path, filt=None, ch=1):
    cmd = [FF, '-v', 'error', '-i', path, '-vn', '-ac', str(ch), '-ar', str(SR)]
    if filt: cmd += ['-af', filt]
    raw = subprocess.run(cmd + ['-f', 'f32le', '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.float32).astype(np.float64)
    return a.reshape(-1, ch) if ch > 1 else a
mus = decode(os.path.join(S, 'render', 'mix_music.wav'), ch=2)
sfx = decode(os.path.join(S, 'render', 'mix_sfx.wav'), ch=2)
N = len(mus)
vo = np.zeros(N)
VOD = sys.argv[6] if len(sys.argv) > 6 else 'processed'
face = decode(os.path.join(VIDEO_DIR, VOD, 'face.wav')) if VOD != 'processed' else decode(os.path.join(VIDEO_DIR, 'raw', 'WhatsApp Video 2026-11-26 at 16.58.40.mp4'), 'highpass=f=80,afftdn=nf=-30:tn=1,loudnorm=I=-16:TP=-1.5:LRA=11')
vo[:len(face)] += face[:N]
for s in TL['scenes']:
    if s.get('kind') == 'vo':
        a = decode(os.path.join(VIDEO_DIR, VOD, f"scene{s['id']}.wav"))
        i = int((s['start'] + s['voStart']) * SR); vo[i:i + len(a)] += a[:N - i]
mix = mus * 10 ** (MUS_DB / 20) + sfx * 10 ** (SFX_DB / 20) + np.stack([vo, vo], 1)
print('peak', round(float(np.abs(mix).max()), 3))
subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', OUT], input=mix.astype(np.float32).tobytes(), check=True)
