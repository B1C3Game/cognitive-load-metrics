import argparse
import random
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List


JARGON_INSERTS = [
    "cross-functional synergy",
    "strategic orchestration layer",
    "holistic paradigm shift",
    "transformative interoperability",
    "hyperautomation readiness",
]

BLOAT_PHRASES = [
    "To be completely honest,",
    "In a broader and somewhat complicated context,",
    "If we zoom out for a second,",
    "As everyone already knows,",
]

CODE_SWITCH_SNIPPETS = [
    "och det ar viktigt",
    "et pourtant c'est complexe",
    "yaani this is not trivial",
]

METAPHOR_SNIPPETS = [
    "like steering a ship through fog",
    "as if every sentence is a labyrinth",
    "like carrying five maps in one hand",
]

SUBORDINATORS = ["because", "although", "while", "which", "whereas"]


@dataclass(frozen=True)
class NoiseProfile:
    name: str
    bloat_prob: float
    jargon_prob: float
    code_prob: float
    metaphor_prob: float
    merge_prob: float
    extra_jargon_prob: float
    extra_codeswitch_prob: float


PROFILES = {
    "realistic": NoiseProfile(
        name="realistic",
        bloat_prob=0.45,
        jargon_prob=0.55,
        code_prob=0.40,
        metaphor_prob=0.35,
        merge_prob=0.50,
        extra_jargon_prob=0.20,
        extra_codeswitch_prob=0.10,
    ),
    "improvement": NoiseProfile(
        name="improvement",
        bloat_prob=0.65,
        jargon_prob=0.85,
        code_prob=0.95,
        metaphor_prob=0.50,
        merge_prob=0.30,
        extra_jargon_prob=0.55,
        extra_codeswitch_prob=0.70,
    ),
    "aggressive": NoiseProfile(
        name="aggressive",
        bloat_prob=0.85,
        jargon_prob=0.95,
        code_prob=0.90,
        metaphor_prob=0.70,
        merge_prob=0.90,
        extra_jargon_prob=0.75,
        extra_codeswitch_prob=0.65,
    ),
}


def split_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def add_narrative_bloat(sentences: List[str], rng: random.Random, profile: NoiseProfile) -> List[str]:
    out = []
    for s in sentences:
        if rng.random() < profile.bloat_prob:
            s = f"{rng.choice(BLOAT_PHRASES)} {s}"
        out.append(s)
    return out


def add_jargon(sentences: List[str], rng: random.Random, profile: NoiseProfile) -> List[str]:
    out = []
    for s in sentences:
        if rng.random() < profile.jargon_prob:
            s = f"{s} This supports {rng.choice(JARGON_INSERTS)}."
            if rng.random() < profile.extra_jargon_prob:
                s = f"{s} In practice it requires {rng.choice(JARGON_INSERTS)}."
        out.append(s)
    return out


def add_codeswitch(sentences: List[str], rng: random.Random, profile: NoiseProfile) -> List[str]:
    out = []
    for s in sentences:
        if rng.random() < profile.code_prob:
            s = f"{s} {rng.choice(CODE_SWITCH_SNIPPETS)}."
            if rng.random() < profile.extra_codeswitch_prob:
                s = f"{s} {rng.choice(CODE_SWITCH_SNIPPETS)}."
        out.append(s)
    return out


def add_metaphors(sentences: List[str], rng: random.Random, profile: NoiseProfile) -> List[str]:
    out = []
    for s in sentences:
        if rng.random() < profile.metaphor_prob:
            s = f"{s} It feels {rng.choice(METAPHOR_SNIPPETS)}."
        out.append(s)
    return out


def increase_clause_nesting(sentences: List[str], rng: random.Random, profile: NoiseProfile) -> List[str]:
    if len(sentences) < 2:
        return sentences

    out = []
    i = 0
    while i < len(sentences):
        if i < len(sentences) - 1 and rng.random() < profile.merge_prob:
            left = sentences[i].rstrip(".!? ")
            right = sentences[i + 1].rstrip(".!? ")
            connector = rng.choice(SUBORDINATORS)
            merged = f"{left}, {connector} {right}"
            if i < len(sentences) - 2 and rng.random() < profile.merge_prob:
                third = sentences[i + 2].rstrip(".!? ")
                merged = f"{merged}, {rng.choice(SUBORDINATORS)} {third}"
                i += 1
            merged = merged + "."
            out.append(merged)
            i += 2
        else:
            out.append(sentences[i])
            i += 1
    return out


def generate_noisy_text(text: str, rng: random.Random, profile: NoiseProfile) -> str:
    sentences = split_sentences(text)
    sentences = add_narrative_bloat(sentences, rng, profile)
    sentences = add_jargon(sentences, rng, profile)
    sentences = add_codeswitch(sentences, rng, profile)
    sentences = add_metaphors(sentences, rng, profile)
    sentences = increase_clause_nesting(sentences, rng, profile)

    header = (
        "# Synthetic noisy variant\n\n"
        "Generated for baseline contrast testing.\n"
        f"Profile: {profile.name}.\n"
        "Applied perturbations: narrative_bloat, jargon_overload, code_switching, metaphor_inflation, clause_nesting.\n\n"
    )
    return header + "\n\n".join(sentences).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate noisy variants from corpus text files")
    parser.add_argument("--input-dir", default="corpus", help="Source directory with clean markdown files")
    parser.add_argument("--output-dir", default="generated/noisy", help="Target directory for noisy files")
    parser.add_argument("--limit", type=int, default=8, help="Maximum number of files to process")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument(
        "--profile",
        choices=["realistic", "improvement", "aggressive"],
        default="realistic",
        help="Perturbation strength profile",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in input_dir.glob("*.md") if p.name.lower() != "readme.md")
    if args.limit > 0:
        files = files[: args.limit]

    rng = random.Random(args.seed)
    profile = PROFILES[args.profile]

    count = 0
    for file_path in files:
        text = file_path.read_text(encoding="utf-8")
        noisy = generate_noisy_text(text, rng, profile)
        out_path = output_dir / file_path.name
        out_path.write_text(noisy, encoding="utf-8")
        count += 1

    print(f"Generated {count} noisy files in {output_dir} using profile={profile.name}")


if __name__ == "__main__":
    main()
