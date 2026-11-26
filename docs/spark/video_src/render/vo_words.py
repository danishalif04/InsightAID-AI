import sys, os, json, subprocess
S, OUTF = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(S, 'avlib'))
import numpy as np
from faster_whisper import WhisperModel
FF = os.path.join(S, 'avlib', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
m = WhisperModel('small', device='cpu', compute_type='int8', download_root=os.path.join(S, 'whisper_models'))
out = {}
for key, path in json.loads(sys.argv[3]).items():
    segs, info = m.transcribe(load(path), language='en', word_timestamps=True, beam_size=5, vad_filter=False)
    words = [{'w': w.word.strip(), 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in (s.words or [])]
    out[key] = {'duration': round(info.duration, 2), 'words': words}
    print(key, ' '.join(w['w'] for w in words), flush=True)
json.dump(out, open(OUTF, 'w', encoding='utf-8'), indent=1)
