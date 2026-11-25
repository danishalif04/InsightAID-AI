"""
Synthetic dataset for the SPARK 2026 demo: "Koperasi Siswa Maju", a FICTIONAL
campus student cooperative that runs a cafe (prepared food, perishable) and a
mini-mart (packaged goods). Everything here is synthetic. Nothing is scraped,
nothing comes from a real business, and no real person is represented.

Outputs (ml/scenarios/koperasi_siswa_maju/data/):
  items.csv        item catalogue: price, unit cost, shelf life, prep unit
  sales_daily.csv  per-item daily units sold (one row per open day per item)
  reviews.csv      multilingual customer reviews (EN, BM, Mandarin, code-mixed)

What is modelled (each documented assumption, none measured from a real shop):
  - weekly pattern (campus: weekdays busy, Saturday quiet, Sunday closed)
  - academic calendar: a mid-semester break dip and an exam-week bump
  - Malaysian public holidays (from ml/forecasting/src/malaysian_holidays.py,
    reused, not re-implemented): the koperasi is closed, so those days are
    genuinely absent, never filled with a guess
  - rain days (a random factor on cafe items)
  - one scripted "stale food" incident: a batch of nasi lemak is reported
    stale, negative reviews name the item, and demand for it dips afterwards.
    This is the test case for the Prep & Stock Planner's review flagging.
  - Gaussian demand noise

Same seed gives the same files (reproducible). Labels in reviews.csv are the
template's intended sentiment, not human annotation.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "forecasting" / "src"))
from malaysian_holidays import get_all_events  # noqa: E402 -- path set above

SHOP_NAME = "Koperasi Siswa Maju (SYNTHETIC)"
START = date(2026, 7, 1)
END = date(2026, 11, 24)
BREAK_START, BREAK_END = date(2026, 9, 12), date(2026, 9, 20)
EXAM_START, EXAM_END = date(2026, 11, 9), date(2026, 11, 20)
INCIDENT_DAY = date(2026, 10, 6)  # stale nasi lemak batch
INCIDENT_ITEM = "Nasi Lemak"

# name, name_zh, section, price RM, unit cost RM, shelf life days, base daily units
ITEMS = [
    ("Nasi Lemak", "椰浆饭", "cafe", 3.00, 1.80, 1, 55),
    ("Mee Goreng", "炒面", "cafe", 4.50, 2.60, 1, 38),
    ("Karipap", "咖喱角", "cafe", 1.00, 0.45, 1, 70),
    ("Sandwic Telur", "鸡蛋三明治", "cafe", 3.50, 2.00, 2, 30),
    ("Kuih Seri Muka", "香兰糕", "cafe", 1.50, 0.70, 1, 40),
    ("Kopi O Ais", "冰黑咖啡", "cafe", 2.50, 0.90, 1, 85),
    ("Roti Gardenia", "面包", "mart", 3.20, 2.60, 4, 26),
    ("Yogurt Minuman", "酸奶饮料", "mart", 2.50, 1.90, 10, 22),
    ("Susu Kotak", "盒装牛奶", "mart", 2.80, 2.20, 30, 34),
    ("Air Mineral", "矿泉水", "mart", 1.50, 0.90, 365, 90),
    ("Maggi Cawan", "杯面", "mart", 3.00, 2.30, 180, 28),
]
WEEKDAY_FACTOR = {0: 1.05, 1: 1.1, 2: 1.1, 3: 1.05, 4: 0.95, 5: 0.5}  # Sunday closed

REVIEW_COLUMNS = ["date", "language", "rating", "sentiment_label", "item", "text"]

# Review templates. {i} is replaced by the item name in that language.
POS = {
    "en": ["The {i} is really good today, fresh and tasty.", "Love the {i}, great value for a student.",
           "Fast service and the {i} was still warm.", "Best {i} on campus, will buy again."],
    "ms": ["{i} sedap betul hari ini, fresh!", "Harga berpatutan, {i} memang berbaloi.",
           "Layanan pantas, {i} masih panas.", "Suka {i} kat sini, mesti beli lagi."],
    "zh": ["今天的{i}很好吃，很新鲜。", "{i}价格实惠，学生也买得起。", "服务很快，{i}还是热的。"],
    "mix": ["{i} sedap gila, fresh and murah lah.", "Boleh la, the {i} still hot, thank you!",
            "Memang worth it, {i} best sangat."],
}
NEU = {
    "en": ["The {i} is okay, nothing special.", "Average {i}, queue was a bit long."],
    "ms": ["{i} biasa je, tak ada apa yang istimewa.", "{i} okey, tapi beratur agak lama."],
    "zh": ["{i}还可以，一般般。", "{i}普通，排队有点久。"],
    "mix": ["{i} okay je, biasa-biasa.", "Queue panjang, {i} so-so lah."],
}
NEG = {
    "en": ["The {i} tasted stale, not fresh at all.", "Sold out of {i} again by lunch.", "{i} is too expensive for what you get."],
    "ms": ["{i} basi, tak fresh langsung.", "{i} dah habis lagi awal tengah hari.", "{i} mahal sangat untuk kuantiti ni."],
    "zh": ["{i}不新鲜，有点馊味。", "中午{i}又卖完了。", "{i}太贵了。"],
    "mix": ["{i} basi lah, not fresh at all.", "Habis lagi, {i} always sold out by lunch."],
}
STALE_NEG = {
    "en": ["The {i} was stale today, please check the batch.", "{i} smelled off, I think it was stale."],
    "ms": ["{i} basi hari ini, tolong semak batch.", "{i} berbau, rasa macam basi."],
    "zh": ["今天的{i}不新鲜，请检查。", "{i}有异味，可能放太久了。"],
    "mix": ["{i} basi gila hari ni, please check."],
}
LANG_WEIGHTS = [("ms", 0.40), ("en", 0.35), ("zh", 0.15), ("mix", 0.10)]


@dataclass
class Config:
    seed: int = 2026


def _closed_dates() -> set[date]:
    events = get_all_events([START.year])
    return {e.date for e in events if e.category == "public_holiday"}


def _daily_units(rng: random.Random, day: date, item: tuple, rainy: bool) -> int:
    name, _, section, _, _, _, base = item
    factor = WEEKDAY_FACTOR[day.weekday()]
    if BREAK_START <= day <= BREAK_END:
        factor *= 0.35
    if EXAM_START <= day <= EXAM_END and name in ("Kopi O Ais", "Maggi Cawan"):
        factor *= 1.35
    if rainy and section == "cafe":
        factor *= 0.85 if name != "Kopi O Ais" else 0.7
    if name == INCIDENT_ITEM:
        days_after = (day - INCIDENT_DAY).days
        if 0 <= days_after <= 4:
            factor *= 0.8
    noise = 1 + rng.gauss(0, 0.1)
    return max(0, round(base * factor * noise))


def generate_sales(cfg: Config) -> list[dict]:
    rng = random.Random(cfg.seed)
    closed = _closed_dates()
    rows = []
    day = START
    while day <= END:
        open_today = day.weekday() != 6 and day not in closed
        rainy = rng.random() < 0.3  # draw every day so the seed stream is stable
        if open_today:
            for item in ITEMS:
                units = _daily_units(rng, day, item, rainy)
                rows.append({"date": day.isoformat(), "item": item[0], "units_sold": units,
                             "unit_price_RM": f"{item[3]:.2f}", "revenue_RM": f"{units * item[3]:.2f}"})
        day += timedelta(days=1)
    return rows


def _pick_language(rng: random.Random) -> str:
    r, acc = rng.random(), 0.0
    for lang, w in LANG_WEIGHTS:
        acc += w
        if r < acc:
            return lang
    return LANG_WEIGHTS[-1][0]


def generate_reviews(cfg: Config) -> list[dict]:
    rng = random.Random(cfg.seed + 7)
    closed = _closed_dates()
    zh_names = {i[0]: i[1] for i in ITEMS}
    rows = []
    day = START
    while day <= END:
        if day.weekday() != 6 and day not in closed:
            n = rng.choice([2, 3, 3, 4])
            incident_window = INCIDENT_DAY <= day <= INCIDENT_DAY + timedelta(days=2)
            for k in range(n):
                lang = _pick_language(rng)
                item = rng.choice(ITEMS)[0]
                if incident_window and k < 2:
                    item, bucket, label, rating = INCIDENT_ITEM, STALE_NEG, "negative", rng.choice([1, 1, 2])
                else:
                    roll = rng.random()
                    if roll < 0.62:
                        bucket, label, rating = POS, "positive", rng.choice([4, 5, 5])
                    elif roll < 0.82:
                        bucket, label, rating = NEU, "neutral", 3
                    else:
                        bucket, label, rating = NEG, "negative", rng.choice([1, 2])
                shown = zh_names[item] if lang == "zh" else item
                text = rng.choice(bucket[lang]).format(i=shown)
                rows.append({"date": day.isoformat(), "language": {"mix": "ms-en"}.get(lang, lang),
                             "rating": rating, "sentiment_label": label, "item": item, "text": text})
        day += timedelta(days=1)
    return rows


def write_csv(path: Path, columns: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        w.writerows(rows)


def write_items(path: Path) -> None:
    rows = [{"item": n, "item_zh": z, "section": s, "unit_price_RM": f"{p:.2f}", "unit_cost_RM": f"{c:.2f}",
             "shelf_life_days": sl, "prep_unit": "unit"} for n, z, s, p, c, sl, _ in ITEMS]
    write_csv(path, list(rows[0].keys()), rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="ml/scenarios/koperasi_siswa_maju/data")
    parser.add_argument("--seed", type=int, default=2026)
    parser.add_argument("--json", default="src/data/koperasiSiswaMaju.json")
    args = parser.parse_args()
    cfg, out = Config(seed=args.seed), Path(args.out)
    sales, reviews = generate_sales(cfg), generate_reviews(cfg)
    write_items(out / "items.csv")
    write_csv(out / "sales_daily.csv", ["date", "item", "units_sold", "unit_price_RM", "revenue_RM"], sales)
    write_csv(out / "reviews.csv", REVIEW_COLUMNS, reviews)
    # Compact copy bundled into the web app (Prep & Stock Planner sample and
    # the anonymous demo seed). Same rows as the CSVs, so the two cannot drift.
    bundle = {
        "name": SHOP_NAME,
        "synthetic": True,
        "seed": cfg.seed,
        "generator": "ml/scenarios/koperasi_siswa_maju.py",
        "items": [{"item": n, "itemZh": z, "section": s, "unitPrice": p, "unitCost": c, "shelfLifeDays": sl}
                  for n, z, s, p, c, sl, _ in ITEMS],
        "sales": [[r["date"], r["item"], r["units_sold"]] for r in sales],
        "reviews": [[r["date"], r["language"], r["rating"], r["sentiment_label"], r["item"], r["text"]] for r in reviews],
    }
    Path(args.json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.json).write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(sales)} sales rows, {len(reviews)} reviews, {len(ITEMS)} items to {out} "
          f"(SYNTHETIC, seed {cfg.seed}) -- not real data.")


if __name__ == "__main__":
    main()
