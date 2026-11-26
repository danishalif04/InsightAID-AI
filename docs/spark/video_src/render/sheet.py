import sys, os, glob
sys.path.insert(0, sys.argv[1])
from PIL import Image
src, out = sys.argv[2], sys.argv[3]
fs = sorted(glob.glob(os.path.join(src, '*.jpg')))
for k in range(0, len(fs), 6):
    W = Image.new('RGB', (1920, 1620))
    for i, f in enumerate(fs[k:k+6]):
        W.paste(Image.open(f).resize((960, 540)), ((i % 2) * 960, (i // 2) * 540))
    W.save(f'{out}_{k//6}.jpg', quality=88)
print((len(fs)+5)//6)
