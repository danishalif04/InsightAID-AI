"""Recolour the InsightAid glyph onto a light-green tile.

The source art is a light glyph on a near-black green ground. The app's theme
is light green, so the tile is re-mapped rather than keyed: every pixel's
luminance becomes a position `t` along a colour ramp. That keeps the facets,
the ring and the binary texture exactly as drawn - no alpha key, so no holes
punched through the stem, and no seam from compositing.

Brightness is INVERTED relative to the source: the ground (t near 0) becomes
light mint, and the glyph's brightest strokes (t near 1) become deep brand
green, so the mark reads dark-on-light.
"""
from PIL import Image, ImageFilter
import numpy as np
import sys

SRC = 'C:/Users/User/AppData/Local/Temp/claude/c1a4de9b946bca33/1dcf79c4-3939-46d4-a726-adf240977cf5/images/30.jpg'
CROP = (813, 212, 1713, 1112)
SIDE = 512


def hex_rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def ramp(stops, t):
    """Piecewise-linear colour ramp. `stops` is [(position, '#rrggbb'), ...]."""
    pos = np.array([p for p, _ in stops])
    cols = np.stack([hex_rgb(c) for _, c in stops])
    out = np.zeros(t.shape + (3,))
    for i in range(len(stops) - 1):
        lo, hi = pos[i], pos[i + 1]
        m = (t >= lo) & (t <= hi)
        if not m.any():
            continue
        f = ((t[m] - lo) / max(hi - lo, 1e-6))[:, None]
        out[m] = cols[i] * (1 - f) + cols[i + 1] * f
    out[t < pos[0]] = cols[0]
    out[t > pos[-1]] = cols[-1]
    return out


HI = {'mint': 215.0, 'lime': 215.0, 'emerald': 215.0, 'fresh': 150.0, 'citrus': 150.0,
      'spring': 190.0, 'meadow': 190.0}

PALETTES = {
    # Light mint ground, lime midtones, deep brand green strokes.
    'mint': [
        (0.00, '#f2fbf5'), (0.16, '#dcf5e4'), (0.34, '#b9e87f'),
        (0.50, '#6cc46e'), (0.70, '#22a45f'), (1.00, '#15663c'),
    ],
    # Brighter, more yellow-green overall.
    'lime': [
        (0.00, '#f7fde9'), (0.16, '#e6f8c9'), (0.34, '#bbe85c'),
        (0.52, '#63c45f'), (0.72, '#22a45f'), (1.00, '#166534'),
    ],
    # Light ground, but only the first fifth of the ramp is pale - everything
    # above becomes saturated green, so the stem keeps its facets.
    'fresh': [
        (0.00, '#f4fcee'), (0.12, '#e2f6c6'), (0.26, '#a8dc4e'),
        (0.42, '#4cb45f'), (0.60, '#1d8a4f'), (0.80, '#15663c'), (1.00, '#0d4a2a'),
    ],
    # As 'fresh' but the midtones carry more yellow.
    'citrus': [
        (0.00, '#f8fdf0'), (0.12, '#eaf9cf'), (0.24, '#c2e85a'),
        (0.38, '#7ac73f'), (0.55, '#2f9f52'), (0.78, '#17703f'), (1.00, '#0d4a2a'),
    ],
    # Bright spring-green ground, glyph running lime to pale citrus. Keeps the
    # source's own light-on-dark order, so the stem's dark facets stay dark
    # and read as facets rather than as holes punched in the mark.
    'spring': [
        (0.00, '#1d8a52'), (0.16, '#24a35e'), (0.36, '#45b85f'),
        (0.56, '#86cf52'), (0.76, '#bde63f'), (1.00, '#f3fbd4'),
    ],
    # Lighter still: a mid-green ground with a strongly yellow glyph.
    'meadow': [
        (0.00, '#2f9e5a'), (0.15, '#3fae5c'), (0.34, '#63c155'),
        (0.54, '#9ad84a'), (0.74, '#cdec45'), (1.00, '#f7fde4'),
    ],
    # Keeps a green ground but lifts it far off black; glyph goes lime.
    'emerald': [
        (0.00, '#0e4b32'), (0.18, '#15663c'), (0.38, '#22a45f'),
        (0.58, '#6cc46e'), (0.78, '#bbe85c'), (1.00, '#f0fbd8'),
    ],
}


def build(name, out_path):
    im = Image.open(SRC).convert('RGB').crop(CROP)
    a = np.asarray(im).astype(float)
    lum = a.max(axis=2)

    # Normalise so the ground sits at 0 and the brightest strokes at 1. The
    # ground occupies ~85% of the tile below luminance 60 (measured), and the
    # ring/highlights sit above 160. The upper bound is deliberately well
    # below 255: clamping early gives the mid-tone stem facets (60-130) more
    # of the ramp, which is what stops them washing out to near-white.
    hi = HI[name]
    t = np.clip((lum - 42.0) / (hi - 42.0), 0, 1)
    # Gentle S-curve: flattens the ground so its film grain stops showing as
    # colour mottle once the ramp spreads the low end across real hues.
    t = t * t * (3 - 2 * t)

    rgb = ramp(PALETTES[name], t)

    # Soft radial shading so the tile has depth rather than reading flat.
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    cy, cx = a.shape[0] / 2, a.shape[1] / 2
    r = np.sqrt(((yy - cy) / cy) ** 2 + ((xx - cx) / cx) ** 2) / 1.414
    shade = (1.0 - 0.10 * np.clip(r, 0, 1) ** 2)[:, :, None]
    rgb = np.clip(rgb * shade, 0, 255)

    out = Image.fromarray(rgb.astype(np.uint8)).resize((SIDE, SIDE), Image.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=3))
    out.save(out_path, quality=93, optimize=True)
    return out_path


if __name__ == '__main__':
    name = sys.argv[1]
    print(build(name, sys.argv[2]))
