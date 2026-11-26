import json, re, difflib
md = open(r'C:\Users\User\FYP\insightaid-ai\docs\spark\VOICEOVER_SCRIPT.md', encoding='utf-8').read()
sc = {m.group(1): m.group(2).replace('/', ' ') for m in re.finditer(r'### Scene (\d+)[^\n]*\n(?:\*[^\n]*\n)?> ([^\n]+)', md)}
tok = lambda s: re.sub(r"[^a-z0-9' ]", ' ', s.lower().replace('-', ' ')).split()
a = json.load(open('vo_words.json', encoding='utf-8')); b = json.load(open('vo_words_v2.json', encoding='utf-8'))
ta = tb = 0
for k in sorted(a, key=int):
    r = lambda d: difflib.SequenceMatcher(a=tok(sc[k]), b=tok(' '.join(w['w'] for w in d[k]['words']))).ratio()
    ra, rb = r(a), r(b); ta += ra; tb += rb
    print(f'{k:>3} before {ra:.2f} after {rb:.2f}', '  <-- worse' if rb < ra - 0.03 else '')
print('mean', round(ta / len(a), 3), round(tb / len(b), 3))
