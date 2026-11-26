import sys, os, json, glob, re
S = sys.argv[1]
RAW = sys.argv[2]
sys.path.insert(0, os.path.join(S, 'avlib'))
from faster_whisper import WhisperModel
import subprocess, numpy as np
FF = os.path.join(S, 'avlib', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0

prompt = ("INSIGHTAID AI, Muhammad Danish Alif Bin Azrul, Universiti Teknologi PETRONAS, koperasi, "
          "Koperasi Siswa Maju, nasi lemak, karipap, basi, Bahasa Melayu, Mandarin, ringgit, AIMIX IID, Prep and Stock Planner.")
model = WhisperModel(os.environ.get('WMODEL','small'), device='cpu', compute_type='int8', download_root=os.path.join(S, 'whisper_models'))

files = [f for f in sorted(glob.glob(os.path.join(RAW, '*.m4a')) + glob.glob(os.path.join(RAW, '*.mp4')),
               key=lambda p: int(re.findall(r'\d+', os.path.basename(p))[0]) if os.path.basename(p).startswith('scene') else 0) if not os.environ.get('ONLY') or os.path.basename(f) in os.environ['ONLY'].split(',')]
out = {}
for f in files:
    segs, info = model.transcribe(load(f), language='en', initial_prompt=(prompt if not os.environ.get('NOPROMPT') else None), beam_size=5, word_timestamps=True, vad_filter=False)
    segs = list(segs)
    words = [w for s in segs for w in (s.words or [])]
    out[os.path.basename(f)] = {
        'text': ' '.join(s.text.strip() for s in segs),
        'speech_start': round(words[0].start, 2) if words else None,
        'speech_end': round(words[-1].end, 2) if words else None,
        'duration': round(info.duration, 2),
    }
    print(os.path.basename(f), '|', out[os.path.basename(f)]['text'], flush=True)
json.dump(out, open(os.path.join(S, 'vo', 'transcripts_'+os.environ.get('WMODEL','small')+'.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
