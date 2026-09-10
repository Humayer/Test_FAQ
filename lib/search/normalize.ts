// Common abbreviations / shorthand employees actually type, expanded before
// matching. Keep this list small and obviously-correct; anything ambiguous
// should be handled by the synonym system per topic instead.
const ABBREVIATIONS: Record<string, string> = {
  pf: "provident fund",
  hr: "human resources",
  hris: "hr information system",
  atm: "bank card",
  eom: "end of month",
};

export function normalizeText(input: string): string {
  let text = input.toLowerCase().trim();

  // Remove punctuation but keep word boundaries.
  text = text.replace(/[.,/#!$%^&*;:{}=\-_`~()?'"]/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

export function expandAbbreviations(normalized: string): string {
  const words = normalized.split(" ");
  const expanded = words.map((w) => ABBREVIATIONS[w] ?? w);
  return expanded.join(" ");
}

export function tokenize(input: string): string[] {
  const normalized = expandAbbreviations(normalizeText(input));
  return normalized.split(" ").filter(Boolean);
}
