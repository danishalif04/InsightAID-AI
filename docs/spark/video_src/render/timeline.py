# Builds the video timeline: scene order and lengths from the cleaned voice-over,
# phrase timings (script text aligned to Whisper word times) and the captions (.srt).
# Caption TEXT is always the script; only the timing comes from the recording.
import sys, re, json, difflib

SCRIPT, WORDS, OUT, SRT = sys.argv[1:5]
md = open(SCRIPT, encoding='utf-8').read()
script = {}
for m in re.finditer(r'### Scene (\d+)[^\n]*\n(?:\*[^\n]*\n)?> ([^\n]+)', md):
    script[m.group(1)] = [p.strip() for p in m.group(2).split('/') if p.strip()]
words = json.load(open(WORDS, encoding='utf-8'))

def toks(s):
    s = s.lower().replace('-', ' ').replace('’', "'").replace('“', '').replace('”', '')
    return [t for t in (re.sub(r"[^a-z0-9'一-鿿]", '', w) for w in s.split()) if t]

def align(key):
    phrases = script[key]
    ptoks = [toks(p) for p in phrases]
    stoks = [t for p in ptoks for t in p]
    ww = [w for w in words[key]['words'] if toks(w['w'])]
    wtoks = [toks(w['w'])[0] for w in ww]
    sm = difflib.SequenceMatcher(a=stoks, b=wtoks, autojunk=False)
    anchor = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            anchor[a + k] = (ww[b + k]['s'], ww[b + k]['e'])
    idx = sorted(anchor)
    first_s = ww[0]['s'] if ww else 0.0
    last_e = ww[-1]['e'] if ww else words[key]['duration']
    def t_at(i, which):
        if i in anchor: return anchor[i][0 if which == 's' else 1]
        prev = [j for j in idx if j < i]; nxt = [j for j in idx if j > i]
        p = (prev[-1], anchor[prev[-1]][1]) if prev else (-1, first_s)
        n = (nxt[0], anchor[nxt[0]][0]) if nxt else (len(stoks), last_e)
        return p[1] + (n[1] - p[1]) * (i - p[0]) / (n[0] - p[0])
    out, i = [], 0
    for p, pt in zip(phrases, ptoks):
        out.append({'text': p, 's': round(t_at(i, 's'), 2), 'e': round(t_at(i + len(pt) - 1, 'e'), 2)})
        i += len(pt)
    return out, first_s, last_e

LEAD, TAIL, CHAPTER = 0.35, 0.5, 1.9
chapters = {'C2': ('02', 'Problem'), 'C3': ('03', 'Solution'), 'C4': ('04', 'Impacts'),
            'C5': ('05', 'Commercialisation potential'), 'C6': ('06', 'Copyright')}
order = ['1', '2', 'C2', '3', '4', '5', '6', 'C3'] + [str(i) for i in range(7, 17)] + ['C4'] + \
        [str(i) for i in range(17, 22)] + ['C5'] + [str(i) for i in range(22, 26)] + ['C6', '27', '28', '29', '30']

scenes, t = [], 0.0
for sid in order:
    sc = {'id': sid, 'start': round(t, 3)}
    if sid in chapters:
        sc.update(kind='chapter', num=chapters[sid][0], name=chapters[sid][1], dur=CHAPTER)
    elif sid == '2':
        sc.update(kind='title', dur=5.6)
    elif sid == '30':
        sc.update(kind='outro', dur=4.5)
    elif sid == '1':
        ph, fs, le = align('1')
        sc.update(kind='face', dur=round(words['1']['duration'], 2), voStart=0.0, phrases=ph)
    else:
        ph, fs, le = align(sid)
        vo_dur = words[sid]['duration']
        lead = max(0.0, LEAD - fs)            # recordings already carry some leading silence
        extra = 3.2 if sid == '29' else 0.0   # hold the end card
        dur = lead + max(le + TAIL, vo_dur - 0.25) + extra
        sc.update(kind='vo', dur=round(dur, 3), voStart=round(lead, 3), voDur=vo_dur,
                  phrases=[{**p, 's': round(p['s'] + lead, 2), 'e': round(p['e'] + lead, 2)} for p in ph])
    t += sc['dur']
    scenes.append(sc)

# Captions: merge short phrases into readable cues (max ~52 chars), absolute times.
cues = []
for sc in scenes:
    ph = sc.get('phrases')
    if not ph: continue
    groups, cur = [], []
    for p in ph:
        if cur and len(' '.join(x['text'] for x in cur + [p])) > 52:
            groups.append(cur); cur = []
        cur.append(p)
    if cur: groups.append(cur)
    for g in groups:
        cues.append({'s': round(max(0.0, sc['start'] + g[0]['s'] - 0.08), 2), 'e': round(sc['start'] + g[-1]['e'] + 0.35, 2),
                     'text': ' '.join(x['text'] for x in g).replace('“', '"').replace('”', '"')})
for a, b in zip(cues, cues[1:]):
    if a['e'] > b['s'] - 0.04: a['e'] = round(b['s'] - 0.04, 2)

total = round(t, 2)
json.dump({'total': total, 'fps': 30, 'scenes': scenes, 'cues': cues}, open(OUT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
with open(SRT, 'w', encoding='utf-8') as f:
    for i, c in enumerate(cues, 1):
        f.write(f"{i}\n{ts(c['s'])} --> {ts(c['e'])}\n{c['text']}\n\n")
print('total', total, 's =', f'{int(total // 60)}:{total % 60:04.1f}', '| scenes', len(scenes), '| cues', len(cues))
