import argparse
import csv
import json
from pathlib import Path
from statistics import mean
from typing import Dict, List, TypedDict

from scorer import score_text


class ScoredSection(TypedDict):
    score: int
    factors: Dict[str, float]
    threshold_status: Dict[str, bool]
    failed_dimensions: List[str]
    failed_count: int
    bottleneck: str


class DeltaSection(TypedDict):
    score: int
    factors: Dict[str, float]


class EvalRecord(TypedDict):
    file: str
    clean: ScoredSection
    noisy: ScoredSection
    delta: DeltaSection


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def evaluate_pair(clean_file: Path, noisy_file: Path) -> EvalRecord:
    clean_result = score_text(read_text(clean_file))
    noisy_result = score_text(read_text(noisy_file))

    factor_delta = {
        key: round(clean_result.factors[key] - noisy_result.factors[key], 4)
        for key in clean_result.factors
    }

    return {
        "file": clean_file.name,
        "clean": {
            "score": clean_result.score,
            "factors": {k: round(v, 4) for k, v in clean_result.factors.items()},
            "threshold_status": clean_result.threshold_status,
            "failed_dimensions": clean_result.failed_dimensions,
            "failed_count": clean_result.failed_count,
            "bottleneck": clean_result.bottleneck,
        },
        "noisy": {
            "score": noisy_result.score,
            "factors": {k: round(v, 4) for k, v in noisy_result.factors.items()},
            "threshold_status": noisy_result.threshold_status,
            "failed_dimensions": noisy_result.failed_dimensions,
            "failed_count": noisy_result.failed_count,
            "bottleneck": noisy_result.bottleneck,
        },
        "delta": {
            "score": clean_result.score - noisy_result.score,
            "factors": factor_delta,
        },
    }


def summarize(records: List[EvalRecord]) -> Dict[str, object]:
    if not records:
        return {
            "pairs": 0,
            "avg_clean_score": 0,
            "avg_noisy_score": 0,
            "avg_score_delta": 0,
            "avg_clean_failed_dimensions": 0,
            "avg_noisy_failed_dimensions": 0,
            "avg_factor_delta": {},
        }

    clean_scores = [r["clean"]["score"] for r in records]
    noisy_scores = [r["noisy"]["score"] for r in records]
    score_deltas = [r["delta"]["score"] for r in records]
    clean_failed = [r["clean"]["failed_count"] for r in records]
    noisy_failed = [r["noisy"]["failed_count"] for r in records]

    factor_keys = list(records[0]["delta"]["factors"].keys())
    avg_factor_delta = {}
    for key in factor_keys:
        avg_factor_delta[key] = round(mean(r["delta"]["factors"][key] for r in records), 4)

    return {
        "pairs": len(records),
        "avg_clean_score": round(mean(clean_scores), 2),
        "avg_noisy_score": round(mean(noisy_scores), 2),
        "avg_score_delta": round(mean(score_deltas), 2),
        "avg_clean_failed_dimensions": round(mean(clean_failed), 2),
        "avg_noisy_failed_dimensions": round(mean(noisy_failed), 2),
        "avg_factor_delta": avg_factor_delta,
    }


def write_csv(records: List[EvalRecord], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "file",
            "clean_score",
            "noisy_score",
            "score_delta",
            "clean_failed_count",
            "noisy_failed_count",
            "clean_bottleneck",
            "noisy_bottleneck",
        ])
        for r in records:
            writer.writerow([
                r["file"],
                r["clean"]["score"],
                r["noisy"]["score"],
                r["delta"]["score"],
                r["clean"]["failed_count"],
                r["noisy"]["failed_count"],
                r["clean"]["bottleneck"],
                r["noisy"]["bottleneck"],
            ])


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate clean corpus files against generated noisy variants")
    parser.add_argument("--clean-dir", default="corpus", help="Directory containing clean source markdown files")
    parser.add_argument("--noisy-dir", default="generated/noisy", help="Directory containing noisy markdown files")
    parser.add_argument("--out-dir", default="outputs", help="Directory to write evaluation artifacts")
    args = parser.parse_args()

    clean_dir = Path(args.clean_dir)
    noisy_dir = Path(args.noisy_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    clean_files = sorted(p for p in clean_dir.glob("*.md") if p.name.lower() != "readme.md")

    records: List[EvalRecord] = []
    for clean_file in clean_files:
        noisy_file = noisy_dir / clean_file.name
        if not noisy_file.exists():
            continue
        records.append(evaluate_pair(clean_file, noisy_file))

    summary = summarize(records)
    report = {"summary": summary, "records": records}

    json_out = out_dir / "evaluation_report.json"
    csv_out = out_dir / "evaluation_report.csv"

    json_out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    write_csv(records, csv_out)

    print(json.dumps(summary, indent=2))
    print(f"Wrote {json_out}")
    print(f"Wrote {csv_out}")


if __name__ == "__main__":
    main()
