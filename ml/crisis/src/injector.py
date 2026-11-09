"""
Crisis injector — builds synthetic (clearly labelled) daily series with a
KNOWN injection start day, for evaluating Scheme A vs Scheme B fairly on
identical cases. Also builds "ordinary volume spike" negative-control
scenarios (no real sentiment crisis) to measure each scheme's false-alarm
rate.

Reproduces the master prompt's own named scenario: complaints start in
casual Malay on TikTok, THEN Mandarin marketplace reviews, THEN English —
a staggered multilingual cascade, not a simultaneous same-day spike across
languages. The text below is hand-written, clearly synthetic sample
content (same convention as src/services/dataPipelineService.js's
FIXTURE_REVIEW_POSTS) — never scraped, never claimed to be real customer
data.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import date, timedelta

# Hand-written, clearly synthetic complaint text per language/platform —
# the master prompt's own "leaking bottle" beverage scenario.
CASCADE_POSTS = {
    0: [  # day the cascade starts: casual Malay, TikTok
        ("tiktok", "ms", "botol minuman ni bocor lah, baru buka terus tumpah kat beg saya 😡"),
        ("tiktok", "ms", "yg kena botol leaking jer ke sy sorang? teruk betul packaging kali ni"),
    ],
    1: [  # +1 day: Mandarin, marketplace reviews
        ("shopee", "zh", "瓶子漏了，打开袋子全湿了，质量太差"),
        ("shopee", "zh", "收到的时候瓶盖已经松了，饮料洒了一半"),
    ],
    2: [  # +2 days: English, broader pickup
        ("x", "en", "got a leaking bottle from this brand again, second time this month, not buying again"),
        ("x", "en", "if you're seeing leaking bottle complaints too reply here, might be a batch issue"),
    ],
}

DEFAULT_SEED = 42


@dataclass
class InjectedScenario:
    kind: str  # 'crisis' | 'spike_only'
    start_index: int  # index into daily_series where the injection begins
    sales_drop_index: int | None  # index of first visible sales drop, None if no real crisis
    daily_series: list[dict] = field(default_factory=list)  # [{date, negative_ratio, mention_volume, avg_rating}]
    sales_series: list[float] = field(default_factory=list)
    posts: list[dict] = field(default_factory=list)  # [{day_offset, platform, language, text}] — cascade evidence


def _baseline_day(rng: random.Random, day_index: int, start: date) -> dict:
    return {
        "date": (start + timedelta(days=day_index)).isoformat(),
        "negative_ratio": max(0.0, min(1.0, rng.gauss(0.15, 0.04))),
        "mention_volume": max(1, round(rng.gauss(12, 3))),
        "avg_rating": max(1.0, min(5.0, rng.gauss(4.2, 0.15))),
    }


def build_crisis_scenario(seed: int = DEFAULT_SEED, total_days: int = 45, crisis_start: int = 30, sales_lag_days: int = 3) -> InjectedScenario:
    """A real multilingual-cascade crisis: negative share and volume climb
    over ~5 days from `crisis_start`, rating drops, and a correlated sales
    dip begins `sales_lag_days` AFTER the first complaint — reflecting that
    customers seeing complaints takes a few days to show up as fewer
    orders, not an instant effect."""
    rng = random.Random(seed)
    start = date(2026, 1, 1)
    series = [_baseline_day(rng, i, start) for i in range(total_days)]
    sales = [max(0.0, rng.gauss(500, 40)) for _ in range(total_days)]

    posts = []
    for day_offset, entries in CASCADE_POSTS.items():
        for platform, language, text in entries:
            posts.append({"day_offset": day_offset, "platform": platform, "language": language, "text": text})

    ramp_days = 5
    for offset in range(ramp_days):
        idx = crisis_start + offset
        if idx >= total_days:
            break
        progress = (offset + 1) / ramp_days
        series[idx]["negative_ratio"] = min(0.9, 0.15 + 0.55 * progress + rng.gauss(0, 0.02))
        series[idx]["mention_volume"] = round(12 + (12 * 2.8) * progress + rng.gauss(0, 2))
        series[idx]["avg_rating"] = max(1.0, 4.2 - 1.3 * progress + rng.gauss(0, 0.05))

    sales_drop_index = crisis_start + sales_lag_days
    if sales_drop_index < total_days:
        for offset in range(sales_drop_index, total_days):
            decay = min(1.0, (offset - sales_drop_index + 1) / 5)
            sales[offset] = max(0.0, sales[offset] * (1 - 0.5 * decay))

    return InjectedScenario(
        kind="crisis",
        start_index=crisis_start,
        sales_drop_index=sales_drop_index if sales_drop_index < total_days else None,
        daily_series=series,
        sales_series=sales,
        posts=posts,
    )


def build_spike_only_scenario(seed: int = DEFAULT_SEED, total_days: int = 45, spike_start: int = 30) -> InjectedScenario:
    """A real negative control: an ordinary volume spike (e.g. a viral but
    NEUTRAL-to-POSITIVE moment) with NO rise in negative share and NO
    rating drop and NO sales impact — the case Scheme B's secondary
    classifier exists specifically to not mistake for a crisis."""
    rng = random.Random(seed + 1000)
    start = date(2026, 1, 1)
    series = [_baseline_day(rng, i, start) for i in range(total_days)]
    sales = [max(0.0, rng.gauss(500, 40)) for _ in range(total_days)]

    ramp_days = 5
    for offset in range(ramp_days):
        idx = spike_start + offset
        if idx >= total_days:
            break
        progress = (offset + 1) / ramp_days
        series[idx]["mention_volume"] = round(12 + (12 * 3.0) * progress + rng.gauss(0, 2))
        # Negative ratio stays at/below baseline on purpose - volume climbs, sentiment does not sour.
        series[idx]["negative_ratio"] = max(0.0, min(0.2, rng.gauss(0.12, 0.03)))
        series[idx]["avg_rating"] = max(1.0, min(5.0, rng.gauss(4.25, 0.1)))

    return InjectedScenario(
        kind="spike_only",
        start_index=spike_start,
        sales_drop_index=None,
        daily_series=series,
        sales_series=sales,
        posts=[],
    )


def verify_cascade_is_staggered(scenario: InjectedScenario) -> bool:
    """A real check (used by the test suite) that the cascade is genuinely
    staggered by language/platform over distinct days, not a same-day
    burst across languages — the whole point of the named scenario."""
    offsets_by_language = {}
    for post in scenario.posts:
        offsets_by_language.setdefault(post["language"], set()).add(post["day_offset"])
    if len(offsets_by_language) < 2:
        return False
    all_single_day_offsets = [next(iter(offsets)) for offsets in offsets_by_language.values() if len(offsets) == 1]
    return len(set(all_single_day_offsets)) == len(offsets_by_language)
