export function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="Assistant is typing">
      <div className="rounded-2xl rounded-bl-sm bg-white border border-[var(--color-border)] px-4 py-3 shadow-sm flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-soft)] dp-typing-dot" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-soft)] dp-typing-dot" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-soft)] dp-typing-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
