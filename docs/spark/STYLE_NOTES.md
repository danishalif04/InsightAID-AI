# SPARK 2026 video: style notes

For Danish's review **before anything is rendered**. Sample stills: `docs/spark/video/stills/` (git-ignored, on this machine).

## About the reference

Reference: Membrain "Elevate" BI SaaS launch video by What a Story (https://www.youtube.com/watch?v=2yL0LhyxOGk, 1:10). I did **not** download the video: YouTube's terms do not allow downloading, and the brief only needs its motion style. These notes come from its thumbnail frame and its listing description (dark palette, UI animation, accurate UI mock-ups, voice-over with sound effects). If you want a specific moment matched, send a screenshot or a timestamp and a sentence on what you like about it.

What the thumbnail shows, and what we borrow:

| In the reference | Our version |
|---|---|
| Dark stage, product UI as the hero | App dark-glow background `#050807`, real app screens only |
| UI panels tilted in 3D, layered in depth | Real screens on a perspective stage; back layers blurred and dimmed |
| One card lifted forward from the interface | The flagged Karipap row and the before/after cards lift forward |
| Large gradient headline type | Manrope 800, one accent phrase in the app's mint → green → lime gradient |
| Small floating stat cards | Review cards and impact cards in the app's card style |
| Soft glow behind the UI | The app's own green radial glow |

**Not borrowed:** the reference's colours, logo, wording, music or footage.

## The 9 techniques

1. **3D stage:** real screens on a perspective camera, slow dolly in (about 3% scale over 4 s) and a slight orbit.
2. **Exploded UI:** one element lifts on the Z axis and fills the frame while the rest blurs (Karipap row, Before vs After card).
3. **Layered parallax:** glow, blurred back panel, sharp mid panel and foreground cards move at different speeds.
4. **Kinetic type:** 2 to 5 words per line, one accent phrase in gradient; words rise in with an 8-frame ease-out.
5. **Floating evidence cards:** real reviews from the dataset, with their real star ratings and language tags.
6. **Counting numbers:** RM and % values count up to the value read from `metrics/spark2026.json`.
7. **Push-through transitions:** the camera moves into a panel, which becomes the next screen recording.
8. **Cursor micro-interactions:** the recorded cursor and click ripple; the slider move in the planner.
9. **Sound:** a soft whoosh on transitions, a tick on number counts, a click on UI clicks; music ducked under the voice-over.

## Colour and type (from the app, `src/styles/index.css`)

| Token | Value | Use |
|---|---|---|
| Background | `#050807` | Stage |
| Surface / elevated | `#0A100D` / `#0F1713` | Cards |
| Text | `#F2F5F3` | Main text |
| Brand | `#22C55E` | Accent, "after" values, glow |
| Emerald / mint | `#10B981` / `#6EE7B7` | Chapter labels, gradients |
| Amber | `#CF7B0F` | SIMULATED and synthetic tags |
| Red | `#DC2626` | Freshness flag outline |

Fonts: **Manrope** (headings, as the app's UI font), **Inter** (text), **Instrument Serif** italic (tagline only), **Noto Sans SC** (Mandarin). 1920 × 1080, 30 fps.

## Honesty rules on screen

- Every UI shown exists in the real app; "Real app screen" tag on recordings and screen-based shots.
- Every simulated number carries the amber "Simulation on synthetic data" tag; the trade-off (units short) is always on the same shot as the waste saving.
- Reviews are synthetic demo data and are tagged so.
- Chapter labels use the organiser's names: Introduction, Problem, Solution, Impacts, Commercialisation potential, Copyright.

## Sample stills

| File | Scene |
|---|---|
| `still_01_introduction.png` | Face clip (mirror corrected) with the lower third |
| `still_02_title.png` | Title: wordmark over exploded app panels |
| `still_03_problem.png` | Kinetic type with three real "stale" reviews (BM, 中文, EN) |
| `still_04_solution_planner.png` | The flagged Karipap row lifted out of the planner, with its reviews |
| `still_05_impacts_waste.png` | Before vs after waste, SIMULATED tag, trade-off line |
| `still_06_end_card.png` | End card with the demo QR |

## Material ready

- Voice-over: 26 cleaned takes (`docs/spark/video/processed/`), scene 21 with the extra "or" removed, all at about −16 LUFS.
- Face clip: mirror to be corrected in the render.
- Screen recordings: 7 clips at 1080p with a visible cursor (`docs/spark/video/screens/`).
- Sources for all of this: `docs/spark/video_src/`.

## Open before the render

- The end-card QR points to `insightaid-ai.vercel.app/welcome`. The live site still runs `main`, which has no "Try the demo" button yet; `spark-2026` must be merged before the video is published.
- Stock footage (scenes 3, 4, 24): shortlist from Pexels or Pixabay for approval, or replace these with motion graphics only.
- Music: one royalty-free track (YouTube Audio Library or Pixabay Music), to be approved.
