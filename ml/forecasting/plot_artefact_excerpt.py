# -*- coding: utf-8 -*-
"""Appendix E - a legible excerpt of the saved forecasting artefact.

The full protocol summary is thousands of lines, almost all of it
per-day forecast points. This renders the part that the dissertation's
Objective 2 claims actually rest on: the run's configuration, every
model's error metrics under each pre-registered protocol, and the
Diebold-Mariano test for the sales-only vs sentiment-enhanced
comparison. Values are copied from the file verbatim - never rounded,
reformatted or re-derived here.
"""
import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

DEFAULT_RUN = Path("ml/forecasting/results/protocol_summary_a8b3bb637d28.json")
DEFAULT_OUT = Path("reports/figures/fig_appendix_e_artefact.png")

# Only the fields the dissertation cites; forecast_points is dropped.
ROW_FIELDS = ("model_type", "variant", "n_folds", "mae", "rmse", "mape", "mase", "is_best")

INK = "#1f2937"
KEY = "#1d4ed8"      # object keys
NUM = "#b45309"      # numbers
STR = "#15803d"      # strings
BOOL = "#7c3aed"     # true/false/null
PUNCT = "#6b7280"    # braces, brackets, commas


def reduce_summary(d):
    """Keep the configuration, the metric rows, and the DM block."""
    out = {
        "run_id": d["run_id"],
        "dataset_version": d["dataset_version"],
        "prophet_config": d["prophet_config"],
        "total_product": d["total_product"],
        "trim_ramp_up": d["trim_ramp_up"],
        "mature_start": d["mature_start"],
        "protocols": [],
    }
    for p in d["protocols"]:
        proto = p["protocol"]
        out["protocols"].append({
            "name": proto["name"],
            "horizon": proto["horizon"],
            "seasonal_period": proto["seasonal_period"],
            "rows": [{k: r[k] for k in ROW_FIELDS if k in r} for r in p["rows"]],
        })
    for c in d["sentiment_comparisons"]:
        if c.get("protocol") == "daily_h7" and c.get("series") == "total":
            out["diebold_mariano__daily_h7_total"] = c["diebold_mariano"]
            break
    return out


def layout(reduced):
    """Pretty-print, but keep each metric row on ONE line.

    json.dumps(indent=2) explodes 15 metric rows into 135 lines, which no
    longer fits a page at a legible font size. Each row is one record, so
    one line per row is both shorter and easier to compare down a column.
    """
    out = ["{"]
    for key in ("run_id", "dataset_version", "total_product",
                "trim_ramp_up", "mature_start"):
        out.append('  "%s": %s,' % (key, json.dumps(reduced[key])))
    out.append('  "prophet_config": {')
    cfg = list(reduced["prophet_config"].items())
    for i, (k, v) in enumerate(cfg):
        out.append('    "%s": %s%s' % (k, json.dumps(v), "" if i == len(cfg) - 1 else ","))
    out.append("  },")
    out.append('  "protocols": [')
    for pi, pr in enumerate(reduced["protocols"]):
        out.append('    { "name": %s, "horizon": %d, "seasonal_period": %d,'
                   % (json.dumps(pr["name"]), pr["horizon"], pr["seasonal_period"]))
        out.append('      "rows": [')
        for ri, r in enumerate(pr["rows"]):
            # Split each record across two lines: identity, then metrics.
            # One line per row is ~170 characters, which is only legible on a
            # landscape page; wrapping keeps the figure inside an A4 text
            # block at a readable font size.
            ident = ", ".join('"%s": %s' % (k, json.dumps(r[k]))
                              for k in ("model_type", "variant", "n_folds") if k in r)
            metrics = ", ".join('"%s": %s' % (k, json.dumps(r[k]))
                                for k in ("mae", "rmse", "mape", "mase", "is_best") if k in r)
            out.append("        {%s," % ident)
            out.append("          %s}%s" % (metrics, "" if ri == len(pr["rows"]) - 1 else ","))
        out.append("      ] }%s" % ("" if pi == len(reduced["protocols"]) - 1 else ","))
    out.append("  ],")
    dm = reduced["diebold_mariano__daily_h7_total"]
    out.append('  "diebold_mariano__daily_h7_total": {')
    keys = [k for k in dm if k != "interpretation"]
    for i, k in enumerate(keys):
        out.append('    "%s": %s%s' % (k, json.dumps(dm[k]),
                                       "" if i == len(keys) - 1 else ","))
    out.append("  }")
    out.append("}")
    return out


def tokenize(line):
    """Split one JSON line into (text, colour) spans for syntax colouring.

    Deliberately simple: the input is machine-generated json.dumps output,
    so a key is always a quoted string immediately followed by a colon.
    """
    spans = []
    i = 0
    n = len(line)
    while i < n:
        ch = line[i]
        if ch == '"':
            j = i + 1
            while j < n and line[j] != '"':
                j += 1
            text = line[i:j + 1]
            rest = line[j + 1:].lstrip()
            spans.append((text, KEY if rest.startswith(":") else STR))
            i = j + 1
        elif ch.isdigit() or (ch == "-" and i + 1 < n and line[i + 1].isdigit()):
            j = i + 1
            while j < n and (line[j].isdigit() or line[j] in ".eE+-"):
                j += 1
            spans.append((line[i:j], NUM))
            i = j
        elif line.startswith("true", i) or line.startswith("false", i) or line.startswith("null", i):
            word = "true" if line.startswith("true", i) else ("false" if line.startswith("false", i) else "null")
            spans.append((word, BOOL))
            i += len(word)
        elif ch in "{}[],:":
            spans.append((ch, PUNCT))
            i += 1
        else:
            spans.append((ch, INK))
            i += 1
    return spans


def render(lines, out_path, font_size=5.6, line_height=0.0098):
    width = 8.0
    height = 0.55 + len(lines) * line_height * 18.0
    fig = plt.figure(figsize=(width, height), dpi=300)
    fig.patch.set_facecolor("white")

    char_w = font_size * 0.60 / 72.0 / width  # monospace advance, in fig fraction
    x0, y0 = 0.045, 0.985
    dy = line_height

    for row, line in enumerate(lines):
        y = y0 - row * dy
        # Line number gutter, so the figure can be referred to precisely.
        fig.text(0.030, y, "%3d" % (row + 1), fontsize=font_size - 0.6,
                 family="monospace", color="#9ca3af", ha="right", va="top")
        x = x0
        for text, colour in tokenize(line):
            fig.text(x, y, text, fontsize=font_size, family="monospace",
                     color=colour, ha="left", va="top")
            x += len(text) * char_w

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, bbox_inches="tight", facecolor="white", pad_inches=0.12)
    plt.close(fig)
    return width, height


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--run-file", default=str(DEFAULT_RUN))
    p.add_argument("--out", default=str(DEFAULT_OUT))
    args = p.parse_args()

    full = json.loads(Path(args.run_file).read_text(encoding="utf-8"))
    reduced = reduce_summary(full)
    lines = layout(reduced)

    w, h = render(lines, args.out)

    print("saved %s" % args.out)
    print("source       : %s" % args.run_file)
    print("figure size  : %.1f x %.1f in @ 300 dpi" % (w, h))
    print("lines        : %d   longest line: %d chars"
          % (len(lines), max(len(x) for x in lines)))
    print("")
    print("kept  : run config, %d protocols x %d model rows, 1 DM block"
          % (len(reduced["protocols"]),
             len(reduced["protocols"][0]["rows"])))
    print("        protocols = %s"
          % ", ".join(pr["name"] for pr in reduced["protocols"]))
    print("dropped: forecast_points, per_series, series_winner_counts,")
    print("         mean_metrics_across_series, 7 further DM comparisons")
    print("")
    print("spot-check against the dissertation (daily_h7, best row):")
    for pr in reduced["protocols"]:
        best = [r for r in pr["rows"] if r.get("is_best")]
        if best:
            b = best[0]
            print("  %-10s -> %s:%s  MAPE %.4f  MASE %.4f  folds %d"
                  % (pr["name"], b["model_type"], b["variant"],
                     b["mape"], b["mase"], b["n_folds"]))


if __name__ == "__main__":
    main()
