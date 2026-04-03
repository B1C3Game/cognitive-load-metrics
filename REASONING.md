# Micro-LLM Reasoning (Day 2)

## Why this project exists
The goal is to build defensible IP, not another generic demo.

A micro-LLM for cognitive load scoring is the first layer because high-quality auto-research needs domain-specialized reasoning and explicit constraints. Without that, outputs are generic and hard to trust.

## Product hypothesis
If we can score text for cognitive load in an auditable way, then we can help teams improve accessibility and clarity with measurable before/after outcomes.

## Problem statement
Most text quality workflows are subjective, inconsistent, or non-explainable. Teams get vague feedback like "too dense" without a clear breakdown of what caused the load.

## Proposed solution
Build a narrow scorer that takes text input and returns:
- Cognitive load score (0-100)
- Factor breakdown
- Explanation trace
- Targeted rewrite guidance

## Why this is a good Day 2 scope
- Existing corpus already exists in this workspace (philosophy texts).
- Baseline "good" signal can come from the existing corpus.
- "Bad" contrast examples can be generated systematically by perturbing good text.
- Output can be validated quickly on real samples.

## Data strategy
- Positive set: selected files from corpus/ that represent high internal coherence.
- Negative set: synthetic perturbations of the same files.

Perturbation modes:
- narrative bloat
- jargon overload
- uncontrolled code-switching
- metaphor inflation
- deep clause nesting

This creates paired examples with controlled difficulty and interpretable failure modes.

## Scoring dimensions (initial)
- lexical density
- ambiguity risk
- parsing complexity
- working-memory demand
- anchor clarity

## Constraints
- Keep model/task narrow.
- Favor explainability over benchmark vanity.
- Store no secrets or sensitive data.
- Produce outputs that can be shown to partners.

## Non-goals (for now)
- Building a general-purpose chatbot
- Solving multilingual reasoning broadly
- Large-scale training infrastructure

## Proof of value criteria
- Run scorer on at least 3-5 examples.
- Show before/after rewrite improvements.
- Output includes factor-level explanations, not just one score.
- Decision logic is clear enough to defend to a partner.

## Decision
Proceed with a constrained micro-LLM/cognitive scorer prototype first, then layer auto-research on top once scoring quality is stable.
