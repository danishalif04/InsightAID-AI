"""INSIGHTAID AI - Sales forecasting data preparation.

Converts five public sales datasets into ONE long daily format:

    dataset, series_id, date, y, y_unit, is_open, promo, holiday, price, is_filled

plus, for Olist only, daily review features that are observable on each date
(review_count, avg_review_score, neg_review_ratio, ...). It also writes
time-ordered train/test splits and rolling-origin folds (never random splits).
"""
from __future__ import annotations

import glob
import hashlib
import json
import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd

LONG_COLS = ["dataset", "series_id", "date", "y", "y_unit", "is_open", "promo", "holiday", "price", "is_filled"]


def _finish(df: pd.DataFrame, dataset: str, y_unit: str) -> pd.DataFrame:
    df = df.copy()
    df["dataset"], df["y_unit"] = dataset, y_unit
    for c in ("is_open", "promo", "holiday"):
        if c not in df.columns:
            df[c] = np.nan
    if "price" not in df.columns:
        df["price"] = np.nan
    if "is_filled" not in df.columns:
        df["is_filled"] = 0
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    extra = [c for c in df.columns if c not in LONG_COLS]
    return df[LONG_COLS + extra].sort_values(["series_id", "date"]).reset_index(drop=True)


def fill_calendar(df: pd.DataFrame, closed_weekdays: tuple[int, ...] = (), fill_value: float = 0.0) -> pd.DataFrame:
    """Make every series a complete daily calendar. Missing days get y=fill_value and
    is_filled=1 (use fill_value=np.nan when a gap means "no data", not "no sales").
    Weekdays in closed_weekdays (0=Mon) get is_open=0 instead of looking like zero demand."""
    out = []
    for sid, g in df.groupby("series_id"):
        g = g.set_index("date")
        idx = pd.date_range(g.index.min(), g.index.max(), freq="D")
        g = g.reindex(idx)
        filled = g["y"].isna()
        g["y"] = g["y"].fillna(fill_value)
        g["is_filled"] = filled.astype(int)
        g["series_id"] = sid
        if closed_weekdays:
            g["is_open"] = np.where(idx.dayofweek.isin(closed_weekdays), 0, g["is_open"].fillna(1))
        elif fill_value == fill_value:  # not NaN: a missing day is treated as an open day with no sales
            g["is_open"] = g["is_open"].fillna(1)
        g["promo"] = g["promo"].fillna(0)
        g["holiday"] = g["holiday"].fillna(0)
        for c in ("dataset", "y_unit"):
            g[c] = g[c].ffill().bfill()
        out.append(g.rename_axis("date").reset_index())
    return pd.concat(out, ignore_index=True)


def _kaggle_dataset(slug):
    import kagglehub
    return kagglehub.dataset_download(slug)


def _kaggle_competition(slug):
    import kagglehub
    return kagglehub.competition_download(slug)


def _f(folder, pattern):
    hits = glob.glob(os.path.join(folder, "**", pattern), recursive=True)
    if not hits:
        raise FileNotFoundError(f"{pattern} not found in {folder}")
    return hits[0]


# --------------------------------------------------------------------------- 1. Olist
def load_olist(folder: str | None = None, start="2017-01-01", end="2018-08-31",
               top_categories: int = 5, focus_category="beleza_saude"):
    """Olist (olistbr/brazilian-ecommerce). Returns (daily_long, review_text).
    Sales are by order_purchase_timestamp. Review features use review_creation_date,
    the day a review became public, so they are known on that date (no look-ahead)."""
    folder = folder or _kaggle_dataset("olistbr/brazilian-ecommerce")
    orders = pd.read_csv(_f(folder, "olist_orders_dataset.csv"), parse_dates=["order_purchase_timestamp"])
    items = pd.read_csv(_f(folder, "olist_order_items_dataset.csv"))
    products = pd.read_csv(_f(folder, "olist_products_dataset.csv"))
    reviews = pd.read_csv(_f(folder, "olist_order_reviews_dataset.csv"), parse_dates=["review_creation_date"])
    try:
        tr = pd.read_csv(_f(folder, "product_category_name_translation.csv"))
        products = products.merge(tr, on="product_category_name", how="left")
    except FileNotFoundError:
        products["product_category_name_english"] = products["product_category_name"]

    orders = orders[~orders["order_status"].isin(["canceled", "unavailable"])]
    orders["date"] = orders["order_purchase_timestamp"].dt.normalize()
    orders = orders[(orders["date"] >= start) & (orders["date"] <= end)]
    li = items.merge(orders[["order_id", "date"]], on="order_id").merge(
        products[["product_id", "product_category_name", "product_category_name_english"]], on="product_id", how="left")

    # category per order = category of its first item (for review attribution)
    order_cat = li.sort_values("order_item_id").drop_duplicates("order_id")[["order_id", "product_category_name"]]
    rv = reviews.merge(order_cat, on="order_id", how="inner")
    rv["date"] = rv["review_creation_date"].dt.normalize()
    rv = rv[(rv["date"] >= start) & (rv["date"] <= end)]

    def review_feats(r):
        g = r.groupby("date")
        return pd.DataFrame({
            "review_count": g.size(),
            "avg_review_score": g["review_score"].mean(),
            "neg_review_ratio": g["review_score"].apply(lambda s: (s <= 2).mean()),
            "pos_review_ratio": g["review_score"].apply(lambda s: (s >= 4).mean()),
            "review_text_count": g["review_comment_message"].apply(lambda s: s.notna().sum()),
        })

    def series(sub, sid, rsub):
        d = sub.groupby("date").agg(y=("price", "sum"), units=("order_item_id", "size"),
                                    orders=("order_id", "nunique")).reset_index()
        d["series_id"] = sid
        d = d.merge(review_feats(rsub).reset_index(), on="date", how="left")
        return d

    parts = [series(li, "olist_total", rv)]
    top = li["product_category_name"].value_counts().head(top_categories).index.tolist()
    if focus_category not in top:
        top = [focus_category] + top
    for cat in top:
        parts.append(series(li[li["product_category_name"] == cat], f"olist_cat_{cat}",
                            rv[rv["product_category_name"] == cat]))
    daily = pd.concat(parts, ignore_index=True)
    daily = _finish(daily, "olist", "revenue_BRL")
    daily = fill_calendar(daily)
    for c in ("units", "orders", "review_count", "review_text_count"):
        daily[c] = daily[c].fillna(0)
    review_text = rv[rv["review_comment_message"].notna()][
        ["review_id", "order_id", "date", "review_score", "product_category_name",
         "review_comment_title", "review_comment_message"]].rename(columns={"review_comment_message": "text"})
    review_text["language"] = "pt"
    return daily, review_text


# --------------------------------------------------------------------------- 2. Online Retail II
def load_online_retail_ii(path: str | None = None, top_products: int = 10, uk_only: bool = False):
    """UCI Online Retail II (2009-12 to 2011-12). Removes cancellations (Invoice
    starting with 'C'), non-positive quantity/price. Shop is closed on Saturdays."""
    if path is None:
        import io, urllib.request, zipfile
        url = "https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip"
        with urllib.request.urlopen(url) as r:
            z = zipfile.ZipFile(io.BytesIO(r.read()))
        name = [n for n in z.namelist() if n.lower().endswith(".xlsx")][0]
        path = "online_retail_II.xlsx"
        with open(path, "wb") as fh:
            fh.write(z.read(name))
    if str(path).lower().endswith(".csv"):
        df = pd.read_csv(path, encoding="unicode_escape")
    else:
        df = pd.concat(pd.read_excel(path, sheet_name=None).values(), ignore_index=True)
    df.columns = [c.strip() for c in df.columns]
    df = df[~df["Invoice"].astype(str).str.startswith("C")]
    df = df[(df["Quantity"] > 0) & (df["Price"] > 0)]
    if uk_only:
        df = df[df["Country"] == "United Kingdom"]
    df["date"] = pd.to_datetime(df["InvoiceDate"]).dt.normalize()
    df["revenue"] = df["Quantity"] * df["Price"]
    total = df.groupby("date").agg(y=("revenue", "sum")).reset_index()
    total["series_id"], total["is_open"] = "retail2_total_revenue", 1
    parts = [_finish(total, "online_retail_ii", "revenue_GBP")]
    top = df.groupby("StockCode")["Quantity"].sum().nlargest(top_products).index
    p = (df[df["StockCode"].isin(top)].groupby(["StockCode", "date"])
         .agg(y=("Quantity", "sum"), price=("Price", "median")).reset_index())
    p["series_id"] = "retail2_item_" + p["StockCode"].astype(str)
    p["is_open"] = 1
    parts.append(_finish(p.drop(columns="StockCode"), "online_retail_ii", "units"))
    out = pd.concat(parts, ignore_index=True)
    return fill_calendar(out, closed_weekdays=(5,))


# --------------------------------------------------------------------------- 3. Rossmann
def load_rossmann(folder: str | None = None, n_stores: int = 10, seed: int = 42):
    """Kaggle competition rossmann-store-sales (accept rules first). Samples stores
    across StoreType. Keeps Open, Promo, StateHoliday, SchoolHoliday."""
    folder = folder or _kaggle_competition("rossmann-store-sales")
    tr = pd.read_csv(_f(folder, "train.csv"), parse_dates=["Date"], dtype={"StateHoliday": str})
    stores = pd.read_csv(_f(folder, "store.csv"))
    rng = np.random.default_rng(seed)
    per_type = max(1, n_stores // stores["StoreType"].nunique())
    picks = []
    for _, g in stores.groupby("StoreType"):
        picks += rng.choice(g["Store"].values, size=min(per_type, len(g)), replace=False).tolist()
    tr = tr[tr["Store"].isin(picks[:n_stores])]
    d = pd.DataFrame({
        "series_id": "rossmann_store_" + tr["Store"].astype(str),
        "date": tr["Date"], "y": tr["Sales"].astype(float), "is_open": tr["Open"],
        "promo": tr["Promo"], "holiday": ((tr["StateHoliday"] != "0") | (tr["SchoolHoliday"] == 1)).astype(int),
        "customers": tr["Customers"], "state_holiday": tr["StateHoliday"], "school_holiday": tr["SchoolHoliday"],
    })
    # Some Rossmann stores have a ~6 month gap in 2014 (no data, not zero sales) -> NaN
    return fill_calendar(_finish(d, "rossmann", "revenue_EUR"), fill_value=np.nan)


# --------------------------------------------------------------------------- 4. Favorita
def load_favorita(folder: str | None = None, stores=(1, 44, 3),
                  families=("BEAUTY", "PERSONAL CARE", "GROCERY I", "BEVERAGES", "CLEANING")):
    """Kaggle competition store-sales-time-series-forecasting. Keeps selected
    stores x product families (BEAUTY and PERSONAL CARE are closest to skincare).
    Holiday = national holiday or event that was not transferred."""
    folder = folder or _kaggle_competition("store-sales-time-series-forecasting")
    tr = pd.read_csv(_f(folder, "train.csv"), parse_dates=["date"])
    hol = pd.read_csv(_f(folder, "holidays_events.csv"), parse_dates=["date"])
    tr = tr[tr["store_nbr"].isin(stores) & tr["family"].isin(families)]
    nat = hol[(hol["locale"] == "National") & (~hol["transferred"].astype(bool)) & (hol["type"] != "Work Day")]
    hol_days = set(nat["date"])
    d = pd.DataFrame({
        "series_id": "favorita_s" + tr["store_nbr"].astype(str) + "_" + tr["family"].str.replace(" ", "_"),
        "date": tr["date"], "y": tr["sales"].astype(float), "promo": tr["onpromotion"],
        "holiday": tr["date"].isin(hol_days).astype(int), "is_open": 1,
    })
    try:
        oil = pd.read_csv(_f(folder, "oil.csv"), parse_dates=["date"]).rename(columns={"dcoilwtico": "oil_price"})
        d = d.merge(oil, on="date", how="left")
        d["oil_price"] = d["oil_price"].ffill()
    except FileNotFoundError:
        pass
    return fill_calendar(_finish(d, "favorita", "units"))


# --------------------------------------------------------------------------- 5. M5
def load_m5(folder: str | None = None, store_id: str = "CA_1", n_items: int = 200, seed: int = 42):
    """Kaggle competition m5-forecasting-accuracy. Samples n_items from one store
    (intermittent item-level demand) plus the store total. Joins events, SNAP, price."""
    folder = folder or _kaggle_competition("m5-forecasting-accuracy")
    try:
        sales_path = _f(folder, "sales_train_evaluation.csv")
    except FileNotFoundError:
        sales_path = _f(folder, "sales_train_validation.csv")
    cal = pd.read_csv(_f(folder, "calendar.csv"), parse_dates=["date"])
    prices = pd.read_csv(_f(folder, "sell_prices.csv"))
    s = pd.read_csv(sales_path)
    s = s[s["store_id"] == store_id]
    dcols = [c for c in s.columns if c.startswith("d_")]
    total = s[dcols].sum().rename("y").reset_index().rename(columns={"index": "d"})
    total["item_id"] = "STORE_TOTAL"
    sample = s.sample(min(n_items, len(s)), random_state=seed)
    long = sample.melt(id_vars=["item_id"], value_vars=dcols, var_name="d", value_name="y")
    long = pd.concat([long, total], ignore_index=True)
    snap_col = f"snap_{store_id.split('_')[0]}"
    long = long.merge(cal[["d", "date", "wm_yr_wk", "event_name_1", "event_type_1", snap_col]], on="d", how="left")
    p = prices[prices["store_id"] == store_id][["item_id", "wm_yr_wk", "sell_price"]]
    long = long.merge(p, on=["item_id", "wm_yr_wk"], how="left")
    d = pd.DataFrame({
        "series_id": "m5_" + store_id + "_" + long["item_id"], "date": long["date"], "y": long["y"].astype(float),
        "holiday": long["event_name_1"].notna().astype(int), "promo": long[snap_col], "price": long["sell_price"],
        "is_open": 1, "event_name": long["event_name_1"], "event_type": long["event_type_1"],
    })
    out = _finish(d, "m5", "units")
    # items have leading zeros before their first sale (not yet listed): trim them
    first = out[out["y"] > 0].groupby("series_id")["date"].min()
    out = out.merge(first.rename("first_sale"), on="series_id")
    out = out[out["date"] >= out["first_sale"]].drop(columns="first_sale")
    return out.reset_index(drop=True)


# --------------------------------------------------------------------------- splits & folds
def time_splits(df: pd.DataFrame, test_days: int = 90, n_folds: int = 3, horizon: int = 30) -> tuple[pd.DataFrame, dict]:
    """Last `test_days` per dataset = test. Rolling-origin folds are defined inside the
    training period: each fold trains on everything before its cutoff and validates on
    the next `horizon` days."""
    df = df.copy()
    folds = {}
    df["split"] = "train"
    for ds, g in df.groupby("dataset"):
        end = g["date"].max()
        test_start = end - pd.Timedelta(days=test_days - 1)
        df.loc[(df["dataset"] == ds) & (df["date"] >= test_start), "split"] = "test"
        cutoffs = [test_start - pd.Timedelta(days=horizon * (k + 1)) for k in range(n_folds)][::-1]
        folds[ds] = {"test_start": str(test_start.date()), "test_end": str(end.date()), "horizon_days": horizon,
                     "rolling_origin_folds": [{"fold": i + 1, "train_end": str((c - pd.Timedelta(days=1)).date()),
                                               "valid_start": str(c.date()),
                                               "valid_end": str((c + pd.Timedelta(days=horizon - 1)).date())}
                                              for i, c in enumerate(cutoffs)]}
    return df, folds


def series_profile(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby(["dataset", "series_id"])
    return pd.DataFrame({
        "start": g["date"].min().dt.date, "end": g["date"].max().dt.date, "days": g.size(),
        "mean_y": g["y"].mean().round(2), "zero_share": g["y"].apply(lambda s: (s == 0).mean()).round(3),
        "filled_share": g["is_filled"].mean().round(3),
    }).reset_index()


def seasonal_naive_check(df: pd.DataFrame, season: int = 7) -> pd.DataFrame:
    """DATA SANITY CHECK ONLY (not a model result): seasonal-naive MAE on the test window.
    Large or NaN values reveal broken series before you spend time training."""
    rows = []
    for (ds, sid), g in df.sort_values("date").groupby(["dataset", "series_id"]):
        g = g.dropna(subset=["y"]).reset_index(drop=True)
        g["pred"] = g["y"].shift(season)
        t = g[g["split"] == "test"].dropna(subset=["pred"])
        if len(t) == 0:
            continue
        nz = t[t["y"] != 0]
        rows.append({"dataset": ds, "series_id": sid, "test_days": len(t),
                     "snaive_MAE": round(float((t["y"] - t["pred"]).abs().mean()), 3),
                     "snaive_MAPE_nonzero_%": round(float(((nz["y"] - nz["pred"]).abs() / nz["y"]).mean() * 100), 2) if len(nz) else np.nan})
    return pd.DataFrame(rows)


def to_prophet(df: pd.DataFrame, regressors=("promo", "holiday")) -> pd.DataFrame:
    cols = ["dataset", "series_id", "split", "date", "y"] + [r for r in regressors if r in df.columns]
    return df[cols].rename(columns={"date": "ds"})


def write_outputs(df: pd.DataFrame, folds: dict, out_dir: str, source_meta: dict, review_text: pd.DataFrame | None = None):
    os.makedirs(out_dir, exist_ok=True)
    df.to_parquet(os.path.join(out_dir, "sales_daily_long.parquet"), index=False)
    for ds, g in df.groupby("dataset"):
        g.dropna(axis=1, how="all").to_csv(os.path.join(out_dir, f"{ds}_daily.csv"), index=False)
    to_prophet(df).to_csv(os.path.join(out_dir, "prophet_ready.csv"), index=False)
    if review_text is not None and len(review_text):
        review_text.to_csv(os.path.join(out_dir, "olist_review_text_for_sentiment.csv"), index=False)
    prof = series_profile(df)
    prof.to_csv(os.path.join(out_dir, "series_profile.csv"), index=False)
    check = seasonal_naive_check(df)
    check.to_csv(os.path.join(out_dir, "sanity_check_seasonal_naive.csv"), index=False)
    with open(os.path.join(out_dir, "folds.json"), "w") as f:
        json.dump(folds, f, indent=2)
    digest = hashlib.sha256(pd.util.hash_pandas_object(df[["series_id", "date", "y"]], index=False).values.tobytes()).hexdigest()[:12]
    manifest = {"dataset_name": "insightaid_sales", "dataset_version": f"v{datetime.now(timezone.utc):%Y%m%d}-{digest}",
                "created_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "rows": int(len(df)), "series": int(df["series_id"].nunique()),
                "datasets": df["dataset"].value_counts().to_dict(), "sources": source_meta, "folds": folds}
    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2, default=str)
    lines = [f"# Sales Dataset Report — {manifest['dataset_version']}", "",
             f"Created (UTC): {manifest['created_at_utc']}  ", f"Rows: {manifest['rows']:,} · Series: {manifest['series']}", "",
             "## Series profile", "", _md(prof), "",
             "## Sanity check (seasonal naive, season=7) — NOT a model result", "", _md(check) if len(check) else "_none_", "",
             "## Sources", ""] + [f"- **{k}**: {v}" for k, v in source_meta.items()] + [
             "", "## Methodological notes", "",
             "- Splits are time-ordered: the last 90 days of each dataset are the test set. Never shuffle.",
             "- Rolling-origin folds in folds.json sit inside the training period.",
             "- Days with no transactions were filled with y=0 and is_filled=1. Online Retail II Saturdays are is_open=0 (shop closed), not zero demand.",
             "- Olist review features use review_creation_date (when the review became visible), so they do not leak future information. Use lagged versions as regressors.",
             "- None of these datasets are Malaysian; state this in your limitations."]
    with open(os.path.join(out_dir, "DATASET_REPORT.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return manifest


def _md(t: pd.DataFrame) -> str:
    head = "| " + " | ".join(map(str, t.columns)) + " |\n|" + "---|" * len(t.columns) + "\n"
    return head + "".join("| " + " | ".join(map(str, r)) + " |\n" for r in t.values)
