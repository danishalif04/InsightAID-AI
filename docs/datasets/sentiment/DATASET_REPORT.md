# Sentiment Dataset Report — v20261012-ba90cb55d8f7

Created (UTC): 2026-10-12T16:18:22+00:00  
Total rows: 107,171

## Rows by source and label

| source | negative | neutral | positive | All |
|---|---|---|---|---|
| amazon_2023_all_beauty | 10000 | 10000 | 10000 | 30000 |
| malay_combined | 13332 | 1012 | 13853 | 28197 |
| online_shopping_10_cats | 12000 | 0 | 12000 | 24000 |
| shopee_kaggle | 8000 | 8000 | 8000 | 24000 |
| shopee_my_kensvin | 67 | 25 | 882 | 974 |
| All | 43399 | 19037 | 44735 | 107171 |


## Rows by language and split

| language | test | train | validation | All |
|---|---|---|---|---|
| en | 5549 | 43882 | 5543 | 54974 |
| ms | 2820 | 22557 | 2820 | 28197 |
| zh | 2400 | 19200 | 2400 | 24000 |
| All | 10769 | 85639 | 10763 | 107171 |


## Rows by label method

| label_method | rows |
|---|---|
| rating_weak | 54000 |
| binary_original | 24000 |
| source_semisupervised-twitter | 23234 |
| source_twitter | 2808 |
| source_supervised-twitter | 988 |
| aste_majority_human | 974 |
| source_polarity | 473 |
| source_news | 409 |
| source_supervised_twitter_politics | 160 |
| source_imdb-bm | 50 |
| source_yelp-bm | 44 |
| source_amazon-bm | 31 |


## Processing steps

| step | rows_before | rows_after | removed |
|---|---|---|---|
| drop_unmapped_labels | 1998091 | 1998006 | 85 |
| length_filter | 1998006 | 1996324 | 1682 |
| drop_likely_indonesian_in_malay | 1996324 | 1995174 | 1150 |
| drop_empty_after_norm | 1995174 | 1993395 | 1779 |
| drop_conflicting_duplicate_labels | 1993395 | 1976654 | 16741 |
| drop_exact_duplicates | 1976654 | 1879463 | 97191 |
| per_source_label_caps | 1879463 | 107171 | 1772292 |


## Sources

- **shopee_my_kensvin**: https://huggingface.co/datasets/kensvin/shopee-malaysia-reviews (MIT)
- **malay_combined**: https://huggingface.co/datasets/aisyahhrazak/combined-malay-sentiment (from github.com/mesolitica/malaysian-dataset)
- **online_shopping_10_cats**: https://github.com/SophonPlus/ChineseNlpCorpus (online_shopping_10_cats)
- **amazon_2023_all_beauty**: https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023 (raw_review_All_Beauty); Hou et al., 2024
- **shopee_kaggle**: https://www.kaggle.com/datasets/shymammoth/shopee-reviews

## Methodological notes

- Ratings were converted to weak labels (1-2 negative, 3 neutral, 4-5 positive). Rating does not always equal sentiment.
- online_shopping_10_cats is binary; it contributes no neutral examples.
- shopee_my_kensvin labels are the majority polarity of human aspect-level annotations; ties were dropped.
- De-duplication and conflicting-label removal were done across all sources before splitting, so no text appears in more than one split.
- Malay rows flagged by the Indonesian keyword heuristic were removed (see processing steps).
- These splits are for model development. The thesis headline result should also be reported on the hand-labelled gold test set.