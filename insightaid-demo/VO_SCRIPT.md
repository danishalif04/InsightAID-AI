# INSIGHTAID AI — Voiceover Script & Brief

> **For:** whoever (or whichever AI tool) produces the voiceover for the 2-minute INSIGHTAID AI demo video.
> **Output:** 13 audio files, one per scene, dropped into `insightaid-demo/public/assets/vo/`.
> **Source of truth:** every line below is copied from `src/data/content.ts`. The video burns in captions from that same text, so **read every line word for word**. If the spoken words differ from the script, the captions on screen will not match what is heard.

---

## 1. The voice

| | |
|---|---|
| **Character** | Calm, confident, warm. A founder explaining something they're proud of, not an advert shouting at you. |
| **Accent** | Malaysian English is ideal and fits the story. Neutral international English is fine. |
| **Pace** | About **140 words per minute**: unhurried, with clear pauses at full stops. |
| **Energy** | Steady through Scenes 1–2 (the problem), lifts at Scene 3 (the reveal), stays bright through the demo, and lands softly on the last line. |
| **Avoid** | Hype voice, radio-DJ inflection, upspeak at the end of statements, audible breaths between every phrase. |

---

## 2. Pronunciation guide

| Word | Say it as | Note |
|---|---|---|
| **InsightAid** | IN-sight-AID | Two words run together. Stress on **AID**. |
| **InsightAid AI** | IN-sight-AID · AY-EYE | Spell out "A-I". Never say "eye" as one sound. |
| **Shopee** | SHOP-ee | |
| **TikTok** | TIK-tok | |
| **X** | ex | The platform. Not "Twitter". |
| **Threads** | threads | |
| **ringgit** | RING-git | Hard "g". |
| **Mandarin** | MAN-da-rin | |
| **multilingual** | mul-tee-LING-gwul | |

---

## 3. Technical spec

| | |
|---|---|
| **Format** | WAV (preferred) or MP3 320 kbps |
| **Sample rate** | 48 kHz |
| **Channels** | Mono |
| **Loudness** | Around **−16 LUFS**, peaks no higher than **−1 dBFS** |
| **Silence** | **No more than 0.2 s** of silence at the start or end of each file. The video adds its own lead-in. |
| **Background** | Voice only. No music, no room echo, no effects. Music and sound effects are mixed in separately. |
| **File names** | Exactly `s01.wav` … `s13.wav`. Two digits, lower case. |

---

## 4. The script

**Max length** is a hard limit. The video gives each line that much room after a short lead-in, and anything longer gets cut off mid-word. These limits are fitted to the female clips supplied on 2026-11-20 and to the music, which was composed for fixed cue points (lift at 0:15, crisis at 0:48, pricing at 1:28). **The margins are small on S2–S5** (3–5 frames). The male clips do **not** fit this timing: male `s02` runs 9.61 s against an 8.9 s limit.

| File | Scene | Max length | Line — read exactly as written | Delivery |
|---|---|---|---|---|
| `s01.wav` | Cold open | **5.4 s** | Every day, your customers are talking — on TikTok, Shopee, X and Threads. | Intimate, almost conversational. Slight pause at the dash. The four platforms as a quick list. |
| `s02.wav` | The problem | **8.9 s** | But most startups can't keep up. Seventy percent of small businesses use no analytics tools — so problems surface only after sales drop. | Concerned but not dramatic. Land on **"after sales drop"**. |
| `s03.wav` | Brand reveal | **6.9 s** | Meet InsightAid AI — a decision support system built for early-stage startups. Decisions, backed by evidence. | The lift. A small, warm emphasis on **"Meet"**. Pause before the tagline, then deliver it slowly and cleanly. **Margin: 0.1 s.** |
| `s04.wav` | How it works | **7.5 s** | It collects your reviews, comments and sales, cleans and translates them, and runs everything through one AI engine. | Even, explanatory rhythm across the three verbs: *collects · cleans · runs*. |
| `s05.wav` | Connect data | **6.4 s** | Connect your sources in a few clicks. Every comment — in Malay, Mandarin or English — flows in. | Light and easy. "In a few clicks" should sound effortless. |
| `s06.wav` | Sentiment | **9.2 s** | A multilingual AI model reads every comment and scores how your customers feel — in Malay, Mandarin and English alike. | Quietly impressive. Emphasis on **"every comment"**. |
| `s07.wav` | Crisis | **10.4 s** | Then something changes. Negative mentions climb. InsightAid raises an early warning, and points straight at the cause — before it reaches your sales. | The one tense moment. Slow down on **"Then something changes."** Short pause. Pick the pace back up for the warning. Resolve on "before it reaches your sales". |
| `s08.wav` | Forecast | **8.4 s** | See where your revenue is heading, so you can act while there is still time to change the outcome. | Reassuring, forward-looking. |
| `s09.wav` | Ask & recommend | **10.4 s** | Just ask what happened. InsightAid explains the cause and recommends what to do next, ranked by impact. | Casual on "Just ask what happened." Confident through the rest. |
| `s10.wav` | All in one place | **8.4 s** | Sentiment, crises, forecasts and actions — all in one place, on any device. | A list that builds, then settles. Emphasis on **"all in one place"**. |
| `s11.wav` | Pricing | **12.4 s** | Enterprise analytics can cost thousands of ringgit per user every month. InsightAid starts free — and grows with you from forty-nine ringgit a month. | A clear contrast between the two sentences. The first slightly heavier, the second lighter and friendlier. Say **"forty-nine ringgit"** in full, never "RM forty-nine". |
| `s12.wav` | Impact | **8.4 s** | Multilingual. Proactive. Affordable. Built for the startups that need it most. | Three single words with a beat after each, then a warm close. |
| `s13.wav` | End card | **9.4 s** | InsightAid AI. Decisions, backed by evidence. | The signature. Slow, calm, confident. A clear pause after "AI." **Do not rush it** — there's room to breathe. |

**Total spoken:** about 210 words, roughly 90 seconds of voice inside a 120-second video. The gaps are deliberate; they leave room for music and visuals.

---

## 5. If you're generating this with an AI voice tool

Paste the instruction below, followed by the 13 lines from Section 4.

```
Generate 13 separate voiceover clips for a calm, confident product demo video.
Voice: warm, mid-pitch, unhurried, Malaysian or neutral English. ~140 words per minute.
Read each line EXACTLY as written - do not add, drop or reword anything.
Pronounce "InsightAid" as IN-sight-AID, and "AI" as the letters A-I.
Pronounce "ringgit" as RING-git. "X" is the social platform, said "ex".
Each clip must be no longer than its stated max length.
No music, no effects, no more than 0.2 s of silence at either end.
Export as 48 kHz mono WAV named s01.wav to s13.wav.
```

**Suggested settings for ElevenLabs** (or any tool with similar controls):

| Setting | Value | Why |
|---|---|---|
| Stability | 0.55–0.65 | Consistent tone across 13 separate clips |
| Similarity / clarity | 0.75 | Clear without sounding over-processed |
| Style exaggeration | 0–0.15 | Keeps it calm rather than theatrical |
| Speaker boost | On | |

**Generate all 13 with the same voice and the same settings in one session.** Clips made on different days or with different settings will sound like different people when they're cut together.

---

## 6. Recording it yourself instead

- A quiet, soft-furnished room. A bedroom with a wardrobe of clothes beats a bare room.
- Phone held about 20 cm from your mouth, slightly off to the side so you don't pop the "p"s.
- Record each line **2–3 times** and keep the best take.
- Leave 1 second of silence before you speak, then trim it to 0.2 s afterwards.
- Read Section 2 out loud once before you start.

---

## 7. Checking the files before handing them back

For each clip, confirm:

- [ ] The file name is `s01.wav` … `s13.wav`
- [ ] The length is **under** its max in Section 4
- [ ] Every word matches the script exactly
- [ ] "InsightAid" and "AI" are pronounced as in Section 2
- [ ] There's no music, echo or long silence

Then put all 13 in `insightaid-demo/public/assets/vo/`. The video picks them up automatically on the next render.

---

## 8. If a line must change

**Don't change the wording in the audio alone.** Change it in `src/data/content.ts`, which updates the on-screen captions at the same time, then regenerate that one clip. Any new line must still fit its max length at 140 wpm, or the scene timing has to change too.
