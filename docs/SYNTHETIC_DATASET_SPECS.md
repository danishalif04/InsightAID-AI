# Synthetic Demo Dataset Specs — 3 Scenarios

Format/structure reference for creating the two NEW synthetic demo datasets
discussed, so whatever gets generated later drops straight into Dataset
Management with no column-mapping guesswork. Column names below are the
EXACT canonical names `src/utils/csvTemplates.js` expects (synonyms are
recognized too, but matching the canonical name avoids relying on that).

Row-count/date-range targets below are benchmarked against the one REAL
dataset already in the system (Embun Botanica, `usertest1`), so all three
accounts feel comparably "real" in scale during a demo — not because any
exact number is required.

**Embun Botanica reference stats** (for scale comparison only — this
account's data already exists, nothing to regenerate):
- 4,087 sales rows, 7 products, 2024-09-01 to 2026-10-21 (~2 years)
- 1,516 review rows, 3 languages (EN/BM/ZH), ratings skew positive
- Platforms: Shopee, TikTok, X

**Onboarding path for both new scenarios: "I have datasets" (`has_data`),
not "I don't have data."** Both accounts upload real-looking CSVs through
Dataset Management, the same way Embun Botanica did — neither is meant to
demo the no-data/AI-assisted planning path (that path is already covered
by the existing `usertest2` account). Set this explicitly during each
account's Onboarding flow when creating them.

**Suggested demo accounts** (same naming convention as the existing
`usertest1`/`usertest2`, next two unused numbers):

| Account | Scenario | Pathway | Onboarding path |
|---|---|---|---|
| `usertest3@insightai.com` / `usertest3` | Malaysian Local Eatery (F&B) | Malaysian Local Shop | I have datasets |
| `usertest4@insightai.com` / `usertest4` | Fashion E-commerce | Business Startup | I have datasets |

**New since this doc was first written: an optional `image_url` column
on the `sales` template.** The app now shows a real product photo in
its Product Performance view when this column is present (falls back
to a plain icon when it's blank or a URL fails to load — never a fake
or guessed image). See `docs/GENERATE_SYNTHETIC_DATASETS_PROMPT.md` for
the exact sourcing rules (must be real, verified, free-to-use stock
photos, one genuine visual match per product, same URL repeated across
that product's rows).

---

## Scenario 2 — Malaysian Local Eatery (F&B)

Pairs with the **Malaysian Local Shop** pathway. Suggested name: a kopitiam
or nasi lemak stall, e.g. **"Kedai Makan Pak Long"** or **"Warung Sedap
Selera"** — pick one, keep it consistent across all 3 files below.

### Business profile (for Onboarding / `business_profiles`)
| Field | Suggested value |
|---|---|
| business_name | Kedai Makan Pak Long |
| industry | Food & Beverage |
| business_stage | Established (3+ years) |
| location | Shah Alam, Selangor |
| business_model | Dine-in + takeaway, no delivery app listing (deliberately — tests the "no-data/AI-assisted" path's honesty, not every business has online ordering) |
| product_category | Malaysian local cuisine |
| selling_price | RM 8–15 per item (set as an average, e.g. RM 11.50) |
| cost_per_unit | RM 4–7 (ingredients-heavy, ~40% COGS is realistic for F&B) |
| expected_monthly_revenue | RM 25,000–40,000 |
| target_customer | Office workers, families, nearby residents |

### `sales` template (date, product, category, quantity_sold, unit_price, revenue, discount, cost)
- Date range: ~18–24 months, daily rows (F&B sells every day, unlike an online shop with gaps)
- 8–12 products (menu items), e.g.: Nasi Lemak Ayam, Nasi Lemak Rendang, Mee Goreng Mamak, Roti Canai, Teh Tarik, Kopi O, Nasi Goreng Kampung, Laksa, Ais Kacang, Milo Ais
- category: "Rice", "Noodles", "Beverage", "Dessert" (coarse, 4–5 categories)
- quantity_sold: 20–150 per item per day (high-frequency, low-ticket — realistic for a food stall)
- discount: mostly 0, occasional small promo (e.g. "Buy 1 Free 1 Teh Tarik Mondays")
- Include a deliberate **sales dip** across one real-looking week (e.g. a slow Raya/school-holiday week) so Forecasting/Crisis Detection has something real to react to — don't flatten demand to a constant.

Example row:
```
date,product,category,quantity_sold,unit_price,revenue,discount,cost
2025-03-14,Nasi Lemak Ayam,Rice,84,11.50,966.00,0,460.00
```

### `reviews` template (date, product, review_text, rating, platform)
- platform: Google, Facebook (realistic for a local F&B shop — NOT Shopee/TikTok, which don't fit a dine-in stall)
- Language mix target: ~50% Bahasa Melayu, ~35% English, ~15% Mandarin/code-mixed — skew BM-heavier than Embun Botanica's mix, since this is the "Malaysian Local Shop" scenario specifically
- rating: mostly 4–5, a real minority of 1–2 star complaints clustered around ONE believable incident (e.g. a week of slow service when short-staffed) — this is what should drive Crisis Detection's signal, not randomly scattered 1-stars
- Keep review text short, colloquial, code-mixed where natural (matches the real Embun Botanica reviews' style, e.g. "Sedap giler nasi lemak sini, tapi hari tu lambat sikit nak order")

Example row:
```
date,product,review_text,rating,platform
2025-03-20,Nasi Lemak Ayam,"Sedap macam biasa tapi hari ni agak lambat, mungkin sebab ramai orang",3,Google
```

### `social` template (date, platform, content, engagement, likes, comments, shares)
- platform: Facebook, X (TikTok optional — a local stall MAY have light TikTok presence, keep volume low if included)
- Lower volume than Embun Botanica (a physical food stall has far less organic social chatter than a Shopee-driven skincare brand) — aim for maybe 150–300 posts total across the whole date range, not thousands

---

## Scenario 3 — Fashion/Apparel E-commerce

Pairs with the **Business Startup** (synthetic-dataset-driven) pathway.
Suggested name: **"Kasual Thread Co."** or **"Zalina Studio"**.

### Business profile
| Field | Suggested value |
|---|---|
| business_name | Kasual Thread Co. |
| industry | Fashion & Apparel |
| business_stage | Early-stage (1–2 years) |
| location | Kuala Lumpur (nationwide shipping) |
| business_model | Shopee/TikTok Shop-driven e-commerce |
| product_category | Women's casual wear |
| selling_price | RM 35–120 (wider spread than Embun Botanica's skincare — apparel has more price tiers) |
| cost_per_unit | ~45–55% of selling price |
| expected_monthly_revenue | RM 40,000–70,000 |
| target_customer | Women 18–35, online shoppers |

### `sales` template
- Date range: ~12–18 months (younger business than Embun Botanica)
- 10–15 SKUs across a few categories: Tops, Dresses, Bottoms, Outerwear, Accessories
- **Seasonal/campaign spikes are the whole point of this scenario** (contrast with Embun Botanica's steadier skincare demand) — build in real-looking spikes around:
  - 11.11 / 12.12 Shopee sales (2–4x normal volume those days)
  - Raya collection launch (a real month-long uplift, not just one day)
  - A slow period right after a big sale (post-promo dip — tests whether Forecasting/Recommendations correctly read this as normal, not a crisis)
- discount: meaningfully used here (campaign-driven business), unlike Embun Botanica where it was mostly 0

Example row:
```
date,product,category,quantity_sold,unit_price,revenue,discount,cost
2025-11-11,Linen Wrap Dress,Dresses,212,79.00,13942.40,20,8480.00
```

### `reviews` template
- platform: Shopee, TikTok (matches an e-commerce-only business — no Google/Facebook, this brand has no physical storefront)
- Language mix: similar to Embun Botanica's (EN-heavier than the F&B scenario, since Shopee/TikTok Shop skews that way) — EN ~55%, BM ~30%, ZH ~15%
- rating: realistic apparel-specific complaints mixed in (sizing, late delivery, color mismatch from photos) — not just generic "bad product" text, since recommendation rules key off specific complaint categories

### `social` template
- platform: TikTok, X — higher volume than the F&B scenario (fashion brands lean heavily on TikTok virality), comparable to or above Embun Botanica's volume
- Include a few posts referencing an influencer/UGC unboxing style, consistent with how apparel brands actually get organic reach on TikTok

---

## General generation guidance (applies to both new scenarios)

- **Keep the `date` column in `YYYY-MM-DD` format** (or any format `new Date()` parses unambiguously) — avoid ambiguous `DD/MM/YYYY` vs `MM/DD/YYYY` formats, which is a real source of silent misparsing elsewhere in the pipeline.
- **`revenue` must already be net of `discount`** (confirmed convention from the real Embun Botanica data — see `src/utils/salesSeries.js`'s header comment) — i.e. `revenue = quantity_sold * unit_price - discount_amount`, not pre-discount.
- **`cost` is a LINE TOTAL, not a per-unit cost** — same confirmed convention (a sampled real row: cost=89.27 against revenue=249.0 only makes sense as a total, not per-unit).
- Don't make sentiment uniformly positive or uniformly negative — the honesty-first design of this whole project (see `knowledge.md`) depends on believable, mixed real-looking signal for the demo to be credible to your supervisor.
- Once generated, upload via **Dataset Management → Upload** using each template's own download button first (to confirm your generated CSV's headers match exactly), one template at a time (sales, then reviews, then social).

Not written here: Embun Botanica's own structure doesn't need restating since it already exists and should NOT be regenerated/overwritten.
