# -*- coding: utf-8 -*-
"""Figure 4.2 - confusion matrix of XLM-RoBERTa on the held-out test set.

Every count is read from the saved training-run artefact
(ml/sentiment/results/model_versions_*.json); nothing is typed by hand, so
the figure can be regenerated and checked against the run that produced it.
"""
import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

LABELS = ("Negative", "Neutral", "Positive")

DEFAULT_RUN = Path("ml/sentiment/results/model_versions_v20261020-171546.json")
DEFAULT_OUT = Path("reports/figures/fig_confusion_xlmr.png")


def load_matrix(run_file, model_type="xlmr", eval_path="original_language"):
    """Pull the one entry the figure is about, and fail loudly otherwise."""
    rows = json.loads(Path(run_file).read_text(encoding="utf-8"))
    matches = [
        r for r in rows
        if r.get("model_type") == model_type and r.get("eval_path") == eval_path
    ]
    if len(matches) != 1:
        raise SystemExit(
            "expected exactly 1 entry for %s/%s in %s, found %d"
            % (model_type, eval_path, run_file, len(matches))
        )
    entry = matches[0]
    cm = np.asarray(entry["confusion_matrix"], dtype=float)
    if cm.shape != (3, 3):
        raise SystemExit("confusion_matrix is %s, expected (3, 3)" % (cm.shape,))
    return entry, cm


def plot(cm, out_path):
    totals = cm.sum(axis=1, keepdims=True)
    # Row-normalised: share of each TRUE class that landed in each column.
    pct = np.divide(cm, totals, out=np.zeros_like(cm), where=totals > 0) * 100

    fig, ax = plt.subplots(figsize=(5.5, 4.5), dpi=300)
    im = ax.imshow(cm, cmap="Blues", vmin=0, vmax=cm.max())

    # Threshold on the colormap's own scale, so the switch to white text
    # tracks the actual fill darkness rather than a guessed count.
    dark_from = cm.max() * 0.55

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            colour = "white" if cm[i, j] >= dark_from else "#374151"
            ax.text(
                j, i - 0.10, "{:,.0f}".format(cm[i, j]),
                ha="center", va="center", fontsize=11,
                fontweight="bold", color=colour,
            )
            ax.text(
                j, i + 0.18, "{:.1f}%".format(pct[i, j]),
                ha="center", va="center", fontsize=8.5, color=colour,
            )

    ax.set_xticks(range(len(LABELS)), labels=LABELS, fontsize=9.5)
    ax.set_yticks(range(len(LABELS)), labels=LABELS, fontsize=9.5)
    ax.set_xlabel("Predicted label", fontsize=10, labelpad=8)
    ax.set_ylabel("True label", fontsize=10, labelpad=8)
    ax.tick_params(length=0)
    for side in ("top", "right", "bottom", "left"):
        ax.spines[side].set_visible(False)

    # Thin white gridlines between cells so adjacent fills stay separable.
    ax.set_xticks(np.arange(-0.5, len(LABELS), 1), minor=True)
    ax.set_yticks(np.arange(-0.5, len(LABELS), 1), minor=True)
    ax.grid(which="minor", color="white", linewidth=2)
    ax.tick_params(which="minor", length=0)

    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label("Count", fontsize=9.5)
    cbar.ax.tick_params(labelsize=8.5, length=2)
    cbar.outline.set_visible(False)

    fig.tight_layout()
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return totals.ravel(), pct


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--run-file", default=str(DEFAULT_RUN))
    p.add_argument("--model-type", default="xlmr")
    p.add_argument("--eval-path", default="original_language")
    p.add_argument("--out", default=str(DEFAULT_OUT))
    args = p.parse_args()

    entry, cm = load_matrix(args.run_file, args.model_type, args.eval_path)
    totals, pct = plot(cm, args.out)

    print("saved %s" % args.out)
    print("model      : %s (%s)" % (entry["model_name"], entry["model_version"]))
    print("eval path  : %s" % entry["eval_path"])
    print("accuracy   : %.4f   macro-F1: %.4f" % (entry["accuracy"], entry["f1"]))
    print("")
    print("row totals (true-class support):")
    for label, total in zip(LABELS, totals):
        print("  %-9s %8s" % (label, "{:,.0f}".format(total)))
    grand = int(cm.sum())
    print("  %-9s %8s" % ("TOTAL", "{:,d}".format(grand)))
    print("")
    print("test_samples recorded in the run file: %s"
          % "{:,d}".format(entry["test_samples"]))
    print("matches confusion matrix: %s"
          % ("YES" if grand == entry["test_samples"] else "NO"))
    # Accuracy recomputed from the matrix, as an independent check that the
    # figure and the reported headline number describe the same run.
    recomputed = np.trace(cm) / cm.sum()
    print("accuracy recomputed from matrix: %.4f (reported %.4f)"
          % (recomputed, entry["accuracy"]))


if __name__ == "__main__":
    main()
