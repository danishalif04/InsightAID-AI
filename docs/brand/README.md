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

## The 2026-11-20 mark, and why its background was NOT removed

`src/assets/insightaid-mark.jpg` is now a square crop of
`Gemini_Generated_Image_c7012lc7012lc701.jpg`, background included.

Removing that background was attempted five ways and abandoned. The reason is
measurable, not a matter of tuning. With the background modelled as a smooth
surface and each pixel scored by how far it sits above that surface:

| Region | Score |
|---|---|
| outer background | 2.4 |
| **sphere's shaded side** | **1.5** |
| ring's inner glow | 11.2 |
| **gem's dark base** | **16.0** |

The sphere's shaded half scores *below* the background it sits on, and the
gem's dark base is 5 points from the ring's inner glow. There is no colour
signal separating them - a human eye uses knowledge of the shape, which no
threshold has. Every attempt either punched holes through the sphere and the
gem, or kept ragged blobs of background beside them.
`cutout-attempt-failed.png` is the best of the five, shown over white and over
the dark theme; `cutout_attempt.py` is the script.

**To get a transparent version**, regenerate the artwork with a background
that is not green - plain white, magenta, or an actual transparent PNG. Any of
those keys out in one line. Recolouring the subject is not required; only the
background needs to differ from the darkest part of the mark.
