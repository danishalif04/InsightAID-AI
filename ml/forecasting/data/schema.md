# Expected training data schema

This pipeline forecasts a **daily** sales/revenue series, built by
`src/data_loader.py` from two existing tables
(`supabase/migrations/0003_data_pipeline.sql`) — nothing here invents a new
input format.

## Input 1: `processed_data` (row-level, sales/revenue)

| Column | Required | Notes |
|---|---|---|
| `published_at` | preferred date field | falls back to `collected_at` when null |
| `collected_at` | yes (fallback) | |
| `sales` | yes | summed per day |
| `revenue` | yes | summed per day — the actual forecast target |
| `product` | optional | pass `product=` to `build_daily_sales()` to forecast one product/category instead of the whole business |

`src/data_loader.build_daily_sales()` sums `sales`/`revenue` per calendar
day. `build_daily_series()` then reindexes to a continuous daily range —
days with zero rows become a real 0, not a missing value, since "no sales
that day" is meaningful.

## Input 2 (optional): `daily_aggregates` (already daily, sentiment signals)

| Column | Used as |
|---|---|
| `date` | join key |
| `comment_volume` | one of the 3 sentiment-enhanced regressors the user asked for |
| `avg_rating_sentiment` | stands in for "sentiment score" (the one continuous sentiment signal this table has) |
| `negative_ratio` | one of the 3 sentiment-enhanced regressors |
| `mention_volume`, `positive_ratio` | collapsed/joined but not currently used as regressors — available if you want to extend `SENTIMENT_REGRESSOR_COLUMNS` in `src/prophet_model.py` |

`daily_aggregates` has one row per (date, source, platform) — `src/data_loader.build_daily_sentiment_regressors()`
collapses that to one row per day: volumes are summed across
sources/platforms, ratio/score columns are averaged weighted by that day's
`comment_volume` (falling back to a plain mean when every row that day has
0 comment volume). Days with no social data at all get 0 volume but a
**null** ratio/score — a measured zero and "no data" are kept distinct,
never conflated by silently zeroing a ratio that was never actually
observed.

## Where this data comes from today

Dataset Management → "ML Training Data Export" exports both inputs
(`src/services/mlExportService.js`): "Forecast Sales CSV" and "Forecast
Sentiment Regressors CSV". One correction to the table above: real uploaded
sales rows are never written to `processed_data` (only the `reviews`/
`social` templates reach that table — see `dataPipelineService.ingestRows`);
sales rows only ever land in `raw_data` as the original, unmapped CSV
payload. `fetchForecastSalesRows()` reads from there instead, reusing the
same column-matching used at upload time to turn whatever the original
headers were into `date`/`product`/`sales`/`revenue`. `daily_aggregates` is
read as documented above, no change needed there. See `README.md` for what
running the notebook actually requires before it produces a real forecast.
