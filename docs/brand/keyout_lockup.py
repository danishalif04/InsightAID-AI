"""Key the INSIGHTAID AI lockup off its painted checkerboard.

    python docs/brand/keyout_lockup.py

Writes two transparent PNGs from docs/brand/insightaid-lockup-source.jpg:
    src/assets/insightaid-lockup.png   glyph + wordmark (login hero)
    src/assets/insightaid-mark.png     glyph only        (small mark, top-left)

WHY THIS IS NOT THE SAME KEY AS keyout_mark.py
----------------------------------------------
That script treated a pixel as background if it was unsaturated AND sat at one
of the checker's two grey levels. Here the 3D letters cast soft shadows onto
the checker, darkening the light squares to anywhere between ~40 and ~125 -
the very band that rule keeps as "subject". It would leave a grey halo under
every letter.

So this script uses the checker's GRID instead. The board is 50 x 50 squares
of 40.96 px starting at the corner (measured), so for every pixel we know
whether its square should be light or dark, and judge it against THAT:

    light square: unsaturated and anywhere up to the light level -> background,
                  however dark a shadow has made it
    dark square:  unsaturated and near black                     -> background

A grey subject pixel sitting on a dark square is still kept, because it is
brighter than that square can ever be.
"""
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage

SRC = 'docs/brand/insightaid-lockup-source.jpg'
SQUARE = 2048 / 50          # 40.96 px, measured from the edge spacing
SPREAD_MAX = 9              # checker pixels are greyscale; JPEG adds a little colour
LIGHT_MAX = 150             # light squares measure ~125-140 before any shadow
DARK_MAX = 46               # dark squares measure ~5
EDGE_BAND = 2.5             # px either side of a square boundary, where JPEG blurs the two


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    h, w = a.shape[:2]
    lum = a.mean(axis=2)
    spread = a.max(axis=2) - a.min(axis=2)
    grey = spread < SPREAD_MAX

    yy, xx = np.mgrid[0:h, 0:w]
    gx, gy = xx / SQUARE, yy / SQUARE
    parity = (np.floor(gx) + np.floor(gy)) % 2

    # Which parity is the light one? Ask the empty top-left corner.
    corner_light = lum[5:35, 5:35].mean() > 60
    is_light = (parity == 0) if corner_light else (parity == 1)

    near_edge = (np.minimum(gx % 1, 1 - gx % 1) * SQUARE < EDGE_BAND) | (np.minimum(gy % 1, 1 - gy % 1) * SQUARE < EDGE_BAND)

    background = grey & (
        (is_light & (lum < LIGHT_MAX))
        | (~is_light & (lum < DARK_MAX))
        # On a boundary the two squares are blurred together, so either level
        # (and anything between) is still just checker.
        | (near_edge & (lum < LIGHT_MAX))
    )

    subject = ~background
    subject = ndimage.binary_opening(subject, np.ones((3, 3)))

    # Keep only real pieces of the logo. Each letter is its own component, so
    # the cut is by size: the smallest letter part is far above this, stray
    # checker specks far below it.
    lab, n = ndimage.label(subject)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    subject = np.isin(lab, 1 + np.flatnonzero(sizes >= 600))

    # Close pinholes inside letters and the gem without bridging letters.
    subject = ndimage.binary_closing(subject, np.ones((3, 3)))
    holes = ndimage.binary_fill_holes(subject) & ~subject
    hl, hn = ndimage.label(holes)
    if hn:
        hs = ndimage.sum(np.ones_like(hl), hl, range(1, hn + 1))
        subject |= np.isin(hl, 1 + np.flatnonzero(hs < 400))

    # The glyph's disc is SOLID in this artwork, but its top edge is shadowed
    # almost to black and grey - indistinguishable from a dark checker square -
    # so it keys out as a hole. Every hole inside the glyph (the largest piece)
    # is therefore filled. Only the glyph: the letters' counters, inside "A"
    # and "D", are real openings and must stay transparent.
    lab2, _ = ndimage.label(subject)
    sizes2 = ndimage.sum(np.ones_like(lab2), lab2, range(1, lab2.max() + 1))
    glyph_piece = lab2 == (1 + int(np.argmax(sizes2)))
    subject |= ndimage.binary_fill_holes(glyph_piece)

    alpha = np.clip((ndimage.gaussian_filter(subject.astype(float), 1.0) - 0.4) / 0.25, 0, 1)

    # Un-premultiply the silhouette: edge pixels are JPEG-blended with the
    # checker, which would leave a grey rim on a light page.
    edge = (alpha > 0.02) & (alpha < 0.98)
    for c in range(3):
        filled = ndimage.grey_dilation(np.where(subject, a[:, :, c], 0), size=5)
        a[:, :, c] = np.where(edge & (filled > 0), filled, a[:, :, c])

    rgba = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
    ys, xs = np.where(alpha > 0.3)
    print('lockup bbox x %d-%d y %d-%d' % (xs.min(), xs.max(), ys.min(), ys.max()))

    # Full lockup, tight crop with a small margin.
    pad = 16
    lock = Image.fromarray(rgba[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad])
    # 2x the widest it is ever shown (460 px), so it is sharp on high-DPI screens
    # without shipping a 1400 px image to a login page.
    lock = lock.resize((920, round(lock.height * 920 / lock.width)), Image.LANCZOS)
    lock.save('src/assets/insightaid-lockup.png', optimize=True)
    print('wrote src/assets/insightaid-lockup.png', lock.size)

    # Glyph only: the largest component lies left of the wordmark's first letter.
    lab3, _ = ndimage.label(alpha > 0.3)
    sizes3 = ndimage.sum(np.ones_like(lab3), lab3, range(1, lab3.max() + 1))
    glyph = lab3 == (1 + int(np.argmax(sizes3)))
    gy0, gx0 = np.where(glyph)
    y0, y1, x0, x1 = gy0.min(), gy0.max(), gx0.min(), gx0.max()
    side = int(max(y1 - y0, x1 - x0) * 1.06)
    cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
    g_alpha = np.where(ndimage.binary_dilation(glyph, np.ones((5, 5))), alpha, 0)
    g_rgba = np.dstack([rgba[:, :, :3], (g_alpha * 255).astype(np.uint8)])
    Y0, X0 = max(0, cy - side // 2), max(0, cx - side // 2)
    mark = Image.fromarray(g_rgba[Y0:Y0 + side, X0:X0 + side]).resize((160, 160), Image.LANCZOS)  # shown at 40 px; 4x covers high-DPI
    r, g, b, al = mark.split()
    mark = Image.merge('RGBA', (r, g, b, al.filter(ImageFilter.GaussianBlur(0.4))))
    mark.save('src/assets/insightaid-mark.png', optimize=True)
    print('wrote src/assets/insightaid-mark.png', mark.size)


if __name__ == '__main__':
    main()
