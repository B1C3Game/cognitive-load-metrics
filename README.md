# Cognitive Load Metrics

A rule-based cognitive load measurement framework for text. Scores clarity, identifies bottlenecks, and generates rewrite suggestions — built as the foundation layer for a future micro-LLM.

## Objective
Ship a narrow, defensible proof-of-concept that can:
- score cognitive load
- explain why the score happened
- suggest concrete rewrites

## What this is (and isn't)
This is a **rule-based measurement system**, not a trained model. It applies deterministic scoring logic across five dimensions to produce explainable, repeatable outputs.

What it has that a micro-LLM needs:
- Decision framework (five dimensions with thresholds)
- Training signal (clean + noisy paired dataset, 24 evaluation records)
- Evaluation protocol (before/after scoring with delta measurement)

What's missing to call it a micro-LLM:
- A trained model (fine-tuned adapter, small classifier, or embedding-based routing)
- Inference code that uses learned weights instead of hardcoded rules

**For partner demos**: the measurement system is the defensible artifact right now. Scored outputs are explainable and auditable without a trained model.

## Repository
Published at: https://github.com/B1C3Game/cognitive-load-metrics

## Current status
- ✅ Baseline rule-based scorer implemented and validated
- ✅ Noise generation pipeline with three profiles (realistic/improvement/aggressive)
- ✅ Batch evaluation framework producing JSON/CSV artifacts
- ✅ Three partner-facing narratives with positioned messaging (validation/improvement/audit)
- Published to GitHub for collaboration and deployment

## Repository layout
- **corpus/**: Bring your own corpus — place markdown files here as your baseline (not included; proprietary)
- **src/**: Python source code
  - scorer.py: rule-based cognitive load scoring engine
  - generate_noise.py: synthetic noise generation with profiles
  - evaluate_corpus.py: batch evaluation (clean vs noisy)
  - demo_story.py: partner narrative generator
- **schema/**: scorer_output.schema.json (output contract)
- **docs/**: SCORER_PSEUDOCODE.md (algorithm documentation)
- **outputs/**: partner-facing narratives
  - VALIDATION-NARRATIVE.md: quality gate positioning
  - IMPROVEMENT-NARRATIVE.md: content ROI positioning
  - AUDIT-NARRATIVE.md: compliance/accessibility positioning
  - THREE-PERSONA-STRATEGY.md: buyer mapping and pitch sequencing
  - ARTIFACTS-INDEX.md: evidence artifact guide
- REASONING.md: project rationale and scope
- README.md: this file

## Delivered outputs
- ✅ Cognitive load score (0-100) with five-factor breakdown
- ✅ Per-dimension threshold pass/fail status
- ✅ Actionable bottleneck identification
- ✅ Rewrite suggestions tied to specific failure modes
- ✅ Evaluation reports (JSON + CSV) with before/after analytics
- ✅ Three partner-facing narratives with positioned messaging
- ✅ Full corpus scoring (8 samples × 3 profiles = 24 evaluation records)

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

## Quick start
Run the baseline scorer on a text snippet:

```sh
python src/scorer.py --text "This is a clear short sentence. It explains one concept at a time."
```

Run it on a file:

```sh
python src/scorer.py --file corpus/B1C3_philosophy_summary.md
```

Generate noisy variants with a profile:

```sh
python src/generate_noise.py --limit 8 --profile realistic --output-dir generated/noisy-realistic
python src/generate_noise.py --limit 8 --profile improvement --output-dir generated/noisy-improvement
python src/generate_noise.py --limit 8 --profile aggressive --output-dir generated/noisy-aggressive
```

Evaluate clean vs noisy pairs:

```sh
python src/evaluate_corpus.py --noisy-dir generated/noisy-realistic --out-dir outputs/realistic
```

Generate a partner-facing demo narrative:

```sh
python src/demo_story.py --report outputs/realistic/evaluation_report.json --out outputs/realistic/demo_story.txt --top 3
```

## Success criteria
- ✅ Explainable outputs — five-factor breakdown with bottleneck and rewrite suggestion per text
- ✅ Repeatable scoring — deterministic output from same input across all runs
- ✅ Measurable improvement signal — 3.75-point avg delta (realistic profile) as validation baseline
- ✅ Defensible partner story — three positioned narratives with evidence artifacts

## Planned features
1. **Corpus embedding** — vectorize baseline texts to enable similarity-based scoring
2. **Small classifier** — train a dimension-level classifier on clean/noisy pairs using learned weights
3. **LoRA adapter** — fine-tune a small base model (e.g. Phi-3 mini) on the evaluation dataset
4. **Inference pipeline** — replace rule-based scoring with model inference, keep same output schema
5. **API layer** — expose scorer as a REST endpoint for integration into content pipelines
