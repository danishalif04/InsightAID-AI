"""Remove the green-screen background from the portrait for the poster.

    python poster/build/key_photo.py

Chroma key on "how much greener than red/blue" a pixel is, with a soft edge,
then green spill suppression so the hair and suit edges don't glow green.
Writes poster/assets/danish.png (transparent, cropped to the subject).
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = 'poster/assets/danish-source.jpg'
OUT = 'poster/assets/danish.png'

im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
r, g, b = im[..., 0], im[..., 1], im[..., 2]

# Green dominance: positive where the pixel is screen-green.
dom = g - np.maximum(r, b)
# Fully background above HI, fully subject below LO, soft in between.
LO, HI = 18, 60
alpha = 1 - np.clip((dom - LO) / (HI - LO), 0, 1)

# Keep only the largest subject piece, fill holes inside it (e.g. dark suit areas are fine,
# but this also protects any green-tinted reflections inside the glasses).
solid = alpha > 0.5
lab, n = ndimage.label(solid)
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
main = lab == (1 + int(np.argmax(sizes)))
main = ndimage.binary_fill_holes(main)
alpha = np.where(main, np.maximum(alpha, 0.0), 0) if False else alpha * ndimage.binary_dilation(main, iterations=3)
alpha = np.where(ndimage.binary_erosion(main, iterations=4), 1.0, alpha)

# Slight blur on the matte for a natural edge.
alpha = ndimage.gaussian_filter(alpha, 0.8)

# Spill suppression: clamp green to the max of red and blue where it exceeds them.
limit = np.maximum(r, b)
g2 = np.where(g > limit, limit + (g - limit) * 0.15, g)
out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)

ys, xs = np.where(alpha > 0.1)
pad = 10
crop = out[max(0, ys.min() - pad):ys.max() + 1, max(0, xs.min() - pad):xs.max() + pad]
Image.fromarray(crop).save(OUT, optimize=True)
print('wrote', OUT, crop.shape[1], 'x', crop.shape[0])
