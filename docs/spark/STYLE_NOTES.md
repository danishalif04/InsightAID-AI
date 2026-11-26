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

## Decisions (Danish, 26 Nov 2026)

- Stills approved.
- **Motion graphics only**: no stock footage. Scenes 3, 4 and 24 are kinetic type and graphics (the 40/80/25 portion counter in scene 4 is labelled "Illustration").
- **Music: original**, synthesised in `video_src/render/audio.py` (D minor pad, sub bass, pluck arpeggio, soft pulse; no samples, no third-party music), ducked about 11 dB under the voice-over. Sound effects (whooshes, chapter hits, number ticks, the demo click) are synthesised the same way.
- Publication chapter skipped (none yet); chapters are 01 Introduction, 02 Problem, 03 Solution, 04 Impacts, 05 Commercialisation potential, 06 Copyright.

## Render (26 Nov 2026)

- Length 4:32 (limit 6:30). 1920 × 1080, 30 fps, H.264 + AAC.
- Captions burned in, and as a separate file for YouTube: [SPARK_VIDEO_CAPTIONS_EN.srt](SPARK_VIDEO_CAPTIONS_EN.srt). Caption **text is the script**; only the timing comes from the recording (Whisper word times), so small slips in the voice-over read correctly on screen.
- Every number on screen is read from `metrics/spark2026.json` at build time; the build stops if O1 or the response-time verdict is no longer MET, because the narration would then be wrong.
- The planner recording is cut before its replay table, which was captured at a 20% buffer and shows different totals from the 10% headline figures.
- Pipeline (sources in `video_src/render/`): `vo_words.py` (word times) → `timeline.py` (scene lengths, captions, .srt) → `build_comp.mjs` (fills `comp.html`) → `render.mjs` (frame-exact Playwright capture into ffmpeg, 4 chunks in parallel) → `audio.py` (score, sound design, ducking; writes music and sfx stems) → `remix.py` (balance: music −7.5 dB, sfx −10 dB) → two-pass loudnorm to −14 LUFS, −1.5 dBTP → mux (H.264 CRF 15, AAC 320k). Output: `docs/spark/video/final/INSIGHTAID_AI_SPARK2026.mp4` (git-ignored, 139 MB).

## Still open

- The end-card QR points to `insightaid-ai.vercel.app/welcome`. The live site still runs `main`, which has no "Try the demo" button yet; `spark-2026` must be merged before the video is published.
