const NAME_MAX_LEN = 60;

export function isLikelyName(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > NAME_MAX_LEN) return false;
  // Reject anything that looks like a full sentence/question rather than a name.
  if (/[?]/.test(trimmed)) return false;
  return true;
}

export function sanitizeName(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, NAME_MAX_LEN);
}

export function buildGreeting(name: string): string {
  return `Hello ${name}, how can I help you?`;
}
