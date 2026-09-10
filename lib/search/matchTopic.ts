import { normalizeText, expandAbbreviations, tokenize } from "./normalize";

export interface MatchableTopic {
  id: string;
  purpose: string;
  keywords: string; // newline or comma separated
  department: string;
}

export interface TopicMatch {
  topic: MatchableTopic;
  score: number; // 0-100
  reason: string;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function parseKeywordList(keywords: string): string[] {
  return keywords
    .split(/[\n,]/)
    .map((k) => normalizeText(k))
    .filter(Boolean);
}

// Words too common/short to carry any matching signal on their own. Excluded
// from token-overlap scoring so e.g. "of" inside "code of conduct" doesn't
// falsely match unrelated questions that merely contain "of".
const STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "at", "for", "and", "or", "is",
  "are", "was", "be", "my", "me", "i", "it", "this", "that", "with", "as",
  "do", "does", "did", "can", "will", "would", "what", "how", "who",
]);

function significantTokens(tokens: string[]): string[] {
  return tokens.filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** Fuzzy word similarity, 0-1, based on normalized edit distance. */
function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

/**
 * Scores a single topic against a user's question.
 *
 * Signals combined (each contributes to a 0-100 score):
 *  - Exact phrase match of the topic's purpose or a keyword inside the
 *    question (strongest signal).
 *  - Token overlap between question and purpose/keywords.
 *  - Fuzzy per-word similarity to catch typos and near-matches.
 */
function scoreTopic(question: string, topic: MatchableTopic): TopicMatch {
  const normalizedQuestion = expandAbbreviations(normalizeText(question));
  const questionTokens = tokenize(question);
  const questionTokenSet = new Set(questionTokens);

  const purposeNormalized = normalizeText(topic.purpose);
  const keywordList = parseKeywordList(topic.keywords);
  const allPhrases = [purposeNormalized, ...keywordList].filter(Boolean);

  let bestScore = 0;
  let bestReason = "";

  for (const phrase of allPhrases) {
    if (!phrase) continue;

    // 1. Exact phrase containment -> very strong signal.
    if (normalizedQuestion.includes(phrase)) {
      const lengthBonus = Math.min(phrase.split(" ").length * 5, 15);
      const score = 85 + lengthBonus;
      if (score > bestScore) {
        bestScore = Math.min(score, 100);
        bestReason = `Question contains phrase "${phrase}"`;
      }
      continue;
    }

    // 2. Token overlap (order independent), ignoring stopwords.
    const phraseTokens = significantTokens(phrase.split(" ").filter(Boolean));
    const overlap = phraseTokens.filter((t) => questionTokenSet.has(t));
    if (phraseTokens.length > 0 && overlap.length > 0) {
      const overlapRatio = overlap.length / phraseTokens.length;
      const score = 40 + overlapRatio * 45;
      if (score > bestScore) {
        bestScore = Math.min(score, 95);
        bestReason = `Matched keyword(s): ${overlap.join(", ")}`;
      }
    }

    // 3. Fuzzy per-word similarity — catches typos like "grattuity".
    for (const pWord of phraseTokens) {
      if (pWord.length < 4) continue; // skip short words, too noisy for fuzzy match
      for (const qWord of questionTokens) {
        if (qWord.length < 4) continue;
        const sim = wordSimilarity(pWord, qWord);
        if (sim >= 0.8) {
          const score = 40 + sim * 40;
          if (score > bestScore) {
            bestScore = Math.min(score, 90);
            bestReason = `Close match between "${qWord}" and "${pWord}"`;
          }
        }
      }
    }
  }

  return { topic, score: Math.round(bestScore), reason: bestReason || "No strong signal" };
}

export interface MatchResult {
  best: TopicMatch | null;
  candidates: TopicMatch[]; // sorted, top matches (score > 0)
  confidence: ConfidenceLevel;
}

/**
 * Matches a free-text employee question against the list of active FAQ
 * topics using a hybrid strategy (exact / partial / synonym / fuzzy).
 * Never returns a fabricated topic — only ranks the topics that already
 * exist in the database.
 */
export function matchQuestionToTopics(question: string, topics: MatchableTopic[]): MatchResult {
  const scored = topics
    .map((t) => scoreTopic(question, t))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0] ?? null;
  const confidence: ConfidenceLevel = best ? confidenceLevel(best.score) : "low";

  // "Multiple matches" candidates: anything within 15 points of the best
  // score, so genuinely close topics (e.g. Payroll vs Provident Fund for a
  // salary-deduction question) surface as choices instead of a wrong guess.
  const candidates = best ? scored.filter((m) => best.score - m.score <= 15).slice(0, 5) : [];

  return { best, candidates, confidence };
}
