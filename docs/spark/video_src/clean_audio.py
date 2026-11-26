"""Clean every voice-over take: low-cut, adaptive denoise, trim to speech
(+0.25 s padding, using Whisper word timestamps), loudness -16 LUFS.
Reports the noise floor before and after. Originals are never modified."""
import sys, os, json, re, subprocess
S, RAW, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FF = os.path.join(S, 'avlib', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe')
tr = json.load(open(os.path.join(S, 'vo', 'transcripts_small.json'), encoding='utf-8'))
os.makedirs(OUT, exist_ok=True)

def noise_floor(path, extra=''):
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', path, '-af', (extra + ',' if extra else '') + 'astats=measure_overall=Noise_floor+RMS_level:measure_perchannel=none', '-f', 'null', '-'],
                       capture_output=True, text=True)
    nf = re.findall(r'Noise floor dB: (-?[\d.inf]+)', r.stderr)
    rms = re.findall(r'RMS level dB: (-?[\d.inf]+)', r.stderr)
    return (nf[-1] if nf else '?'), (rms[-1] if rms else '?')

PAD = 0.25
rows = []
for name, t in tr.items():
    if not name.endswith('.m4a'):
        continue
    src = os.path.join(RAW, name)
    start = max(0.0, (t['speech_start'] or 0) - PAD)
    end = min(t['duration'], (t['speech_end'] or t['duration']) + PAD)
    dst = os.path.join(OUT, name.replace('.m4a', '.wav'))
    chain = ('highpass=f=80,afftdn=nf=-30:tn=1,'
             'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000')
    subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{start:.2f}', '-to', f'{end:.2f}', '-i', src,
                    '-af', chain, '-ac', '1', '-c:a', 'pcm_s16le', dst], check=True)
    before = noise_floor(src)
    after = noise_floor(dst)
    rows.append((name, round(end - start, 2), before[0], after[0]))
    print(f'{name:12} {end-start:5.2f}s  noise floor {before[0]:>7} dB -> {after[0]:>7} dB', flush=True)
json.dump(rows, open(os.path.join(S, 'vo', 'clean_report.json'), 'w'), indent=1)
