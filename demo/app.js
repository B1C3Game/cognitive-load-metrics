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
  noisy: "This transformative orchestration framework leverages holistic synergy, which, although strategically aligned, introduces nested dependencies that the reader must reconstruct before the intended meaning stabilizes across the paragraph.",
  codeswitch: "The system scores clarity, men ibland byter den språk utan ankare, which means the reader must infer the shift instead of being told what the switch does."
};

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

function splitSentences(text) {
  return text.trim().split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
}

function tokenize(text) {
  return Array.from(text.toLowerCase().matchAll(/[a-z][a-z'-]*/g)).map((match) => match[0]);
}

function semanticDensity(sentences) {
  if (!sentences.length) {
    return 0;
  }

  const densities = [];
  for (const sentence of sentences) {
    const tokens = tokenize(sentence);
    if (!tokens.length) {
      continue;
    }
    const content = tokens.filter((token) => !STOPWORDS.has(token));
    const uniqueConcepts = new Set(content).size;
    densities.push(uniqueConcepts / Math.max(1, tokens.length));
  }

  if (!densities.length) {
    return 0;
  }

  const average = densities.reduce((sum, value) => sum + value, 0) / densities.length;
  return clamp((average - 0.15) / 0.5);
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
    const lengthPressure = Math.max(0, (tokens.length - 22) / 30);
    const rawComplexity = (0.35 * subCount) + (0.25 * commaCount) + (0.25 * semiCount) + (0.15 * lengthPressure);
    return clamp(1 - (rawComplexity / 3));
  });

  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
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

function workingMemoryClarity(sentences, tokens) {
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
  clausePressure = clausePressure / Math.max(1, sentences.length * 4);

  const rawLoad = (0.45 * longSentencePressure) + (0.35 * clausePressure) + (0.20 * pronounPressure);
  return clamp(1 - rawLoad);
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

  const factors = {
    semantic_density: semanticDensity(sentences),
    syntactic_complexity: syntacticComplexityClarity(sentences),
    lexical_clarity: lexicalClarity(tokens),
    code_switching: codeSwitchingCoherence(text, tokens),
    working_memory: workingMemoryClarity(sentences, tokens),
  };

  const weighted = Object.entries(factors).reduce((sum, [name, value]) => sum + (value * WEIGHTS[name]), 0);
  const score = Math.round(clamp(weighted) * 100);
  const thresholdStatus = Object.fromEntries(
    Object.entries(factors).map(([name, value]) => [name, value >= THRESHOLDS[name]])
  );
  const failedDimensions = Object.entries(thresholdStatus).filter(([, passed]) => !passed).map(([name]) => name);
  const bottleneckKey = Object.entries(factors).sort((left, right) => left[1] - right[1])[0][0];
  const bottleneck = BOTTLENECK_MAP[bottleneckKey];

  return {
    score,
    factors,
    threshold_status: thresholdStatus,
    failed_dimensions: failedDimensions,
    failed_count: failedDimensions.length,
    bottleneck,
    rewrite_suggestion: rewriteSuggestionFor(bottleneck),
  };
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