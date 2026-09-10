import { describe, it, expect } from "vitest";
import { isLikelyName, sanitizeName, buildGreeting } from "../lib/faq/nameDetection";

describe("isLikelyName", () => {
  it("accepts a simple first name", () => {
    expect(isLikelyName("Rahim")).toBe(true);
  });

  it("accepts a full name", () => {
    expect(isLikelyName("Rahim Uddin")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isLikelyName("   ")).toBe(false);
  });

  it("rejects text containing a question mark (likely not a name)", () => {
    expect(isLikelyName("What is this?")).toBe(false);
  });

  it("rejects overly long input", () => {
    expect(isLikelyName("a".repeat(100))).toBe(false);
  });
});

describe("sanitizeName", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeName("  Rahim   Uddin  ")).toBe("Rahim Uddin");
  });

  it("truncates to the max length", () => {
    expect(sanitizeName("a".repeat(100)).length).toBe(60);
  });
});

describe("buildGreeting", () => {
  it("produces a personalized greeting", () => {
    expect(buildGreeting("Rahim")).toBe("Hello Rahim, how can I help you?");
  });
});
