# MLLM Cognitive load Metrics

Focused workspace for a micro-LLM prototype that scores cognitive load in text using B1C3 constraints.

## Objective
Ship a narrow, defensible proof-of-concept that can:
- score cognitive load
- explain why the score happened
- suggest concrete rewrites

## Why this matters
The target is partner-facing, measurable value for accessibility and content clarity. This is a foundation layer for later auto-research workflows.

## Current status
- Corpus is present in corpus/
- Initial strategic rationale documented in REASONING.md
- Next step is baseline scorer implementation + evaluation pass

## Repository layout
- corpus/: source texts used for baseline examples
- chat-Wijak-1775222442368.md: planning conversation history
- REASONING.md: project rationale, assumptions, and scope
- schema/scorer_output.schema.json: output contract for score responses
- docs/SCORER_PSEUDOCODE.md: baseline scoring algorithm flow
- src/scorer.py: runnable rule-based baseline scorer
- src/generate_noise.py: deterministic noisy variant generator
- src/evaluate_corpus.py: clean vs noisy batch evaluator
- src/demo_story.py: partner-facing narrative generator from evaluation report
- generated/noisy/: synthetic noisy variants
- outputs/: evaluation artifacts (JSON and CSV)

## Planned outputs (MVP)
- Cognitive load score (0-100)
- Factor breakdown per input
- Rewrite suggestions tied to specific failure modes
- Example evaluation on 3-5 real texts

## Scoring Framework

### Dimensions
1. **Semantic density** - unique concepts per sentence (higher = clearer)
2. **Syntactic complexity** - clause nesting depth (lower = clearer)
3. **Lexical clarity** - common words vs. jargon ratio (higher common = clearer)
4. **Code-switching coherence** - language shifts with or without anchors (anchored = clearer)
5. **Working memory load** - dependent clauses, pronoun ambiguity (lower = clearer)

### Baseline
- Your philosophy files = 1.0 (you understand every word)
- Generated noise variants = X (measured against your baseline)
- Unknown text = scored relative to both

### Output Example
```json
{
	"score": 72,
	"factors": {
		"semantic_density": 0.85,
		"syntactic_complexity": 0.65,
		"lexical_clarity": 0.78,
		"code_switching": 0.90,
		"working_memory": 0.68
	},
	"bottleneck": "syntactic_complexity - reduce nesting",
	"rewrite_suggestion": "Split 3-clause sentence into 2 single-clause statements"
}
```

## Suggested next implementation steps
1. Define schema for scorer output (JSON fields and definitions).
2. Build a baseline rule-based scorer for fast validation.
3. Generate paired noisy variants from selected corpus files.
4. Run evaluations and record before/after rewrite outcomes.
5. Decide whether to keep rules, add retrieval, or train an adapter.

## Quick start
Run the baseline scorer on a text snippet:

```powershell
c:/2/B1C3/.venv/Scripts/python.exe src/scorer.py --text "This is a clear short sentence. It explains one concept at a time."
```

Run it on a file:

```powershell
c:/2/B1C3/.venv/Scripts/python.exe src/scorer.py --file corpus/B1C3_philosophy_summary.md
```

Generate noisy variants from corpus:

```powershell
c:/2/B1C3/.venv/Scripts/python.exe src/generate_noise.py --limit 8
```

Generate noisy variants with explicit profile:

```powershell
c:/2/B1C3/.venv/Scripts/python.exe src/generate_noise.py --limit 8 --profile realistic --output-dir generated/noisy-realistic
c:/2/B1C3/.venv/Scripts/python.exe src/generate_noise.py --limit 8 --profile aggressive --output-dir generated/noisy-aggressive
```

Evaluate clean vs noisy pairs:

```powershell
c:/2/B1C3/.venv/Scripts/python.exe src/evaluate_corpus.py
```

Generate a partner-facing demo narrative:

```powershell
c:/2/B1C3/.venv/Scripts/python.exe src/demo_story.py --top 3
```

## Success criteria
- Explainable outputs
- Repeatable scoring behavior
- Clear improvement signal after rewrite suggestions
- Defensible story for partner demos
