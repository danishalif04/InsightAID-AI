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
