const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in",
  "is", "it", "its", "of", "on", "that", "the", "to", "was", "were", "will", "with",
  "this", "these", "those", "or", "if", "then", "than", "but", "not", "we", "you", "they",
  "i", "our", "your", "their", "them", "his", "her", "my", "me", "us"
]);

const COMMON_WORDS = new Set([
  ...STOPWORDS,
  "clear", "text", "simple", "work", "help", "team", "user", "build", "score", "input",
  "output", "sentence", "word", "short", "long", "read", "understand", "meaning", "context"
]);

const JARGON_HINTS = new Set([
  "synergy", "paradigm", "leverage", "orchestration", "multimodal", "interoperability",
  "hyperautomation", "utilization", "holistic", "robustness", "strategic", "transformative"
]);

const SUBORDINATORS = new Set([
  "because", "although", "since", "while", "unless", "whereas", "however", "therefore",
  "which", "that", "who", "whom", "whose", "when", "where", "after", "before", "until"
]);

const PRONOUNS = new Set(["it", "this", "that", "they", "them", "he", "she", "these", "those"]);
const LANG_HINTS_SV = new Set(["och", "att", "det", "som", "inte", "med", "for", "eller"]);
const LANG_HINTS_FR = new Set(["et", "de", "la", "le", "des", "avec", "pour"]);
const LANG_HINTS_ARABIC_ROMANIZED = new Set(["yaani", "wallah", "inshallah", "habibi"]);
const ANCHORS = ["in swedish", "in french", "in arabic", "translated", "means", "translation", "defined as"];

const WEIGHTS = {
  semantic_density: 0.25,
  syntactic_complexity: 0.20,
  lexical_clarity: 0.20,
  code_switching: 0.15,
  working_memory: 0.20,
};

const THRESHOLDS = {
  semantic_density: 0.70,
  syntactic_complexity: 0.75,
  lexical_clarity: 0.62,
  code_switching: 0.70,
  working_memory: 0.75,
};

const HARD_FAIL_THRESHOLD = 0.50;
const COHERENCE_FAIL_THRESHOLD = 0.70;
const MULTI_FAIL_CASCADE_MULTIPLIER = 0.55;
const HARD_FAIL_MULTIPLIER = 0.70;
const COHERENCE_PENALTY_MULTIPLIER = 0.80;
const SYNTACTIC_MEMORY_CASCADE_MULTIPLIER = 0.85;

const FACTOR_EXPLANATIONS = {
  semantic_density: "One clear concept per sentence, not filler-heavy drift.",
  syntactic_complexity: "Lower clause pressure, clearer sentence structure.",
  lexical_clarity: "Common words beat abstract or overloaded jargon.",
  code_switching: "Language shifts need anchors so the reader does not lose footing.",
  working_memory: "Shorter dependencies reduce reader strain.",
};

const BOTTLENECK_MAP = {
  semantic_density: "semantic_density - increase concept precision per sentence",
  syntactic_complexity: "syntactic_complexity - reduce nesting",
  lexical_clarity: "lexical_clarity - replace jargon with common words",
  code_switching: "code_switching - add language anchors where shifts happen",
  working_memory: "working_memory - shorten dependent structures",
};

const EXAMPLES = {
  clear: "This guidance keeps one idea per sentence. It defines the technical term before using it. The reader always knows what changed and why it matters.",
  noisy: "This plan sounds strategic and transformative, but key terms drift and meaning stays abstract; och den byter språk utan förklaring, so readers must infer intent.",
  codeswitch: "The system scores clarity, men ibland byter den språk utan ankare, which means the reader must infer the shift instead of being told what the switch does."
};

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

function splitSentences(text) {
  // Normalize all whitespace/newlines to a single space first.
  // Multi-line pasted text must not be fragmented into short pseudo-sentences
  // that make a deeply nested single sentence look syntactically simple.
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
}

function tokenize(text) {
  return Array.from(text.toLowerCase().matchAll(/[a-z][a-z'-]*/g)).map((match) => match[0]);
}

const DENSITY_OVERLOAD_CONCEPTS = 18;

function semanticDensity(sentences) {
  if (!sentences.length) {
    return 0;
  }

  const scores = [];
  for (const sentence of sentences) {
    const tokens = tokenize(sentence);
    if (!tokens.length) {
      continue;
    }
    const content = tokens.filter((token) => !STOPWORDS.has(token));
    const uniqueConcepts = new Set(content).size;
    const ratio = uniqueConcepts / Math.max(1, tokens.length);

    // Base score: original linear normalization.
    let sentenceScore = clamp((ratio - 0.15) / 0.5);

    // Concept overload penalty: too many distinct ideas in one sentence is a burden
    // even when the ratio looks fine.
    if (uniqueConcepts > DENSITY_OVERLOAD_CONCEPTS) {
      const overloadPenalty = Math.min(0.75, (uniqueConcepts - DENSITY_OVERLOAD_CONCEPTS) * 0.04);
      sentenceScore = Math.max(0, sentenceScore - overloadPenalty);
    }

    scores.push(sentenceScore);
  }

  if (!scores.length) {
    return 0;
  }

  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const worst = Math.min(...scores);
  return clamp((0.70 * avg) + (0.30 * worst));
}

function syntacticComplexityClarity(sentences) {
  if (!sentences.length) {
    return 0;
  }

  const scores = sentences.map((sentence) => {
    const tokens = tokenize(sentence);
    const subCount = tokens.filter((token) => SUBORDINATORS.has(token)).length;
    const commaCount = (sentence.match(/,/g) || []).length;
    const semiCount = (sentence.match(/;/g) || []).length;
    const colonCount = (sentence.match(/:/g) || []).length;
    const emDashCount = (sentence.match(/[\u2014\u2013]/g) || []).length;
    const lengthPressure = Math.max(0, (tokens.length - 18) / 20);
    const rawComplexity =
      (0.60 * subCount) +
      (0.30 * commaCount) +
      (0.25 * semiCount) +
      (0.20 * colonCount) +
      (0.25 * emDashCount) +
      (0.30 * lengthPressure);
    return clamp(1 - (rawComplexity / 4.8));
  });

  const avgClarity = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const worstSentence = Math.min(...scores);
  return clamp((0.60 * avgClarity) + (0.40 * worstSentence));
}

function lexicalClarity(tokens) {
  if (!tokens.length) {
    return 0;
  }

  const common = tokens.filter((token) => COMMON_WORDS.has(token)).length;
  const jargon = tokens.filter((token) => JARGON_HINTS.has(token)).length;
  const longWords = tokens.filter((token) => token.length >= 11).length;

  const commonRatio = common / tokens.length;
  const jargonPressure = (jargon + (0.5 * longWords)) / tokens.length;
  return clamp(commonRatio - (0.6 * jargonPressure) + 0.35);
}

function codeSwitchingCoherence(text, tokens) {
  if (!tokens.length) {
    return 0;
  }

  const svHits = tokens.filter((token) => LANG_HINTS_SV.has(token)).length;
  const frHits = tokens.filter((token) => LANG_HINTS_FR.has(token)).length;
  const arHits = tokens.filter((token) => LANG_HINTS_ARABIC_ROMANIZED.has(token)).length;
  const switchHits = svHits + frHits + arHits;

  if (switchHits === 0) {
    return 1;
  }

  const lower = text.toLowerCase();
  const anchored = ANCHORS.some((anchor) => lower.includes(anchor));
  if (anchored) {
    return clamp(0.75 + Math.min(0.2, switchHits * 0.03));
  }

  return clamp(0.55 - Math.min(0.35, switchHits * 0.04));
}

function workingMemoryClarity(sentences, tokens, syntacticClarity) {
  if (!sentences.length) {
    return 0;
  }

  const pronounCount = tokens.filter((token) => PRONOUNS.has(token)).length;
  const pronounPressure = pronounCount / Math.max(1, tokens.length);

  let longSentencePressure = 0;
  let clausePressure = 0;
  for (const sentence of sentences) {
    const sentenceTokens = tokenize(sentence);
    if (sentenceTokens.length > 24) {
      longSentencePressure += (sentenceTokens.length - 24) / 25;
    }
    clausePressure += (sentence.match(/[,;:]/g) || []).length;
  }

  longSentencePressure = longSentencePressure / Math.max(1, sentences.length);
  clausePressure = clausePressure / Math.max(1, sentences.length * 6);

  const rawLoad = (0.40 * longSentencePressure) + (0.30 * clausePressure) + (0.20 * pronounPressure);
  let clarity = clamp(1 - rawLoad);

  if (syntacticClarity < 0.70) {
    const coupling = clamp(syntacticClarity / 0.70, 0.55, 1);
    clarity = clamp(clarity * coupling);
  }

  return clarity;
}

function applyCascadePenalties(weightedScore, factors, failedCount) {
  let penalized = weightedScore;
  let basePenalty = 1;
  const penalties = [];

  if (failedCount >= 2) {
    basePenalty = Math.min(basePenalty, MULTI_FAIL_CASCADE_MULTIPLIER);
  }

  const hardFailCount = Object.values(factors).filter((value) => value < HARD_FAIL_THRESHOLD).length;
  if (hardFailCount > 0) {
    basePenalty = Math.min(basePenalty, HARD_FAIL_MULTIPLIER);
  }

  if (basePenalty < 1) {
    let reason = "hard_fail";
    if (failedCount >= 2 && hardFailCount > 0) {
      reason = "multi_fail_cascade+hard_fail";
    } else if (failedCount >= 2) {
      reason = "multi_fail_cascade";
    }
    penalties.push({ name: reason, multiplier: basePenalty });
  }

  penalized *= basePenalty;

  if (factors.code_switching < COHERENCE_FAIL_THRESHOLD && factors.lexical_clarity < COHERENCE_FAIL_THRESHOLD) {
    penalized *= COHERENCE_PENALTY_MULTIPLIER;
    penalties.push({ name: "coherence_penalty", multiplier: COHERENCE_PENALTY_MULTIPLIER });
  }

  if (factors.syntactic_complexity < THRESHOLDS.syntactic_complexity && factors.working_memory < THRESHOLDS.working_memory) {
    penalized *= SYNTACTIC_MEMORY_CASCADE_MULTIPLIER;
    penalties.push({ name: "syntactic_memory_cascade", multiplier: SYNTACTIC_MEMORY_CASCADE_MULTIPLIER });
  }

  return { penalized: clamp(penalized), penalties };
}

function rewriteSuggestionFor(bottleneck) {
  if (bottleneck.startsWith("syntactic_complexity")) {
    return "Split multi-clause sentences into 1-2 clause statements.";
  }
  if (bottleneck.startsWith("lexical_clarity")) {
    return "Replace abstract terms with concrete, common alternatives.";
  }
  if (bottleneck.startsWith("semantic_density")) {
    return "Remove filler and keep one clear concept per sentence.";
  }
  if (bottleneck.startsWith("code_switching")) {
    return "When language shifts, add a short anchor phrase that defines intent.";
  }
  return "Reduce pronoun chains and shorten sentence dependencies.";
}

function scoreText(text) {
  const sentences = splitSentences(text);
  const tokens = tokenize(text);
  const syntacticFactor = syntacticComplexityClarity(sentences);

  const factors = {
    semantic_density: semanticDensity(sentences),
    syntactic_complexity: syntacticFactor,
    lexical_clarity: lexicalClarity(tokens),
    code_switching: codeSwitchingCoherence(text, tokens),
    working_memory: workingMemoryClarity(sentences, tokens, syntacticFactor),
  };

  const weighted = Object.entries(factors).reduce((sum, [name, value]) => sum + (value * WEIGHTS[name]), 0);
  const thresholdStatus = Object.fromEntries(
    Object.entries(factors).map(([name, value]) => [name, value >= THRESHOLDS[name]])
  );
  const failedDimensions = Object.entries(thresholdStatus).filter(([, passed]) => !passed).map(([name]) => name);
  const cascadeResult = applyCascadePenalties(weighted, factors, failedDimensions.length);
  const score = Math.round(cascadeResult.penalized * 100);
  const bottleneckKey = Object.entries(factors).sort((left, right) => left[1] - right[1])[0][0];
  const bottleneck = BOTTLENECK_MAP[bottleneckKey];

  return {
    score,
    factors,
    threshold_status: thresholdStatus,
    failed_dimensions: failedDimensions,
    failed_count: failedDimensions.length,
    penalties_applied: cascadeResult.penalties,
    bottleneck,
    rewrite_suggestion: rewriteSuggestionFor(bottleneck),
  };
}

function formatPenaltyName(name) {
  return name.replaceAll("_", " ");
}

function renderPenalties(result) {
  const penaltyList = document.querySelector("#penaltyList");
  penaltyList.innerHTML = "";

  if (!result.penalties_applied.length) {
    const row = document.createElement("li");
    row.className = "penalty-item";
    row.textContent = "No cascade penalties applied.";
    penaltyList.appendChild(row);
    return;
  }

  result.penalties_applied.forEach((penalty) => {
    const row = document.createElement("li");
    row.className = "penalty-item";
    row.textContent = `${formatPenaltyName(penalty.name)} x${penalty.multiplier.toFixed(2)}`;
    penaltyList.appendChild(row);
  });
}

function ratingFor(score) {
  if (score >= 85) {
    return { text: "Clear", className: "pass" };
  }
  if (score >= 70) {
    return { text: "Needs review", className: "warn" };
  }
  return { text: "High load", className: "fail" };
}

function formatDimension(name) {
  return name.replaceAll("_", " ");
}

function renderFactors(result) {
  const factorList = document.querySelector("#factorList");
  factorList.innerHTML = "";

  for (const [name, value] of Object.entries(result.factors)) {
    const passed = result.threshold_status[name];
    const row = document.createElement("div");
    row.className = "factor-row";

    row.innerHTML = `
      <div class="factor-meta">
        <div>
          <div class="factor-label">${formatDimension(name)}</div>
          <div class="factor-detail">${FACTOR_EXPLANATIONS[name]}</div>
        </div>
        <div class="factor-detail">${Math.round(value * 100)}/100 · ${passed ? "pass" : "fail"}</div>
      </div>
      <div class="bar"><div class="bar-fill" style="width: ${Math.round(value * 100)}%"></div></div>
    `;
    factorList.appendChild(row);
  }
}

function updateMainResult(result) {
  document.querySelector("#scoreValue").textContent = String(result.score);
  document.querySelector("#failedCount").textContent = `${result.failed_count} failed dimensions`;
  document.querySelector("#bottleneckText").textContent = result.bottleneck;
  document.querySelector("#rewriteText").textContent = result.rewrite_suggestion;

  const rating = ratingFor(result.score);
  const badge = document.querySelector("#ratingBadge");
  badge.textContent = rating.text;
  badge.className = `badge ${rating.className}`;

  renderFactors(result);
  renderPenalties(result);
}

function updateComparison(cleanText, noisyText) {
  const clean = scoreText(cleanText);
  const noisy = scoreText(noisyText);
  const delta = clean.score - noisy.score;

  document.querySelector("#compareCleanScore").textContent = String(clean.score);
  document.querySelector("#compareNoisyScore").textContent = String(noisy.score);
  document.querySelector("#compareDelta").textContent = String(delta);
  document.querySelector("#compareCleanLabel").textContent = `${clean.failed_count} failed dimensions · ${clean.bottleneck}`;
  document.querySelector("#compareNoisyLabel").textContent = `${noisy.failed_count} failed dimensions · ${noisy.bottleneck}`;
  document.querySelector("#compareNarrative").textContent = delta > 0
    ? `Clear text outperforms noisy text by ${delta} points. The current weak point is ${noisy.bottleneck.split(" - ")[0]}.`
    : `This pair is narrow. Use failed dimensions and bottleneck guidance instead of raw score drop alone.`;
}

function scoreCurrentInput() {
  const text = document.querySelector("#inputText").value.trim();
  updateMainResult(scoreText(text));
}

document.querySelector("#scoreButton").addEventListener("click", scoreCurrentInput);

document.querySelector("#compareButton").addEventListener("click", () => {
  updateComparison(EXAMPLES.clear, EXAMPLES.noisy);
});

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const exampleKey = button.getAttribute("data-example");
    document.querySelector("#inputText").value = EXAMPLES[exampleKey];
    scoreCurrentInput();
  });
});

scoreCurrentInput();
updateComparison(EXAMPLES.clear, EXAMPLES.noisy);