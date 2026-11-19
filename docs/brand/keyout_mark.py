"""Key the glyph off the painted checkerboard and write a real RGBA PNG.

The source is a JPEG, so its checkerboard is painted pixels, not transparency.
It keys cleanly because it is pure greyscale in exactly two levels, measured:

    checker dark   luminance ~5     channel spread ~0.6
    checker light  luminance ~155   channel spread ~0.9
    gem, sphere    spread 43-58
    ring (lit)     spread 29

The one trap is the ring's shaded lower-left, rgb(92,91,89): spread 3.5, so a
saturation cut alone removes it and breaks the ring. Its luminance is 91 -
squarely BETWEEN the checker's two levels - so requiring a background pixel to
be both unsaturated AND at one of those two levels keeps it.
"""
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage

SRC = 'docs/brand/Gemini_Generated_Image_o6qs34o6qs34o6qs.jpg'
OUT = 'src/assets/insightaid-mark.png'
SIDE = 512


def main():
    im = Image.open(SRC).convert('RGB')
    a = np.asarray(im).astype(float)
    h, w = a.shape[:2]

    lum = a.mean(axis=2)
    spread = a.max(axis=2) - a.min(axis=2)

    # Background: unsaturated AND sitting at one of the checker's two levels.
    background = (spread < 8) & ((lum < 32) | ((lum > 132) & (lum < 178)))

    # JPEG ringing throws coloured fringes a pixel or two into the checker
    # along every edge. Closing the background reclaims them without eating
    # into the mark itself.
    background = ndimage.binary_closing(background, np.ones((3, 3)))
    subject = ~background

    # Fill only SMALL holes - a stray mid-grey patch inside the ring's body.
    # The ring's open centre is orders of magnitude larger, so it survives and
    # stays transparent, which is the whole point of the shape.
    holes = ndimage.binary_fill_holes(subject) & ~subject
    lab, n = ndimage.label(holes)
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        small = np.isin(lab, 1 + np.flatnonzero(sizes < h * w * 0.0015))
        subject = subject | small

    subject = ndimage.binary_opening(subject, np.ones((3, 3)))

    # Drop specks left by compression noise in the flat checker squares.
    lab2, n2 = ndimage.label(subject)
    if n2:
        s2 = ndimage.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
        subject = np.isin(lab2, 1 + np.flatnonzero(s2 >= h * w * 0.0004))

    print('subject coverage %.1f%%' % (subject.mean() * 100))

    alpha = np.clip((ndimage.gaussian_filter(subject.astype(float), 1.1) - 0.4) / 0.25, 0, 1)

    # Un-premultiply the edge: pixels on the silhouette are JPEG-blended with
    # the checker behind them, so without this the mark carries a grey rim on
    # a light page and a bright rim on a dark one.
    edge = (alpha > 0.05) & (alpha < 0.95)
    if edge.any():
        inner = ndimage.grey_dilation(np.where(subject, lum, 0), size=5)
        for c in range(3):
            ch = a[:, :, c]
            filled = ndimage.grey_dilation(np.where(subject, ch, 0), size=5)
            a[:, :, c] = np.where(edge & (inner > 0), filled, ch)

    ys, xs = np.where(alpha > 0.4)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    half = int(max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 * 1.07)
    print('bbox x %d-%d y %d-%d' % (xs.min(), xs.max(), ys.min(), ys.max()))

    rgba = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
    y0, y1, x0, x1 = int(cy - half), int(cy + half), int(cx - half), int(cx + half)
    pad = ((max(0, -y0), max(0, y1 - h)), (max(0, -x0), max(0, x1 - w)), (0, 0))
    rgba = np.pad(rgba, pad)
    y0 += pad[0][0]; y1 += pad[0][0]; x0 += pad[1][0]; x1 += pad[1][0]

    out = Image.fromarray(rgba[y0:y1, x0:x1]).resize((SIDE, SIDE), Image.LANCZOS)
    r, g, b, al = out.split()
    out = Image.merge('RGBA', (r, g, b, al.filter(ImageFilter.GaussianBlur(0.4))))
    out.save(OUT, optimize=True)
    print('wrote', OUT, out.size)


if __name__ == '__main__':
    main()
