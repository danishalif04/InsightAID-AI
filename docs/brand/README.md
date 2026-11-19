# Brand mark

`src/assets/insightaid-mark.jpg` is the mark the login page uses. This folder
keeps the variants it was chosen from, so a different one can be swapped in
later without redoing the work.

| File | Ground | Glyph |
|---|---|---|
| `mark-meadow-SHIPPED.jpg` | **bright green, ~`rgb(50,151,85)`** | lime gem, pale ring |
| `mark-spring.jpg` | deeper green | more yellow in the ring |
| `mark-emerald.jpg` | mid emerald | lime, closest to the original mood |
| `mark-citrus.jpg` | near-white | dark green ring, lime stem |
| `mark-fresh.jpg` | near-white | as citrus, less yellow |
| `mark-lime.jpg` | pale lime | deep green ring |
| `mark-mint.jpg` | pale mint | deep green ring |

To swap one in: copy it over `src/assets/insightaid-mark.jpg` and rebuild.

## How they were made

`recolor_mark.py` maps each pixel's luminance along a colour ramp, rather
than keying the glyph out of its background. Keying was tried and abandoned:
the glyph's dark facets overlap the background's luminance range, so an alpha
key punches holes through the "i" stem, and compositing onto a new canvas
leaves a faint seam rectangle.

The four light-ground variants (citrus, fresh, lime, mint) invert the
brightness so the ground can be pale. That has a cost worth knowing before
picking one: inverting turns the stem's DARK facets into the ground colour,
so they read as holes in the mark. The green-ground variants keep the
source's own light-on-dark order and do not have that problem.

The script expects the original artwork path in `SRC`; it is not in this
repository, so keep a copy of the source file if these need regenerating.

---

## The current mark (transparent)

`src/assets/insightaid-mark.png` is keyed from
`Gemini_Generated_Image_o6qs34o6qs34o6qs.jpg` by `keyout_mark.py`, and has
real transparency, so it sits on the page itself rather than on a tile.

### Why this source keys and the earlier ones did not

Two earlier renders were supplied on a flat green ground
(`..._c7012lc7012lc701.jpg`, `..._w75q8lw75q8lw75q.jpg`). Neither could be cut
out, and the reason was measurable rather than a matter of tuning: scoring
each pixel by how far it sat above a fitted background surface gave

| Region | Score |
|---|---|
| outer background | 2.4 |
| **sphere's shaded side** | **1.5** |
| ring's inner glow | 11.2 |
| **gem's dark base** | **16.0** |

The sphere's shaded half scored *below* the background it sat on. No threshold
separates those, because there is no signal to separate - the eye uses
knowledge of the shape instead. Five approaches were tried and all either
punched holes through the sphere and gem or kept ragged blobs beside them.

The current source is supplied on a painted checkerboard, which keys cleanly
because it is pure greyscale at exactly two levels:

| Region | Luminance | Channel spread |
|---|---|---|
| checker dark | ~5 | 0.6 |
| checker light | ~155 | 0.9 |
| ring (lit) | - | 29 |
| sphere shaded | - | 43 |
| gem dark base | - | 58 |

The one trap is the ring's shaded lower-left, rgb(92,91,89), whose spread is
only 3.5 - a saturation cut alone removes it and breaks the ring. Its
luminance of 91 sits squarely BETWEEN the checker's two levels, so requiring a
background pixel to be both unsaturated **and** at one of those levels keeps
it. That pair of conditions is the whole key.

The script also un-premultiplies the silhouette. Edge pixels are JPEG-blended
with the checker behind them, so without that step the mark carries a grey rim
on a light page and a bright rim on a dark one.

**The takeaway for future artwork:** ask for a checkerboard or any background
that differs from the darkest part of the mark. A green ground cannot be
removed, however the subject is coloured.

