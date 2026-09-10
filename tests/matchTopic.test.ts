import { describe, it, expect } from "vitest";
import { matchQuestionToTopics, type MatchableTopic } from "../lib/search/matchTopic";
import { getDefaultSynonyms, DEFAULT_SYNONYMS } from "../lib/search/defaultSynonyms";

function topic(purpose: string, department = "Human Resources"): MatchableTopic {
  return {
    id: purpose.toLowerCase().replace(/\s+/g, "-"),
    purpose,
    department,
    keywords: getDefaultSynonyms(purpose).join("\n"),
  };
}

const TOPICS: MatchableTopic[] = Object.keys(DEFAULT_SYNONYMS).map((purpose) =>
  topic(
    purpose
      .split(" ")
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ")
  )
);

describe("matchQuestionToTopics", () => {
  it("matches 'I need help with PF' to Provident Fund with high confidence", () => {
    const result = matchQuestionToTopics("I need help with PF.", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("provident");
    expect(result.confidence).toBe("high");
  });

  it("matches a salary question to Payroll & Gratuity", () => {
    const result = matchQuestionToTopics("When will my salary be processed?", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("payroll");
  });

  it("matches a medical reimbursement question to Medical Claim", () => {
    const result = matchQuestionToTopics("I need a medical reimbursement.", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("medical");
  });

  it("matches an employment certificate question to Official Documents", () => {
    const result = matchQuestionToTopics("How do I get an employment certificate?", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("official documents");
  });

  it("matches a resignation question to Employee Offboarding", () => {
    const result = matchQuestionToTopics("I want to resign.", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("offboarding");
  });

  it("matches a lost item question to Lost & Found", () => {
    const result = matchQuestionToTopics("I lost my wallet in the office.", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("lost");
  });

  it("matches an income tax question to Income Tax", () => {
    const result = matchQuestionToTopics("I need to know about income tax.", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("income tax");
  });

  it("matches a cheque book request to Bank Card & Cheque Book", () => {
    const result = matchQuestionToTopics("I need a new cheque book.", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("cheque");
  });

  it("handles a slightly misspelled keyword via fuzzy matching", () => {
    const result = matchQuestionToTopics("Question about my grattuity payment", TOPICS);
    expect(result.best?.topic.purpose.toLowerCase()).toContain("payroll");
  });

  it("returns low confidence / no strong match for an unrelated question", () => {
    const result = matchQuestionToTopics("What is the meaning of life?", TOPICS);
    expect(result.confidence).toBe("low");
  });

  it("surfaces multiple candidate topics for an ambiguous salary/PF deduction question", () => {
    const result = matchQuestionToTopics(
      "I have a problem with money deducted from my salary for PF.",
      TOPICS
    );
    const purposes = result.candidates.map((c) => c.topic.purpose.toLowerCase());
    expect(purposes.some((p) => p.includes("provident") || p.includes("payroll"))).toBe(true);
  });
});
