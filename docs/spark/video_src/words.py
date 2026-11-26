import sys, os, json, subprocess
S, RAW = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(S, 'avlib'))
import numpy as np
from faster_whisper import WhisperModel
FF = os.path.join(S, 'avlib', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
m = WhisperModel('medium', device='cpu', compute_type='int8', download_root=os.path.join(S, 'whisper_models'))
out = {}
for name in sys.argv[3:]:
    segs, info = m.transcribe(load(os.path.join(RAW, name)), language='en', word_timestamps=True, beam_size=5)
    words = [{'w': w.word, 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in (s.words or [])]
    out[name] = {'duration': round(info.duration, 2), 'words': words}
    print(name, '|', ' '.join(f"{w['w'].strip()}[{w['s']}-{w['e']}]" for w in words), flush=True)
json.dump(out, open(os.path.join(S, 'vo', 'words.json'), 'w', encoding='utf-8'), indent=1)
