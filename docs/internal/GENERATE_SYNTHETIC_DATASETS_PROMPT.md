# Prompt — paste this to Claude to generate the 2 synthetic demo datasets

Copy everything in the box below into a new Claude conversation (Claude
Code, in this repo, works best — it can read `docs/SYNTHETIC_DATASET_SPECS.md`
directly and write the CSVs straight to disk; a web chat works too, it'll
just need to paste CSV content back to you instead).

---

```
I need you to generate 2 synthetic demo CSV datasets for a project called
InsightAid AI (a multilingual sentiment/forecasting/crisis-detection system
for Malaysian SMEs). If you have access to this repo, read
docs/SYNTHETIC_DATASET_SPECS.md first — it has the full scenario specs
(business profiles, product lists, date ranges, language mix, seasonal
patterns). Follow it exactly. If you don't have repo access, use the
summary below.

## The 2 scenarios

1. "Kedai Makan Pak Long" — a Malaysian local eatery (F&B), ~18-24 months
   of daily sales, 8-12 menu items, BM-heavy review language mix.
2. "Kasual Thread Co." — a fashion/apparel e-commerce brand, ~12-18
   months of sales with real seasonal spikes (11.11/12.12, Raya), 10-15
   SKUs, EN-heavier review language mix.

## Output: 3 CSV files per scenario (6 files total)

Exact column headers — these are the canonical names the app's importer
recognizes (synonyms are matched too, but use these exactly so there's no
ambiguity):

**sales.csv**: `date,product,category,quantity_sold,unit_price,revenue,discount,cost,image_url`
- `date`: YYYY-MM-DD, unambiguous, one row per product per day actually sold
- `revenue` MUST already be net of `discount` (revenue = quantity_sold * unit_price - discount), never both subtracted twice
- `cost` is a LINE TOTAL for that row, not a per-unit cost
- `image_url` is OPTIONAL and NEW (just added to the app) — see the Images section below. Leave blank only if you truly can't find a real photo for that product; don't fabricate a URL.

**reviews.csv**: `date,product,review_text,rating,platform`
- `rating` 1-5, realistic distribution (mostly positive, a believable minority of real complaints — see each scenario's own crisis-pattern note in the spec doc)
- `review_text` should read like a real, short, colloquial review — code-mixed EN/BM/ZH where natural, matching each scenario's language-mix target

**social.csv**: `date,platform,content,engagement,likes,comments,shares`

## Images — IMPORTANT, read carefully

The app now supports showing a real product photo next to each product
in its "Product Performance" view, read from `image_url` on the SALES
CSV (new, optional column). For this to actually work:

- Every URL must be a REAL, currently-working image link — verify each
  one actually loads before using it (fetch/check it, don't just
  construct a plausible-looking URL and assume it works).
- Use free-to-use stock photography (Unsplash, Pexels, Pixabay, or
  similar royalty-free sources) that's a genuine, reasonable visual match
  for that specific product (e.g. an actual nasi lemak photo for "Nasi
  Lemak Ayam," not a generic food photo for every dish). Direct CDN image
  URLs (ending in .jpg/.png, not a page URL) are required — the app
  renders `<img src="...">` directly, it cannot follow a webpage link.
- Use the SAME image_url for every row of the same product (so the app
  groups it as one photo per product, not one per transaction row).
- If you genuinely cannot find a good real match for a specific product,
  leave that column blank for its rows rather than using an unrelated
  or fake image — the app already handles a missing photo gracefully
  (shows a plain icon instead), which is honest; a wrong or broken photo
  is not.
- Respect each source's actual licence for free/commercial use — note
  which source (Unsplash/Pexels/Pixabay/etc.) each image came from
  somewhere in your response, the same way this project's DATA_CARD.md
  discloses dataset provenance for everything else.

## After generating

Save the 6 files, then tell me their paths. I'll upload them myself via
Dataset Management → Upload (one template at a time: sales, then
reviews, then social, for each of the two new demo accounts).
```

---

## One more thing you'll still need to do yourself

These 2 scenarios need their own demo accounts before you can upload into
them — sign up through `/signup` for each (see `docs/SYNTHETIC_DATASET_SPECS.md`
for the suggested `usertest3`/`usertest4` emails/passwords), and pick
**"I have datasets"** at Onboarding for both (not the no-data path).
