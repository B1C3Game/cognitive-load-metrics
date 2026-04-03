# Scorer Pseudocode

## Goal
Return a cognitive load score with factor-level explanations and one bottleneck rewrite suggestion.

## Inputs
- Raw text
- Optional baseline profile (future)

## Output
- score: 0-100
- factors:
  - semantic_density
  - syntactic_complexity
  - lexical_clarity
  - code_switching
  - working_memory
- bottleneck
- rewrite_suggestion

## Algorithm
1. Normalize text
- collapse whitespace
- preserve punctuation for clause/sentence signals

2. Split into sentences
- detect sentence boundaries using . ! ? and line breaks

3. Tokenize words
- lowercase for statistics
- keep original text for output references

4. Compute factor signals
- semantic_density:
  - estimate unique non-stopword concepts per sentence
  - normalize to 0..1
- syntactic_complexity:
  - estimate nesting and clause load using commas, semicolons, and subordinators
  - invert into clarity score (higher is better)
- lexical_clarity:
  - estimate common-word ratio versus jargon/long-word pressure
- code_switching:
  - detect foreign-token hints and whether language shifts are anchored
- working_memory:
  - estimate burden from long sentences, dependent clauses, and ambiguous pronoun pressure
  - invert into clarity score (higher is better)

5. Aggregate score
- weighted average of factor scores
- map to integer 0..100

6. Detect bottleneck
- choose the lowest factor
- attach explanation string and rewrite suggestion template

7. Emit JSON
- conform to schema/scorer_output.schema.json

## Notes
- This baseline is rule-based for speed and explainability.
- Replace/augment each factor with learned components after initial validation.
