"""Offline tests: build small mock files that copy each source's real file format,
then run the full preparation pipeline. Run:  python tests/test_prep_offline.py [path_to_real_chinese_csv]"""
import json
import os
import sys
import tempfile

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import sentiment_prep as sp  # noqa: E402
import sales_prep as sl  # noqa: E402

rng = np.random.default_rng(0)
TMP = tempfile.mkdtemp()


def check(cond, msg):
    assert cond, msg
    print("  PASS", msg)


# ----------------------------------------------------------------- unit checks
print("Unit checks")
check(sp.rating_to_label(1) == "negative" and sp.rating_to_label(3) == "neutral" and sp.rating_to_label("5") == "positive", "rating_to_label")
check(sp.rating_to_label(None) is None and sp.rating_to_label(7) is None, "rating_to_label rejects invalid")
check(sp.aste_to_label("[([0], [2], 'POS'), ([8, 9], [7], 'NEG'), ([3], [4], 'NEG')]") == "negative", "aste majority")
check(sp.aste_to_label("[([0], [2], 'POS'), ([8, 9], [7], 'NEG')]") is None, "aste tie dropped")
check(sp.clean_text("Best!!! &amp; sooo good @kedai https://x.co/a") == "Best!!! & sooo good @user [URL]", "clean_text keeps emphasis, masks url/mention")
check(sp.looks_indonesian("bagus banget gak nyesel") and not sp.looks_indonesian("barang sampai cepat terima kasih"), "indonesian heuristic")

# ----------------------------------------------------------------- mock sentiment sources
print("Sentiment pipeline")
kdir = os.path.join(TMP, "kensvin"); os.makedirs(kdir)
tpl = ["Quality : good ! fast delivery####[([0], [2], 'POS'), ([5], [4], 'POS')]",
       "item broken , seller no reply####[([0], [1], 'NEG')]",
       "ok la , normal####[([0], [1], 'NEU')]",
       "good price but late####[([0], [1], 'POS'), ([3], [4], 'NEG')]"]
for split, n in (("train", 60), ("validation", 12), ("test", 12)):
    with open(os.path.join(kdir, f"{split}.txt"), "w") as f:
        for i in range(n):
            f.write(tpl[i % 4].replace("good", f"good {i}{split}") + "\n")

malay = pd.DataFrame({
    "sentiment": rng.choice(["positive", "neutral", "negative"], 3000),
    "text": [f"barang sampai {i} terima kasih" for i in range(3000)],
    "source": rng.choice(["chatgpt-3.5-sentiment", "twitter-manual", "supervised-news"], 3000),
    "split": rng.choice(["train", "test"], 3000)})
malay.loc[:50, "text"] = [f"bagus banget gak nyesel {i}" for i in range(51)]
malay.loc[:50, "source"] = "twitter-manual"
mpath = os.path.join(TMP, "sentiment.jsonl"); malay.to_json(mpath, orient="records", lines=True, force_ascii=False)

zh_path = sys.argv[1] if len(sys.argv) > 1 and os.path.exists(sys.argv[1]) else None
if zh_path is None:
    zh = pd.DataFrame({"cat": "衣服", "label": rng.integers(0, 2, 500), "review": [f"质量很好 {i}" for i in range(500)]})
    zh_path = os.path.join(TMP, "zh.csv"); zh.to_csv(zh_path, index=False)

amz = pd.DataFrame({"rating": rng.integers(1, 6, 2000).astype(float), "title": "Nice serum",
                    "text": [f"Works on my skin {i}" for i in range(2000)], "asin": "B0", "timestamp": 1588687728923,
                    "helpful_vote": 0, "verified_purchase": True})
apath = os.path.join(TMP, "All_Beauty.jsonl"); amz.to_json(apath, orient="records", lines=True)
shp = pd.DataFrame({"label": rng.integers(1, 6, 2000), "text": [f"fast delivery item {i}" for i in range(2000)]})
shp.loc[0:9, "text"] = "same text"  # duplicates
shp.loc[10, "text"] = "same text"; shp.loc[0:9, "label"] = 5; shp.loc[10, "label"] = 1  # conflicting label
spath = os.path.join(TMP, "shopee.csv"); shp.to_csv(spath, index=False)

frames = {"shopee_my": sp.load_shopee_my(local_dir=kdir)}
check(len(frames["shopee_my"]) == 84 and frames["shopee_my"]["label"].isna().sum() == 21, "kensvin parsed, ties -> None")
m, counts = sp.load_malay_corpus(path=mpath, max_rows_per_label=2000, chunksize=1000)
check(not m["label_method"].str.contains("chatgpt").any(), "LLM-labelled Malay rows excluded")
check(counts["rows"].sum() == 3000, "Malay source counts cover full file")
frames["malay"] = m
frames["zh"] = sp.load_chinese_shopping(path=zh_path)
frames["amazon"] = sp.load_amazon_beauty(path=apath)
frames["shopee_kaggle"] = sp.load_shopee_kaggle(path=spath)
caps = {"amazon_2023_all_beauty": 300, "shopee_kaggle": 300, "online_shopping_10_cats": 400, "malay_combined": 300}
df, log = sp.harmonise(frames, caps)
steps = {s["step"]: s for s in log["steps"]}
check(steps["drop_conflicting_duplicate_labels"]["removed"] >= 11 and not (df["text"] == "same text").any(),
      "conflicting duplicate texts removed")
check(steps["drop_likely_indonesian_in_malay"]["removed"] > 0, "Indonesian-looking Malay rows removed")
check(df["text"].map(sp.normalise_for_dedup).is_unique, "no duplicate texts remain")
df = sp.assign_splits(df)
check(df["split"].notna().all(), "every row has a split")
k = df[df.source == "shopee_my_kensvin"]
check(set(k["split"]) <= {"train", "validation", "test"} and (k["split"] == k["orig_split"]).all(), "kensvin keeps publisher splits")
check((df.groupby("split")["id"].apply(set).pipe(lambda s: len(s["train"] & s["test"]))) == 0, "no id overlap train/test")
out = os.path.join(TMP, "out_sent")
man = sp.write_outputs(df, log, out, {"test": "mock"})
for f in ("train.csv", "validation.csv", "test.csv", "manifest.json", "DATASET_REPORT.md", "label_mapping.json", "all_harmonised.parquet"):
    check(os.path.exists(os.path.join(out, f)), f"wrote {f}")
print("  split counts:", man["split_counts"])

# gold agreement
items = pd.DataFrame({"item_id": range(40), "text": [f"t{i}" for i in range(40)]})
a = items.assign(label=rng.choice(sp.LABELS, 40)); b = a.copy(); b.loc[:7, "label"] = "neutral"
a.to_csv(os.path.join(TMP, "a.csv"), index=False); b.to_csv(os.path.join(TMP, "b.csv"), index=False)
g = sp.gold_agreement(os.path.join(TMP, "a.csv"), os.path.join(TMP, "b.csv"), out)
check(0 < g["cohens_kappa"] < 1 and g["items"] == 40, f"Cohen's kappa computed ({g['cohens_kappa']:.3f})")

# ----------------------------------------------------------------- mock sales sources
print("Sales pipeline")
dates = pd.date_range("2017-01-01", "2018-08-31", freq="D")
olist = os.path.join(TMP, "olist"); os.makedirs(olist)
n = 4000
orders = pd.DataFrame({"order_id": [f"o{i}" for i in range(n)], "customer_id": "c",
                       "order_status": rng.choice(["delivered"] * 9 + ["canceled"], n),
                       "order_purchase_timestamp": rng.choice(dates, n) + pd.Timedelta(hours=10)})
orders.to_csv(os.path.join(olist, "olist_orders_dataset.csv"), index=False)
cats = ["beleza_saude", "cama_mesa_banho", "esporte_lazer", "informatica_acessorios", "moveis_decoracao", "utilidades_domesticas"]
prods = pd.DataFrame({"product_id": [f"p{i}" for i in range(30)], "product_category_name": [cats[i % 6] for i in range(30)]})
prods.to_csv(os.path.join(olist, "olist_products_dataset.csv"), index=False)
pd.DataFrame({"product_category_name": cats, "product_category_name_english": [c + "_en" for c in cats]}).to_csv(
    os.path.join(olist, "product_category_name_translation.csv"), index=False)
items = pd.DataFrame({"order_id": orders["order_id"], "order_item_id": 1, "product_id": rng.choice(prods["product_id"], n),
                      "price": rng.uniform(10, 200, n).round(2)})
items.to_csv(os.path.join(olist, "olist_order_items_dataset.csv"), index=False)
rev = pd.DataFrame({"review_id": [f"r{i}" for i in range(n)], "order_id": orders["order_id"], "review_score": rng.integers(1, 6, n),
                    "review_comment_title": None, "review_comment_message": np.where(rng.random(n) < 0.4, "produto bom", None),
                    "review_creation_date": orders["order_purchase_timestamp"] + pd.Timedelta(days=10)})
rev.to_csv(os.path.join(olist, "olist_order_reviews_dataset.csv"), index=False)
od, rt = sl.load_olist(folder=olist)
check(od["series_id"].nunique() in (6, 7) and "olist_cat_beleza_saude" in set(od["series_id"]) and "neg_review_ratio" in od.columns,
      "olist total + top categories (incl. health & beauty) with review features")
check(od.groupby("series_id")["date"].apply(lambda s: s.diff().dropna().eq(pd.Timedelta(days=1)).all()).all(), "olist calendars complete")

retail = pd.DataFrame({"Invoice": rng.choice(["5001", "5002", "C5003"], 3000), "StockCode": rng.choice([f"S{i}" for i in range(15)], 3000),
                       "Description": "x", "Quantity": rng.integers(-2, 20, 3000),
                       "InvoiceDate": rng.choice(pd.date_range("2009-12-01", "2011-12-09", freq="h"), 3000),
                       "Price": rng.uniform(0, 5, 3000).round(2), "Customer ID": 1, "Country": "United Kingdom"})
rpath = os.path.join(TMP, "retail.csv"); retail.to_csv(rpath, index=False)
r2 = sl.load_online_retail_ii(path=rpath)
check((r2[r2["date"].dt.dayofweek == 5]["is_open"] == 0).all(), "online retail Saturdays marked closed")

ross = os.path.join(TMP, "ross"); os.makedirs(ross)
rd = pd.date_range("2013-01-01", "2015-07-31")
stores = pd.DataFrame({"Store": range(1, 21), "StoreType": list("abcd") * 5})
stores.to_csv(os.path.join(ross, "store.csv"), index=False)
rt_ = pd.DataFrame([(s, d.dayofweek + 1, d, rng.integers(3000, 9000), 500, 1, rng.integers(0, 2), "0", 0) for s in range(1, 21) for d in rd],
                   columns=["Store", "DayOfWeek", "Date", "Sales", "Customers", "Open", "Promo", "StateHoliday", "SchoolHoliday"])
rt_ = rt_[~((rt_.Store == 1) & (rt_.Date.between("2014-07-01", "2014-12-31")))]  # real-data style gap
rt_.to_csv(os.path.join(ross, "train.csv"), index=False)
rs = sl.load_rossmann(folder=ross, n_stores=8)
gap = rs[(rs.series_id == "rossmann_store_1") & rs.date.between("2014-08-01", "2014-08-31")]
check(len(rs["series_id"].unique()) == 8, "rossmann sampled 8 stores across types")
check(len(gap) == 0 or gap["y"].isna().all(), "rossmann data gap kept as NaN, not zero sales")

fav = os.path.join(TMP, "fav"); os.makedirs(fav)
fd = pd.date_range("2013-01-01", "2017-08-15")
ft = pd.DataFrame([(0, d, s, f, float(rng.integers(0, 50)), int(rng.integers(0, 3))) for d in fd for s in (1, 44, 3, 9) for f in ("BEAUTY", "PERSONAL CARE", "AUTOMOTIVE")],
                  columns=["id", "date", "store_nbr", "family", "sales", "onpromotion"])
ft.to_csv(os.path.join(fav, "train.csv"), index=False)
pd.DataFrame({"date": ["2016-12-25", "2017-01-01"], "type": "Holiday", "locale": "National", "locale_name": "Ecuador",
              "description": "x", "transferred": [False, False]}).to_csv(os.path.join(fav, "holidays_events.csv"), index=False)
pd.DataFrame({"date": fd, "dcoilwtico": 50.0}).to_csv(os.path.join(fav, "oil.csv"), index=False)
fv = sl.load_favorita(folder=fav)
check(fv["series_id"].nunique() == 6 and fv["holiday"].sum() > 0, "favorita filtered to 3 stores x 2 families with holidays")

m5 = os.path.join(TMP, "m5"); os.makedirs(m5)
nd = 400
cal = pd.DataFrame({"date": pd.date_range("2011-01-29", periods=nd), "wm_yr_wk": [11101 + i // 7 for i in range(nd)],
                    "d": [f"d_{i+1}" for i in range(nd)], "event_name_1": None, "event_type_1": None, "snap_CA": rng.integers(0, 2, nd)})
cal.loc[10, "event_name_1"] = "SuperBowl"
cal.to_csv(os.path.join(m5, "calendar.csv"), index=False)
sales = pd.DataFrame(rng.poisson(0.4, (60, nd)), columns=cal["d"])
sales.insert(0, "item_id", [f"HOBBIES_1_{i:03d}" for i in range(60)]); sales.insert(1, "store_id", ["CA_1"] * 40 + ["TX_1"] * 20)
sales.iloc[:5, 2:52] = 0  # items not yet listed
sales.to_csv(os.path.join(m5, "sales_train_evaluation.csv"), index=False)
pr = pd.DataFrame([("CA_1", it, wk, 2.5) for it in sales.item_id for wk in cal.wm_yr_wk.unique()], columns=["store_id", "item_id", "wm_yr_wk", "sell_price"])
pr.to_csv(os.path.join(m5, "sell_prices.csv"), index=False)
mm = sl.load_m5(folder=m5, n_items=20)
check(mm["series_id"].nunique() == 21 and mm["price"].notna().any(), "m5 20 items + store total, prices joined")
check(mm.groupby("series_id").apply(lambda g: g.sort_values("date")["y"].iloc[0] > 0).all(), "m5 leading zeros trimmed")

allsales = pd.concat([od, r2, rs, fv, mm], ignore_index=True)
allsales, folds = sl.time_splits(allsales)
check(all(allsales[allsales.split == "test"].groupby("dataset")["date"].min() > allsales[allsales.split == "train"].groupby("dataset")["date"].max()), "test strictly after train for every dataset")
out2 = os.path.join(TMP, "out_sales")
man2 = sl.write_outputs(allsales, folds, out2, {"test": "mock"}, review_text=rt)
for f in ("sales_daily_long.parquet", "prophet_ready.csv", "folds.json", "series_profile.csv", "DATASET_REPORT.md", "olist_review_text_for_sentiment.csv"):
    check(os.path.exists(os.path.join(out2, f)), f"wrote {f}")
print("  datasets:", man2["datasets"])
print("\nALL TESTS PASSED")
