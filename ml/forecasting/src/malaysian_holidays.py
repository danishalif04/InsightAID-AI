"""
Malaysian holiday/event calendar (FYP II Phase 1) — for Prophet's
`holidays` dataframe (Phase 4) and for chart annotations in the frontend
(exported to JSON, see export_to_json() / scripts/export_malaysian_holidays.py).

Per the master prompt's own rule: "Generate dates programmatically or from
a verified source per year; do not guess lunar-calendar dates." Lunar-
calendar-dependent holidays (Hari Raya Aidilfitri, Hari Raya Haji, Chinese
New Year, Deepavali, Thaipusam, Awal Muharam) are computed by the
`holidays` PyPI package (Vacanza Team's "Open World Holidays Framework",
already installed, real astronomical/official calculations, not this
project's own guess) — see https://pypi.org/project/holidays/.

Subdivision choice: Malaysia's `holidays` package requires a state
subdivision for Deepavali/Thaipusam (gazetted per-state, not federally).
This module uses Kuala Lumpur ('14') — the commercial reference point this
project's own demo businesses are located near (Klang Valley) — which
includes Deepavali and Thaipusam alongside every national public holiday.
A different state's dates would differ by a handful of state-only
holidays; the national ones (Merdeka, Malaysia Day, CNY, Hari Raya,
Christmas, Wesak, Labour Day) are identical regardless of subdivision.

What is NOT in this module, and why: school holidays are set per calendar
year by the Ministry of Education via official gazette, not computable
from any calendar-math library — no verified source for arbitrary years
was available when this was written, so they are intentionally omitted
rather than guessed. If you have the official MOE school calendar for a
given year, add it as a separate, explicitly-sourced list — do not
interpolate a plausible-looking date range.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import holidays as holidays_lib

MALAYSIA_SUBDIVISION = "14"  # Kuala Lumpur — see module docstring


@dataclass(frozen=True)
class HolidayEvent:
    date: date
    name: str
    category: str  # 'public_holiday' | 'ramadan_derived' | 'payday' | 'ecommerce_campaign'
    source: str  # where this specific date came from — never "guessed"


def get_public_holidays(years: list[int]) -> list[HolidayEvent]:
    """Real, library-computed Malaysian public holidays (national + the
    Kuala Lumpur subdivision's gazetted ones) for the given years."""
    raw = holidays_lib.Malaysia(years=years, subdiv=MALAYSIA_SUBDIVISION)
    return [
        HolidayEvent(
            date=d,
            name=name,
            category="public_holiday",
            source="holidays PyPI package (Vacanza Team), Malaysia/Kuala Lumpur",
        )
        for d, name in sorted(raw.items())
    ]


def get_ramadan_periods(years: list[int]) -> list[HolidayEvent]:
    """Approximate Ramadan start date, DERIVED from the real Hari Raya
    Puasa (Eid al-Fitr) date the `holidays` package computes — Ramadan is
    traditionally 29 or 30 days; this uses 29 as the conservative estimate
    and marks the result's precision honestly. The real start date can
    shift by a day in practice depending on official moon-sighting
    announcements, which this library (or any calendar-math tool) cannot
    predict — this is a real limitation, stated here rather than hidden."""
    raw = holidays_lib.Malaysia(years=years, subdiv=MALAYSIA_SUBDIVISION)
    eid_dates = sorted(d for d, name in raw.items() if "Hari Raya Puasa" in name and "Kedua" not in name and "Cuti" not in name and "pergantian" not in name)
    events = []
    for eid_date in eid_dates:
        start = eid_date - timedelta(days=29)
        events.append(
            HolidayEvent(
                date=start,
                name=f"Awal Ramadan (estimated, ~29 days before Hari Raya Puasa {eid_date.isoformat()})",
                category="ramadan_derived",
                source="Derived: Hari Raya Puasa date (verified) minus 29 days. "
                "Real start may differ by ~1 day — moon-sighting-dependent, not predictable in advance.",
            )
        )
    return events


def get_paydays(years: list[int]) -> list[HolidayEvent]:
    """The ~25th-of-the-month payday convention common in Malaysia (most
    government and many private-sector salaries) — a fixed calendar rule,
    zero lunar ambiguity."""
    events = []
    for year in years:
        for month in range(1, 13):
            events.append(
                HolidayEvent(
                    date=date(year, month, 25),
                    name="Payday (~25th, common Malaysian salary convention)",
                    category="payday",
                    source="Fixed calendar rule, not a gazetted date",
                )
            )
    return events


def get_ecommerce_campaign_days(years: list[int]) -> list[HolidayEvent]:
    """11.11 and 12.12 — fixed-date e-commerce marketplace campaign days
    (Shopee/Lazada), zero ambiguity."""
    events = []
    for year in years:
        events.append(HolidayEvent(date=date(year, 11, 11), name="11.11 Sale", category="ecommerce_campaign", source="Fixed marketplace campaign date"))
        events.append(HolidayEvent(date=date(year, 12, 12), name="12.12 Sale", category="ecommerce_campaign", source="Fixed marketplace campaign date"))
    return events


def get_all_events(years: list[int]) -> list[HolidayEvent]:
    events = [
        *get_public_holidays(years),
        *get_ramadan_periods(years),
        *get_paydays(years),
        *get_ecommerce_campaign_days(years),
    ]
    return sorted(events, key=lambda e: e.date)


def to_prophet_holidays_dataframe(years: list[int], categories: list[str] | None = None):
    """Shapes the calendar into Prophet's expected `holidays` dataframe:
    columns `holiday` and `ds` (pandas Timestamp). `categories` filters
    which event categories to include (default: all). Prophet itself
    handles any requested `lower_window`/`upper_window` separately — this
    function does not add one, since the master prompt doesn't specify a
    window and inventing one would be a guess."""
    import pandas as pd

    events = get_all_events(years)
    if categories is not None:
        events = [e for e in events if e.category in categories]
    return pd.DataFrame({"holiday": [e.name for e in events], "ds": [pd.Timestamp(e.date) for e in events]})


def export_to_json(years: list[int]) -> list[dict]:
    """JSON-serializable form for the frontend's chart annotations (see
    scripts/export_malaysian_holidays.py, which writes this to
    src/data/malaysianHolidays.json for src/utils/malaysianHolidays.js to
    import — no lunar-calendar math is duplicated in JavaScript)."""
    return [
        {"date": e.date.isoformat(), "name": e.name, "category": e.category, "source": e.source}
        for e in get_all_events(years)
    ]
