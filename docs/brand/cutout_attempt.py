"""Cut the InsightAid glyph out of its flat green background.

A plain colour key does not work here. The gem's dark base measures
rgb(19,90,72) and the mid-left background measures rgb(39,93,68) - close
enough that any tolerance wide enough to remove the background also eats the
bottom of the "i". Flood fill has the same problem: those two regions touch.

So the background is MODELLED instead. It is a smooth vignette, which a
low-order 2-D polynomial fits well, and the subject then stands out as a large
residual from that fitted surface regardless of how dark it is. The fit is
iterative: seeded from the border frame (which is all background), then refit
on everything the previous pass judged background, so the model follows the
gradient into the middle of the frame rather than extrapolating blindly.
"""
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage

SRC = 'docs/brand/Gemini_Generated_Image_c7012lc7012lc701.jpg'
OUT = 'src/assets/insightaid-mark.png'
SIDE = 640


def poly_design(h, w):
    """Degree-3 2-D polynomial basis, on normalised coordinates."""
    yy, xx = np.mgrid[0:h, 0:w]
    y = (yy / h * 2 - 1).ravel()
    x = (xx / w * 2 - 1).ravel()
    terms = [np.ones_like(x), x, y, x * x, x * y, y * y,
             x ** 3, x * x * y, x * y * y, y ** 3]
    return np.stack(terms, axis=1)


def fit_background(a, mask, A):
    """Least-squares fit of each channel over `mask`, evaluated everywhere."""
    m = mask.ravel()
    out = np.zeros_like(a)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A[m], a[:, :, c].ravel()[m], rcond=None)
        out[:, :, c] = (A @ coef).reshape(a.shape[:2])
    return out


def main():
    im = Image.open(SRC).convert('RGB')
    a = np.asarray(im).astype(float)
    h, w = a.shape[:2]
    A = poly_design(h, w)

    # Seed: the outer 6% frame is background everywhere in this artwork.
    mask = np.zeros((h, w), bool)
    b = int(min(h, w) * 0.06)
    mask[:b, :] = mask[-b:, :] = mask[:, :b] = mask[:, -b:] = True

    for _ in range(4):
        bg = fit_background(a, mask, A)
        resid = np.sqrt(((a - bg) ** 2).sum(axis=2))
        # Refit on everything close to the current model. The threshold is
        # deliberately loose so the fit keeps following the gradient rather
        # than locking onto the frame it started from.
        mask = resid < 18
        if mask.mean() < 0.15:          # fit collapsed; keep the last good one
            break

    bg = fit_background(a, mask, A)
    resid = np.sqrt(((a - bg) ** 2).sum(axis=2))

    # SIGNED residual, which is the whole trick. The subject sits BRIGHTER
    # than the fitted background in green and blue - the cream ring strongly
    # so, the gem's dark base still clearly so (rgb 19,90,72 against a local
    # background near 20,58,42). The drop shadow sits DARKER. Using the
    # unsigned distance keeps the shadow as ragged blobs and, once the
    # threshold is raised far enough to drop them, takes the bottom of the
    # "i" with it. Signing it separates the two cleanly.
    lift = ((a - bg)[:, :, 1] + (a - bg)[:, :, 2]) / 2.0

    # Thresholding `lift` alone is not enough. The sphere's shaded side and
    # the gem's dark facets sit as low as the background does, so any cut
    # that removes the background also punches holes in them.
    #
    # Background is therefore identified as CONNECTED REGIONS rather than by
    # brightness: a dim area belongs to the background only if it reaches the
    # border, or is one of the large open areas inside the ring. The gem's
    # dark facets are enclosed by brighter gem, so they are never reached and
    # stay part of the mark however dark they are.
    low = lift < 12
    lab, n = ndimage.label(low)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    border = border[border > 0]

    background = np.isin(lab, border)
    # The two lobes inside the ring never touch the border, so add any large
    # dim region back. 0.4% of the frame is far above any facet and far below
    # a lobe.
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    big = 1 + np.flatnonzero(sizes >= h * w * 0.004)
    background |= np.isin(lab, np.setdiff1d(big, border))

    subject = ~background
    subject = ndimage.binary_closing(subject, structure=np.ones((5, 5)))
    subject = ndimage.binary_opening(subject, structure=np.ones((3, 3)))

    # Drop specks left by JPEG noise in the flat background.
    lab2, n2 = ndimage.label(subject)
    if n2:
        sizes2 = ndimage.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
        subject = np.isin(lab2, 1 + np.flatnonzero(sizes2 >= h * w * 0.0005))

    # Anti-alias the silhouette; the hard mask alone would stair-step against
    # a light page.
    alpha = ndimage.gaussian_filter(subject.astype(float), 1.2)
    alpha = np.clip((alpha - 0.35) / 0.3, 0, 1)

    ys, xs = np.where(alpha > 0.4)
    print('subject bbox x %d-%d  y %d-%d  coverage %.1f%%'
          % (xs.min(), xs.max(), ys.min(), ys.max(), (alpha > 0.4).mean() * 100))

    # Square crop around the subject with even padding, then resize.
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    half = int(max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 * 1.08)
    y0, y1 = int(cy - half), int(cy + half)
    x0, x1 = int(cx - half), int(cx + half)

    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    pad = ((max(0, -y0), max(0, y1 - h)), (max(0, -x0), max(0, x1 - w)), (0, 0))
    rgba = np.pad(rgba, pad)
    y0 += pad[0][0]; y1 += pad[0][0]; x0 += pad[1][0]; x1 += pad[1][0]

    out = Image.fromarray(rgba[y0:y1, x0:x1]).resize((SIDE, SIDE), Image.LANCZOS)

    # Feather by a hair so the edge does not alias against a light page.
    r, g, bl, al = out.split()
    out = Image.merge('RGBA', (r, g, bl, al.filter(ImageFilter.GaussianBlur(0.5))))
    out.save(OUT, optimize=True)
    print('wrote', OUT, out.size)


if __name__ == '__main__':
    main()
