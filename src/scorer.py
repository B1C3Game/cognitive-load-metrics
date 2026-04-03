import argparse
import json
import re
from dataclasses import dataclass
from typing import Dict, List, Tuple


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in",
    "is", "it", "its", "of", "on", "that", "the", "to", "was", "were", "will", "with",
    "this", "these", "those", "or", "if", "then", "than", "but", "not", "we", "you", "they",
    "i", "our", "your", "their", "them", "his", "her", "my", "me", "us"
}

COMMON_WORDS = STOPWORDS | {
    "clear", "text", "simple", "work", "help", "team", "user", "build", "score", "input",
    "output", "sentence", "word", "short", "long", "read", "understand", "meaning", "context"
}

JARGON_HINTS = {
    "synergy", "paradigm", "leverage", "orchestration", "multimodal", "interoperability",
    "hyperautomation", "utilization", "holistic", "robustness", "strategic", "transformative"
}

SUBORDINATORS = {
    "because", "although", "since", "while", "unless", "whereas", "however", "therefore",
    "which", "that", "who", "whom", "whose", "when", "where", "after", "before", "until"
}

PRONOUNS = {"it", "this", "that", "they", "them", "he", "she", "these", "those"}

LANG_HINTS_SV = {"och", "att", "det", "som", "inte", "med", "for", "eller"}
LANG_HINTS_FR = {"et", "de", "la", "le", "des", "avec", "pour"}
LANG_HINTS_ARABIC_ROMANIZED = {"yaani", "wallah", "inshallah", "habibi"}

ANCHORS = {
    "in swedish", "in french", "in arabic", "translated", "means", "translation", "defined as"
}

WEIGHTS = {
    "semantic_density": 0.25,
    "syntactic_complexity": 0.20,
    "lexical_clarity": 0.20,
    "code_switching": 0.15,
    "working_memory": 0.20,
}

THRESHOLDS = {
    "semantic_density": 0.70,
    "syntactic_complexity": 0.75,
    "lexical_clarity": 0.62,
    "code_switching": 0.70,
    "working_memory": 0.75,
}

HARD_FAIL_THRESHOLD = 0.50
COHERENCE_FAIL_THRESHOLD = 0.70
MULTI_FAIL_CASCADE_MULTIPLIER = 0.55
HARD_FAIL_MULTIPLIER = 0.70
COHERENCE_PENALTY_MULTIPLIER = 0.80
SYNTACTIC_MEMORY_CASCADE_MULTIPLIER = 0.85


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def split_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def tokenize(text: str) -> List[str]:
    return re.findall(r"[A-Za-z][A-Za-z'-]*", text.lower())


def semantic_density(sentences: List[str]) -> float:
    if not sentences:
        return 0.0
    densities = []
    for sentence in sentences:
        tokens = tokenize(sentence)
        if not tokens:
            continue
        content = [t for t in tokens if t not in STOPWORDS]
        unique_concepts = len(set(content))
        densities.append(unique_concepts / max(1, len(tokens)))
    if not densities:
        return 0.0
    # Normalize to a practical range where 0.15..0.65 maps roughly to 0..1
    avg = sum(densities) / len(densities)
    return clamp((avg - 0.15) / 0.5)


def syntactic_complexity_clarity(sentences: List[str]) -> float:
    if not sentences:
        return 0.0
    clarity_scores = []
    for sentence in sentences:
        tokens = tokenize(sentence)
        sub_count = sum(1 for t in tokens if t in SUBORDINATORS)
        comma_count = sentence.count(",")
        semi_count = sentence.count(";")
        colon_count = sentence.count(":")
        length_pressure = max(0, (len(tokens) - 18) / 20)
        # Heavier nesting pressure so one deeply nested sentence can tank clarity.
        raw_complexity = (
            (0.60 * sub_count)
            + (0.30 * comma_count)
            + (0.25 * semi_count)
            + (0.20 * colon_count)
            + (0.30 * length_pressure)
        )
        # Convert complexity into clarity where higher is better.
        clarity_scores.append(clamp(1 - (raw_complexity / 4.8)))

    avg_clarity = sum(clarity_scores) / len(clarity_scores)
    worst_sentence = min(clarity_scores)
    # Blend mean and worst-case to avoid averaging away one catastrophic sentence.
    return clamp((0.60 * avg_clarity) + (0.40 * worst_sentence))


def lexical_clarity(tokens: List[str]) -> float:
    if not tokens:
        return 0.0
    common = sum(1 for t in tokens if t in COMMON_WORDS)
    jargon = sum(1 for t in tokens if t in JARGON_HINTS)
    long_words = sum(1 for t in tokens if len(t) >= 11)

    common_ratio = common / len(tokens)
    jargon_pressure = (jargon + (0.5 * long_words)) / len(tokens)
    return clamp(common_ratio - (0.6 * jargon_pressure) + 0.35)


def code_switching_coherence(text: str, tokens: List[str]) -> float:
    if not tokens:
        return 0.0
    sv_hits = sum(1 for t in tokens if t in LANG_HINTS_SV)
    fr_hits = sum(1 for t in tokens if t in LANG_HINTS_FR)
    ar_hits = sum(1 for t in tokens if t in LANG_HINTS_ARABIC_ROMANIZED)
    switch_hits = sv_hits + fr_hits + ar_hits
    if switch_hits == 0:
        return 1.0

    lower = text.lower()
    anchored = any(anchor in lower for anchor in ANCHORS)
    if anchored:
        return clamp(0.75 + min(0.2, switch_hits * 0.03))
    return clamp(0.55 - min(0.35, switch_hits * 0.04))


def working_memory_clarity(sentences: List[str], tokens: List[str], syntactic_clarity: float) -> float:
    if not sentences:
        return 0.0
    pronoun_count = sum(1 for t in tokens if t in PRONOUNS)
    pronoun_pressure = pronoun_count / max(1, len(tokens))

    long_sentence_pressure = 0.0
    clause_pressure = 0.0
    for sentence in sentences:
        sent_tokens = tokenize(sentence)
        if len(sent_tokens) > 24:
            long_sentence_pressure += (len(sent_tokens) - 24) / 25
        clause_pressure += sentence.count(",") + sentence.count(";") + sentence.count(":")

    long_sentence_pressure = long_sentence_pressure / max(1, len(sentences))
    clause_pressure = clause_pressure / max(1, len(sentences) * 6)

    raw_load = (0.40 * long_sentence_pressure) + (0.30 * clause_pressure) + (0.20 * pronoun_pressure)
    clarity = clamp(1 - raw_load)
    # Syntactic collapse increases memory burden, so apply a coupling penalty.
    if syntactic_clarity < 0.70:
        coupling = clamp(syntactic_clarity / 0.70, low=0.55, high=1.0)
        clarity = clamp(clarity * coupling)
    return clarity


def apply_cascade_penalties(
    weighted_score: float, factors: Dict[str, float], failed_count: int
) -> Tuple[float, List[Dict[str, float | str]]]:
    penalized = weighted_score
    base_penalty = 1.0
    penalties: List[Dict[str, float | str]] = []

    if failed_count >= 2:
        base_penalty = min(base_penalty, MULTI_FAIL_CASCADE_MULTIPLIER)

    hard_fail_count = sum(1 for value in factors.values() if value < HARD_FAIL_THRESHOLD)
    if hard_fail_count:
        base_penalty = min(base_penalty, HARD_FAIL_MULTIPLIER)

    if base_penalty < 1.0:
        reason = "multi_fail_cascade" if failed_count >= 2 else "hard_fail"
        if failed_count >= 2 and hard_fail_count:
            reason = "multi_fail_cascade+hard_fail"
        penalties.append({"name": reason, "multiplier": base_penalty})

    penalized *= base_penalty

    if (
        factors["code_switching"] < COHERENCE_FAIL_THRESHOLD
        and factors["lexical_clarity"] < COHERENCE_FAIL_THRESHOLD
    ):
        penalized *= COHERENCE_PENALTY_MULTIPLIER
        penalties.append({"name": "coherence_penalty", "multiplier": COHERENCE_PENALTY_MULTIPLIER})

    if (
        factors["syntactic_complexity"] < THRESHOLDS["syntactic_complexity"]
        and factors["working_memory"] < THRESHOLDS["working_memory"]
    ):
        penalized *= SYNTACTIC_MEMORY_CASCADE_MULTIPLIER
        penalties.append({"name": "syntactic_memory_cascade", "multiplier": SYNTACTIC_MEMORY_CASCADE_MULTIPLIER})

    return clamp(penalized), penalties


@dataclass
class ScoreResult:
    score: int
    factors: Dict[str, float]
    threshold_status: Dict[str, bool]
    failed_dimensions: List[str]
    failed_count: int
    penalties_applied: List[Dict[str, float | str]]
    bottleneck: str
    rewrite_suggestion: str

    def to_json(self) -> str:
        payload = {
            "score": self.score,
            "factors": {k: round(v, 2) for k, v in self.factors.items()},
            "threshold_status": self.threshold_status,
            "failed_dimensions": self.failed_dimensions,
            "failed_count": self.failed_count,
            "penalties_applied": self.penalties_applied,
            "bottleneck": self.bottleneck,
            "rewrite_suggestion": self.rewrite_suggestion,
        }
        return json.dumps(payload, indent=2)


def threshold_status_for(factors: Dict[str, float]) -> Dict[str, bool]:
    return {name: factors[name] >= THRESHOLDS[name] for name in factors}


def bottleneck_for(factors: Dict[str, float]) -> str:
    key = min(factors, key=factors.get)
    mapping = {
        "semantic_density": "semantic_density - increase concept precision per sentence",
        "syntactic_complexity": "syntactic_complexity - reduce nesting",
        "lexical_clarity": "lexical_clarity - replace jargon with common words",
        "code_switching": "code_switching - add language anchors where shifts happen",
        "working_memory": "working_memory - shorten dependent structures",
    }
    return mapping[key]


def rewrite_suggestion_for(bottleneck: str) -> str:
    if bottleneck.startswith("syntactic_complexity"):
        return "Split multi-clause sentences into 1-2 clause statements."
    if bottleneck.startswith("lexical_clarity"):
        return "Replace abstract terms with concrete, common alternatives."
    if bottleneck.startswith("semantic_density"):
        return "Remove filler and keep one clear concept per sentence."
    if bottleneck.startswith("code_switching"):
        return "When language shifts, add a short anchor phrase that defines intent."
    return "Reduce pronoun chains and shorten sentence dependencies."


def score_text(text: str) -> ScoreResult:
    sentences = split_sentences(text)
    tokens = tokenize(text)

    syntactic_factor = syntactic_complexity_clarity(sentences)

    factors = {
        "semantic_density": semantic_density(sentences),
        "syntactic_complexity": syntactic_factor,
        "lexical_clarity": lexical_clarity(tokens),
        "code_switching": code_switching_coherence(text, tokens),
        "working_memory": working_memory_clarity(sentences, tokens, syntactic_factor),
    }

    weighted = sum(factors[name] * WEIGHTS[name] for name in factors)
    status = threshold_status_for(factors)
    failed_dimensions = [name for name, passed in status.items() if not passed]
    weighted, penalties_applied = apply_cascade_penalties(weighted, factors, len(failed_dimensions))
    total_score = int(round(weighted * 100))

    bottleneck = bottleneck_for(factors)
    suggestion = rewrite_suggestion_for(bottleneck)

    return ScoreResult(
        score=total_score,
        factors=factors,
        threshold_status=status,
        failed_dimensions=failed_dimensions,
        failed_count=len(failed_dimensions),
        penalties_applied=penalties_applied,
        bottleneck=bottleneck,
        rewrite_suggestion=suggestion,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Cognitive load baseline scorer")
    parser.add_argument("--text", type=str, help="Raw text to score")
    parser.add_argument("--file", type=str, help="Path to UTF-8 text file to score")
    args = parser.parse_args()

    if not args.text and not args.file:
        raise SystemExit("Provide --text or --file")

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        text = args.text or ""

    result = score_text(text)
    print(result.to_json())


if __name__ == "__main__":
    main()
