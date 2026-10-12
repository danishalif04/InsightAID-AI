"""INSIGHTAID AI - Sentiment training data preparation.

Downloads five public sentiment sources, maps them to one 3-class schema
(negative / neutral / positive), cleans lightly for transformer models,
removes duplicates and conflicting labels BEFORE splitting (no leakage),
and writes stratified train / validation / test files.

Every row keeps its provenance: source, original_label, label_method.
"""
from __future__ import annotations

import ast
import glob
import hashlib
import html
import json
import os
import re
from datetime import datetime, timezone

import numpy as np
import pandas as pd

LABELS = ["negative", "neutral", "positive"]
LABEL2ID = {l: i for i, l in enumerate(LABELS)}
STD_COLS = ["text", "label", "language", "source", "original_label", "label_method", "orig_split", "domain"]

# --------------------------------------------------------------------------- text cleaning
URL_RE = re.compile(r"(https?://\S+|www\.\S+)", re.I)
MENTION_RE = re.compile(r"(?<!\w)@\w+")
WS_RE = re.compile(r"\s+")


def clean_text(s) -> str:
    """Light cleaning suitable for XLM-R. Keeps emojis, repeated letters,
    hashtags and casing (all carry sentiment). Replaces URLs/mentions."""
    if not isinstance(s, str):
        return ""
    s = html.unescape(s)
    s = URL_RE.sub(" [URL] ", s)
    s = MENTION_RE.sub(" @user ", s)
    s = s.replace("\u200b", " ")
    return WS_RE.sub(" ", s).strip()


def normalise_for_dedup(s: str) -> str:
    return WS_RE.sub(" ", re.sub(r"[^\w\s]", "", s.lower())).strip()


# --------------------------------------------------------------------------- label mapping
def rating_to_label(r):
    """Weak label from a 1-5 star rating (FYP2.md Section 37)."""
    try:
        r = float(r)
    except (TypeError, ValueError):
        return None
    if r in (1, 2):
        return "negative"
    if r == 3:
        return "neutral"
    if r in (4, 5):
        return "positive"
    return None


ASTE_MAP = {"POS": "positive", "NEG": "negative", "NEU": "neutral"}


def aste_to_label(triplets: str):
    """kensvin/shopee-malaysia-reviews stores aspect-level triplets like
    [([0],[2],'POS'), ([8,9],[7],'NEG')]. Sentence label = majority polarity.
    Ties are returned as None and dropped (documented in the report)."""
    try:
        items = ast.literal_eval(triplets)
        pols = [ASTE_MAP.get(t[2]) for t in items if len(t) >= 3]
    except Exception:
        return None
    pols = [p for p in pols if p]
    if not pols:
        return None
    counts = pd.Series(pols).value_counts()
    if len(counts) > 1 and counts.iloc[0] == counts.iloc[1]:
        return None
    return counts.index[0]


INDONESIAN_MARKERS = {"aja", "gak", "nggak", "ngga", "enggak", "banget", "dong", "doang", "sih",
                      "udah", "gimana", "kok", "deh", "nih", "kalo", "bikin", "kayak", "gue",
                      "lo", "bener", "jempol", "pengen", "ama", "gitu"}


def looks_indonesian(text: str, min_hits: int = 2) -> bool:
    """Heuristic only: flags text with >= min_hits Indonesian-specific words.
    Malay and Indonesian overlap heavily, so this is conservative."""
    toks = set(re.findall(r"[a-z]+", text.lower()))
    return len(toks & INDONESIAN_MARKERS) >= min_hits


def sample_per_group(df: pd.DataFrame, col: str, n: int, seed: int) -> pd.DataFrame:
    """Random sample of at most n rows per value of col (keeps all columns)."""
    parts = [g.sample(min(len(g), n), random_state=seed) for _, g in df.groupby(col)]
    return pd.concat(parts) if parts else df.iloc[0:0]


def _std(df: pd.DataFrame, **const) -> pd.DataFrame:
    for k, v in const.items():
        df[k] = v
    for c in STD_COLS:
        if c not in df.columns:
            df[c] = None
    return df[STD_COLS].copy()


def _find_col(df, candidates):
    low = {c.lower(): c for c in df.columns}
    for c in candidates:
        if c in low:
            return low[c]
    return None


# --------------------------------------------------------------------------- loaders
def load_shopee_my(local_dir: str | None = None) -> pd.DataFrame:
    """Source 1: kensvin/shopee-malaysia-reviews (MIT). ~1.06k rows, text in English
    (Malaysian Shopee reviews), format 'sentence####[triplets]'. Keeps its own splits."""
    frames = []
    if local_dir:
        for f in glob.glob(os.path.join(local_dir, "**", "*.txt"), recursive=True):
            split = "validation" if "val" in os.path.basename(f).lower() else (
                "test" if "test" in os.path.basename(f).lower() else "train")
            with open(f, encoding="utf-8") as fh:
                frames.append(pd.DataFrame({"raw": [l.rstrip("\n") for l in fh if l.strip()], "orig_split": split}))
    else:
        from datasets import load_dataset
        ds = load_dataset("kensvin/shopee-malaysia-reviews")
        for split in ds:
            frames.append(pd.DataFrame({"raw": ds[split]["text"], "orig_split": split}))
    df = pd.concat(frames, ignore_index=True)
    parts = df["raw"].str.split("####", n=1, expand=True)
    df["text"] = parts[0].str.strip()
    df["original_label"] = parts[1] if parts.shape[1] > 1 else None
    df["label"] = df["original_label"].map(lambda x: aste_to_label(x) if isinstance(x, str) else None)
    df["orig_split"] = df["orig_split"].replace({"valid": "validation", "val": "validation"})
    return _std(df, language="en", source="shopee_my_kensvin", label_method="aste_majority_human",
                domain="ecommerce_my")


def load_malay_corpus(path: str | None = None, exclude_llm_labelled: bool = True,
                      max_rows_per_label: int = 15000, seed: int = 42,
                      chunksize: int = 200_000) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Source 2: aisyahhrazak/combined-malay-sentiment (sentiment.jsonl, ~3.26M rows,
    columns: sentiment, text, source, split), combined from mesolitica/malaysian-dataset.
    Streams the file in chunks and samples per label. Returns (data, source_counts)."""
    if path is None:
        from huggingface_hub import hf_hub_download
        path = hf_hub_download("aisyahhrazak/combined-malay-sentiment", "sentiment.jsonl", repo_type="dataset")
    rng = np.random.default_rng(seed)
    keep, src_counts = [], []
    for chunk in pd.read_json(path, lines=True, chunksize=chunksize):
        chunk.columns = [c.lower() for c in chunk.columns]
        src_counts.append(chunk.groupby(["source", "sentiment"]).size())
        if exclude_llm_labelled:
            llm = chunk["source"].astype(str).str.contains("gpt|chatgpt|llm|synthetic|mistral|llama", case=False)
            chunk = chunk[~llm]
        chunk = chunk[chunk["sentiment"].astype(str).str.lower().isin(LABELS)]
        # bound memory: keep at most max_rows_per_label random rows per label from each chunk
        if len(chunk):
            chunk = chunk.assign(_lab=chunk["sentiment"].astype(str).str.lower())
            keep.append(sample_per_group(chunk, "_lab", max_rows_per_label, int(rng.integers(1e9))))
    counts = pd.concat(src_counts).groupby(level=[0, 1]).sum().rename("rows").reset_index()
    if not keep:
        return pd.DataFrame(columns=STD_COLS), counts
    df = pd.concat(keep, ignore_index=True)
    df["label"] = df["sentiment"].str.lower()
    df = sample_per_group(df, "label", max_rows_per_label, seed)
    df["original_label"] = df["sentiment"]
    df["orig_split"] = df.get("split")
    df["label_method"] = "source_" + df["source"].astype(str)
    out = _std(df, language="ms", source="malay_combined", domain="social_general_my")
    out["label_method"] = df["label_method"].values
    return out.reset_index(drop=True), counts


def load_chinese_shopping(path: str | None = None) -> pd.DataFrame:
    """Source 3: SophonPlus online_shopping_10_cats (cat, label 0/1, review). Binary."""
    if path is None:
        import io, urllib.request, zipfile
        url = ("https://github.com/SophonPlus/ChineseNlpCorpus/raw/master/datasets/"
               "online_shopping_10_cats/online_shopping_10_cats.zip")
        with urllib.request.urlopen(url) as r:
            z = zipfile.ZipFile(io.BytesIO(r.read()))
        name = [n for n in z.namelist() if n.endswith(".csv")][0]
        df = pd.read_csv(z.open(name))
    else:
        df = pd.read_csv(path)
    df = df.rename(columns={"review": "text"})
    df["original_label"] = df["label"]
    df["label"] = df["label"].map({0: "negative", 1: "positive"})
    df["domain"] = "ecommerce_cn_" + df["cat"].astype(str)
    return _std(df, language="zh", source="online_shopping_10_cats", label_method="binary_original")


def load_amazon_beauty(path: str | None = None, max_rows: int | None = 400_000) -> pd.DataFrame:
    """Source 4: McAuley-Lab/Amazon-Reviews-2023, All_Beauty raw reviews (jsonl:
    rating, title, text, timestamp, verified_purchase, ...). Rating -> weak label."""
    if path is None:
        try:
            from huggingface_hub import hf_hub_download
            path = hf_hub_download("McAuley-Lab/Amazon-Reviews-2023",
                                   "raw/review_categories/All_Beauty.jsonl", repo_type="dataset")
        except Exception as e:
            raise RuntimeError(
                "Could not download All_Beauty.jsonl from Hugging Face. Download it manually from "
                "https://amazon-reviews-2023.github.io/ and pass path=... ") from e
    df = pd.read_json(path, lines=True, nrows=max_rows)
    df["text"] = (df.get("title", "").fillna("").astype(str) + ". " + df["text"].fillna("").astype(str)).str.strip(". ")
    df["original_label"] = df["rating"]
    df["label"] = df["rating"].map(rating_to_label)
    return _std(df, language="en", source="amazon_2023_all_beauty", label_method="rating_weak",
                domain="ecommerce_beauty")


def load_shopee_kaggle(path: str | None = None, dataset_slug: str = "shymammoth/shopee-reviews") -> pd.DataFrame:
    """Source 5: Shopee reviews on Kaggle (default slug shymammoth/shopee-reviews,
    rating 1-5 + review text). Columns are auto-detected so other Shopee
    review CSVs also work."""
    if path is None:
        import kagglehub
        folder = kagglehub.dataset_download(dataset_slug)
        csvs = sorted(glob.glob(os.path.join(folder, "**", "*.csv"), recursive=True), key=os.path.getsize)
        if not csvs:
            raise FileNotFoundError(f"No CSV found in {folder}")
        path = csvs[-1]
    df = pd.read_csv(path)
    tcol = _find_col(df, ["text", "review", "comment", "content", "review_text"])
    lcol = _find_col(df, ["label", "rating", "score", "stars", "star"])
    if not tcol or not lcol:
        raise ValueError(f"Cannot detect text/rating columns in {list(df.columns)}")
    df = df.rename(columns={tcol: "text"})
    df["original_label"] = df[lcol]
    df["label"] = df[lcol].map(rating_to_label)
    return _std(df, language="en", source="shopee_kaggle", label_method="rating_weak", domain="ecommerce_sea")


# --------------------------------------------------------------------------- harmonise
def harmonise(frames: dict[str, pd.DataFrame], caps_per_label: dict[str, int], seed: int = 42,
              min_chars: int = 3, max_chars: int = 2000, drop_indonesian: bool = True) -> tuple[pd.DataFrame, dict]:
    """Concatenate, clean, filter, de-duplicate across ALL sources (before splitting),
    drop conflicting labels, cap per source per label. Returns (df, log)."""
    log = {"steps": []}

    def step(name, before, after):
        log["steps"].append({"step": name, "rows_before": int(before), "rows_after": int(after),
                             "removed": int(before - after)})

    df = pd.concat([f for f in frames.values() if f is not None and len(f)], ignore_index=True)
    log["loaded_per_source"] = df["source"].value_counts().to_dict()
    n = len(df); df = df[df["label"].isin(LABELS)].copy(); step("drop_unmapped_labels", n, len(df))
    df["text_raw"] = df["text"]
    df["text"] = df["text"].map(clean_text)
    n = len(df); df = df[df["text"].str.len().between(min_chars, max_chars)]; step("length_filter", n, len(df))
    if drop_indonesian:
        mask = (df["language"] == "ms") & df["text"].map(looks_indonesian)
        n = len(df); df = df[~mask]; step("drop_likely_indonesian_in_malay", n, len(df))
    df["norm"] = df["text"].map(normalise_for_dedup)
    n = len(df); df = df[df["norm"].str.len() > 0]; step("drop_empty_after_norm", n, len(df))
    conflict = df.groupby("norm")["label"].nunique()
    conflict_keys = set(conflict[conflict > 1].index)
    n = len(df); df = df[~df["norm"].isin(conflict_keys)]; step("drop_conflicting_duplicate_labels", n, len(df))
    n = len(df); df = df.drop_duplicates("norm", keep="first"); step("drop_exact_duplicates", n, len(df))
    parts = []
    for (src, lab), g in df.groupby(["source", "label"]):
        cap = caps_per_label.get(src)
        parts.append(g.sample(min(len(g), cap), random_state=seed) if cap else g)
    n = len(df); df = pd.concat(parts, ignore_index=True); step("per_source_label_caps", n, len(df))
    df["label_id"] = df["label"].map(LABEL2ID)
    df["original_label"] = df["original_label"].astype(str)  # mixed types across sources
    df["id"] = [hashlib.sha1(f"{s}|{t}".encode()).hexdigest()[:16] for s, t in zip(df["source"], df["norm"])]
    return df.drop(columns=["norm"]).reset_index(drop=True), log


def assign_splits(df: pd.DataFrame, val_frac=0.1, test_frac=0.1, seed=42,
                  respect_original_splits=("shopee_my_kensvin",)) -> pd.DataFrame:
    """Stratified by source x label. Sources listed in respect_original_splits keep the
    publisher's train/validation/test split so results stay comparable."""
    from sklearn.model_selection import train_test_split
    df = df.copy()
    df["split"] = None
    for src, g in df.groupby("source"):
        if src in respect_original_splits and g["orig_split"].notna().all():
            df.loc[g.index, "split"] = g["orig_split"].replace({"valid": "validation"})
            continue
        idx = g.index.values
        strat = g["label"].values if g["label"].value_counts().min() >= 3 else None
        tr, tmp = train_test_split(idx, test_size=val_frac + test_frac, random_state=seed, stratify=strat)
        strat_tmp = df.loc[tmp, "label"].values if strat is not None else None
        try:
            va, te = train_test_split(tmp, test_size=test_frac / (val_frac + test_frac),
                                      random_state=seed, stratify=strat_tmp)
        except ValueError:
            va, te = train_test_split(tmp, test_size=test_frac / (val_frac + test_frac), random_state=seed)
        df.loc[tr, "split"], df.loc[va, "split"], df.loc[te, "split"] = "train", "validation", "test"
    return df


# --------------------------------------------------------------------------- language check (optional)
def add_language_id(df: pd.DataFrame, model_path: str | None = None) -> pd.DataFrame:
    """Optional fastText lid.176 check. Adds lid / lid_conf columns; never overwrites
    the source language. Skips quietly if fastText is unavailable."""
    try:
        import fasttext
        if model_path is None:
            import urllib.request
            model_path = "lid.176.ftz"
            if not os.path.exists(model_path):
                urllib.request.urlretrieve("https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.ftz", model_path)
        m = fasttext.load_model(model_path)
        labels, probs = m.predict([t.replace("\n", " ") for t in df["text"]], k=1)
        df = df.copy()
        df["lid"] = [l[0].replace("__label__", "") for l in labels]
        df["lid_conf"] = [float(p[0]) for p in probs]
    except Exception as e:
        print(f"[language-id skipped] {e}")
    return df


# --------------------------------------------------------------------------- outputs
def write_outputs(df: pd.DataFrame, log: dict, out_dir: str, source_meta: dict, extra: dict | None = None) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    cols = ["id", "text", "label", "label_id", "language", "source", "domain",
            "label_method", "original_label", "split"] + [c for c in ("lid", "lid_conf") if c in df.columns]
    for split in ("train", "validation", "test"):
        df.loc[df["split"] == split, cols].to_csv(os.path.join(out_dir, f"{split}.csv"), index=False, encoding="utf-8")
    test = df[df["split"] == "test"]
    os.makedirs(os.path.join(out_dir, "test_by_language"), exist_ok=True)
    for lang, g in test.groupby("language"):
        g[cols].to_csv(os.path.join(out_dir, "test_by_language", f"test_{lang}.csv"), index=False, encoding="utf-8")
    df[cols + ["text_raw"]].to_parquet(os.path.join(out_dir, "all_harmonised.parquet"), index=False)
    with open(os.path.join(out_dir, "label_mapping.json"), "w") as f:
        json.dump({"labels": LABELS, "label2id": LABEL2ID}, f, indent=2)
    digest = hashlib.sha256(pd.util.hash_pandas_object(df[["id", "label", "split"]], index=False).values.tobytes()).hexdigest()[:12]
    manifest = {"dataset_name": "insightaid_sentiment", "dataset_version": f"v{datetime.now(timezone.utc):%Y%m%d}-{digest}",
                "created_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "rows": int(len(df)), "split_counts": df["split"].value_counts().to_dict(),
                "sources": source_meta, "processing_log": log, **(extra or {})}
    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2, default=str)
    _write_report(df, manifest, os.path.join(out_dir, "DATASET_REPORT.md"))
    return manifest


def _md_table(t: pd.DataFrame) -> str:
    t = t.reset_index()
    head = "| " + " | ".join(map(str, t.columns)) + " |\n|" + "---|" * len(t.columns) + "\n"
    return head + "".join("| " + " | ".join(map(str, r)) + " |\n" for r in t.values)


def _write_report(df, manifest, path):
    lines = [f"# Sentiment Dataset Report — {manifest['dataset_version']}", "",
             f"Created (UTC): {manifest['created_at_utc']}  ", f"Total rows: {manifest['rows']:,}", "",
             "## Rows by source and label", "", _md_table(pd.crosstab(df["source"], df["label"], margins=True)), "",
             "## Rows by language and split", "", _md_table(pd.crosstab(df["language"], df["split"], margins=True)), "",
             "## Rows by label method", "", _md_table(df["label_method"].value_counts().to_frame("rows")), "",
             "## Processing steps", "", _md_table(pd.DataFrame(manifest["processing_log"]["steps"]).set_index("step")), "",
             "## Sources", ""]
    for k, v in manifest["sources"].items():
        lines.append(f"- **{k}**: {v}")
    lines += ["", "## Methodological notes", "",
              "- Ratings were converted to weak labels (1-2 negative, 3 neutral, 4-5 positive). Rating does not always equal sentiment.",
              "- online_shopping_10_cats is binary; it contributes no neutral examples.",
              "- shopee_my_kensvin labels are the majority polarity of human aspect-level annotations; ties were dropped.",
              "- De-duplication and conflicting-label removal were done across all sources before splitting, so no text appears in more than one split.",
              "- Malay rows flagged by the Indonesian keyword heuristic were removed (see processing steps).",
              "- These splits are for model development. The thesis headline result should also be reported on the hand-labelled gold test set."]
    if "lid" in df.columns:
        lines += ["", "## Language-ID check (fastText lid.176)", "",
                  _md_table(pd.crosstab(df["language"], df["lid"].where(df["lid"].isin(["en", "ms", "id", "zh"]), "other")))]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


# --------------------------------------------------------------------------- gold test set agreement
def gold_agreement(path_a: str, path_b: str, out_dir: str) -> dict:
    """Cohen's kappa between two annotators; writes disagreements for adjudication."""
    from sklearn.metrics import cohen_kappa_score, confusion_matrix
    a, b = pd.read_csv(path_a), pd.read_csv(path_b)
    m = a.merge(b, on="item_id", suffixes=("_a", "_b"))
    m = m[m["label_a"].isin(LABELS) & m["label_b"].isin(LABELS)]
    kappa = cohen_kappa_score(m["label_a"], m["label_b"], labels=LABELS)
    cm = pd.DataFrame(confusion_matrix(m["label_a"], m["label_b"], labels=LABELS), index=LABELS, columns=LABELS)
    os.makedirs(out_dir, exist_ok=True)
    text_col = "text_a" if "text_a" in m.columns else "text"
    dis = m[m["label_a"] != m["label_b"]][["item_id", text_col, "label_a", "label_b"]].rename(columns={text_col: "text"})
    dis["final_label"] = ""
    dis.to_csv(os.path.join(out_dir, "gold_disagreements_to_adjudicate.csv"), index=False)
    agreed = m[m["label_a"] == m["label_b"]][["item_id", text_col, "label_a"]].rename(columns={text_col: "text", "label_a": "final_label"})
    agreed.to_csv(os.path.join(out_dir, "gold_agreed.csv"), index=False)
    return {"items": int(len(m)), "raw_agreement": float((m["label_a"] == m["label_b"]).mean()),
            "cohens_kappa": float(kappa), "confusion_matrix": cm, "disagreements": int(len(dis))}
