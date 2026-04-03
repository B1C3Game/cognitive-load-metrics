import argparse
import json
from pathlib import Path
from typing import Any, Dict, List


def load_report(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def strongest_examples(records: List[Dict[str, Any]], top_n: int) -> List[Dict[str, Any]]:
    return sorted(records, key=lambda r: r["delta"]["score"], reverse=True)[:top_n]


def factor_sentence(name: str, delta: float) -> str:
    if delta > 0:
        return f"- {name}: clean performs better by {abs(delta):.4f}"
    if delta < 0:
        return f"- {name}: noisy performs better by {abs(delta):.4f}"
    return f"- {name}: no measurable difference"


def build_story(report: Dict[str, Any], top_n: int) -> str:
    summary = report.get("summary", {})
    records = report.get("records", [])
    top_records = strongest_examples(records, top_n)

    lines: List[str] = []
    lines.append("Cognitive Load Scorer Demo Story")
    lines.append("=" * 32)
    lines.append("")
    lines.append("Run summary")
    lines.append(f"- Pairs evaluated: {summary.get('pairs', 0)}")
    lines.append(f"- Average clean score: {summary.get('avg_clean_score', 0)}")
    lines.append(f"- Average noisy score: {summary.get('avg_noisy_score', 0)}")
    lines.append(f"- Average delta: {summary.get('avg_score_delta', 0)}")
    lines.append(
        f"- Avg clean failed dimensions: {summary.get('avg_clean_failed_dimensions', 0)}"
    )
    lines.append(
        f"- Avg noisy failed dimensions: {summary.get('avg_noisy_failed_dimensions', 0)}"
    )
    lines.append("")
    lines.append("Top examples by score drop")

    for idx, rec in enumerate(top_records, start=1):
        clean = rec["clean"]
        noisy = rec["noisy"]
        delta = rec["delta"]

        lines.append("")
        lines.append(f"Example {idx}: {rec['file']}")
        lines.append(f"- Clean score: {clean['score']}")
        lines.append(f"- Noisy score: {noisy['score']}")
        lines.append(f"- Score drop: {delta['score']}")
        lines.append(f"- Clean failed dimensions: {clean['failed_count']}/5")
        lines.append(f"- Noisy failed dimensions: {noisy['failed_count']}/5")
        lines.append(f"- Clean bottleneck: {clean['bottleneck']}")
        lines.append(f"- Noisy bottleneck: {noisy['bottleneck']}")
        lines.append("- Factor deltas:")
        for factor, factor_delta in delta["factors"].items():
            lines.append(factor_sentence(factor, factor_delta))

        lines.append("- Suggested rewrite focus:")
        lines.append(
            "  Reduce nested clauses, anchor language shifts, and replace abstract jargon with concrete wording."
        )

    lines.append("")
    lines.append("Partner takeaway")
    lines.append(
        "- The pipeline detects consistent score drops in noisy variants and identifies actionable bottlenecks per text."
    )

    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate partner-facing narrative from evaluation report")
    parser.add_argument("--report", default="outputs/evaluation_report.json", help="Path to evaluation report JSON")
    parser.add_argument("--top", type=int, default=3, help="Number of strongest examples to include")
    parser.add_argument("--out", type=str, default="outputs/demo_story.txt", help="Output text file path")
    args = parser.parse_args()

    report_path = Path(args.report)
    out_path = Path(args.out)

    report = load_report(report_path)
    story = build_story(report, args.top)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(story, encoding="utf-8")

    print(story)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
