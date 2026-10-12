# Sales Dataset Report — v20261012-2c339361a176

Created (UTC): 2026-10-12T16:19:57+00:00  
Rows: 35,890 · Series: 32

## Series profile

| dataset | series_id | start | end | days | mean_y | zero_share | filled_share |
|---|---|---|---|---|---|---|---|
| favorita | favorita_s1_BEAUTY | 2013-01-01 | 2017-08-15 | 1688 | 2.4 | 0.153 | 0.002 |
| favorita | favorita_s1_BEVERAGES | 2013-01-01 | 2017-08-15 | 1688 | 1583.99 | 0.006 | 0.002 |
| favorita | favorita_s1_CLEANING | 2013-01-01 | 2017-08-15 | 1688 | 638.94 | 0.006 | 0.002 |
| favorita | favorita_s1_GROCERY_I | 2013-01-01 | 2017-08-15 | 1688 | 2217.9 | 0.006 | 0.002 |
| favorita | favorita_s1_PERSONAL_CARE | 2013-01-01 | 2017-08-15 | 1688 | 128.87 | 0.006 | 0.002 |
| favorita | favorita_s3_BEAUTY | 2013-01-01 | 2017-08-15 | 1688 | 9.59 | 0.011 | 0.002 |
| favorita | favorita_s3_BEVERAGES | 2013-01-01 | 2017-08-15 | 1688 | 6724.88 | 0.005 | 0.002 |
| favorita | favorita_s3_CLEANING | 2013-01-01 | 2017-08-15 | 1688 | 2058.31 | 0.005 | 0.002 |
| favorita | favorita_s3_GROCERY_I | 2013-01-01 | 2017-08-15 | 1688 | 7683.93 | 0.005 | 0.002 |
| favorita | favorita_s3_PERSONAL_CARE | 2013-01-01 | 2017-08-15 | 1688 | 502.35 | 0.005 | 0.002 |
| favorita | favorita_s44_BEAUTY | 2013-01-01 | 2017-08-15 | 1688 | 11.62 | 0.011 | 0.002 |
| favorita | favorita_s44_BEVERAGES | 2013-01-01 | 2017-08-15 | 1688 | 7948.97 | 0.005 | 0.002 |
| favorita | favorita_s44_CLEANING | 2013-01-01 | 2017-08-15 | 1688 | 2552.29 | 0.005 | 0.002 |
| favorita | favorita_s44_GROCERY_I | 2013-01-01 | 2017-08-15 | 1688 | 9707.38 | 0.005 | 0.002 |
| favorita | favorita_s44_PERSONAL_CARE | 2013-01-01 | 2017-08-15 | 1688 | 557.84 | 0.005 | 0.002 |
| olist | olist_cat_beleza_saude | 2017-01-06 | 2018-08-29 | 601 | 2081.77 | 0.012 | 0.012 |
| olist | olist_cat_cama_mesa_banho | 2017-01-08 | 2018-08-28 | 598 | 1731.58 | 0.007 | 0.007 |
| olist | olist_cat_esporte_lazer | 2017-01-09 | 2018-08-29 | 598 | 1635.0 | 0.005 | 0.005 |
| olist | olist_cat_informatica_acessorios | 2017-01-12 | 2018-08-29 | 595 | 1517.52 | 0.015 | 0.015 |
| olist | olist_cat_moveis_decoracao | 2017-01-07 | 2018-08-28 | 599 | 1204.65 | 0.003 | 0.003 |
| olist | olist_total | 2017-01-05 | 2018-08-29 | 602 | 22341.41 | 0.0 | 0.0 |
| online_retail_ii | retail2_item_17003 | 2009-12-01 | 2011-12-08 | 738 | 96.79 | 0.592 | 0.592 |
| online_retail_ii | retail2_item_21212 | 2009-12-01 | 2011-12-09 | 739 | 130.66 | 0.196 | 0.196 |
| online_retail_ii | retail2_item_21977 | 2009-12-01 | 2011-12-09 | 739 | 76.85 | 0.235 | 0.235 |
| online_retail_ii | retail2_item_22197 | 2009-12-01 | 2011-12-09 | 739 | 121.65 | 0.238 | 0.238 |
| online_retail_ii | retail2_item_23166 | 2011-01-18 | 2011-12-09 | 326 | 239.37 | 0.617 | 0.617 |
| online_retail_ii | retail2_item_23843 | 2011-12-09 | 2011-12-09 | 1 | 80995.0 | 0.0 | 0.0 |
| online_retail_ii | retail2_item_84077 | 2009-12-01 | 2011-12-09 | 739 | 149.04 | 0.364 | 0.364 |
| online_retail_ii | retail2_item_84879 | 2009-12-01 | 2011-12-09 | 739 | 110.7 | 0.212 | 0.212 |
| online_retail_ii | retail2_item_85099B | 2009-12-01 | 2011-12-09 | 739 | 133.08 | 0.203 | 0.203 |
| online_retail_ii | retail2_item_85123A | 2009-12-01 | 2011-12-09 | 739 | 130.1 | 0.184 | 0.184 |
| online_retail_ii | retail2_total_revenue | 2009-12-01 | 2011-12-09 | 739 | 28379.69 | 0.183 | 0.183 |


## Sanity check (seasonal naive, season=7) — NOT a model result

| dataset | series_id | test_days | snaive_MAE | snaive_MAPE_nonzero_% |
|---|---|---|---|---|
| favorita | favorita_s1_BEAUTY | 90 | 2.2 | 78.26 |
| favorita | favorita_s1_BEVERAGES | 90 | 241.378 | 12.99 |
| favorita | favorita_s1_CLEANING | 90 | 88.211 | 16.06 |
| favorita | favorita_s1_GROCERY_I | 90 | 376.156 | 15.68 |
| favorita | favorita_s1_PERSONAL_CARE | 90 | 30.7 | 23.35 |
| favorita | favorita_s3_BEAUTY | 90 | 6.7 | 55.09 |
| favorita | favorita_s3_BEVERAGES | 90 | 1294.622 | 13.34 |
| favorita | favorita_s3_CLEANING | 90 | 363.856 | 16.8 |
| favorita | favorita_s3_GROCERY_I | 90 | 1116.567 | 12.59 |
| favorita | favorita_s3_PERSONAL_CARE | 90 | 107.356 | 18.5 |
| favorita | favorita_s44_BEAUTY | 90 | 7.444 | 58.44 |
| favorita | favorita_s44_BEVERAGES | 90 | 1700.4 | 15.5 |
| favorita | favorita_s44_CLEANING | 90 | 443.111 | 16.54 |
| favorita | favorita_s44_GROCERY_I | 90 | 1518.633 | 13.83 |
| favorita | favorita_s44_PERSONAL_CARE | 90 | 157.856 | 24.84 |
| olist | olist_cat_beleza_saude | 90 | 1864.763 | 83.02 |
| olist | olist_cat_cama_mesa_banho | 89 | 1022.641 | 84.13 |
| olist | olist_cat_esporte_lazer | 90 | 1003.787 | 234.99 |
| olist | olist_cat_informatica_acessorios | 90 | 701.411 | 89.44 |
| olist | olist_cat_moveis_decoracao | 89 | 841.019 | 87.36 |
| olist | olist_total | 90 | 8278.413 | 57.77 |
| online_retail_ii | retail2_item_17003 | 89 | 101.09 | 484.4 |
| online_retail_ii | retail2_item_21212 | 90 | 89.189 | 398.52 |
| online_retail_ii | retail2_item_21977 | 90 | 71.656 | 504.86 |
| online_retail_ii | retail2_item_22197 | 90 | 277.589 | 174.34 |
| online_retail_ii | retail2_item_23166 | 90 | 22.067 | 285.29 |
| online_retail_ii | retail2_item_84077 | 90 | 208.322 | 122.6 |
| online_retail_ii | retail2_item_84879 | 90 | 113.422 | 146.26 |
| online_retail_ii | retail2_item_85099B | 90 | 178.044 | 295.41 |
| online_retail_ii | retail2_item_85123A | 90 | 94.733 | 216.82 |
| online_retail_ii | retail2_total_revenue | 90 | 15450.74 | 36.8 |


## Sources

- **olist**: https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce (CC BY-NC-SA 4.0 — check page)
- **online_retail_ii**: https://archive.ics.uci.edu/dataset/502/online+retail+ii (CC BY 4.0)
- **rossmann**: https://www.kaggle.com/competitions/rossmann-store-sales (competition rules)
- **favorita**: https://www.kaggle.com/competitions/store-sales-time-series-forecasting (competition rules)
- **m5**: https://www.kaggle.com/competitions/m5-forecasting-accuracy (competition rules)

## Methodological notes

- Splits are time-ordered: the last 90 days of each dataset are the test set. Never shuffle.
- Rolling-origin folds in folds.json sit inside the training period.
- Days with no transactions were filled with y=0 and is_filled=1. Online Retail II Saturdays are is_open=0 (shop closed), not zero demand.
- Olist review features use review_creation_date (when the review became visible), so they do not leak future information. Use lagged versions as regressors.
- None of these datasets are Malaysian; state this in your limitations.