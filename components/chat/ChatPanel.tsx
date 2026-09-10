"use client";

import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { Logo } from "@/components/ui/Logo";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useChatSession } from "@/hooks/useChatSession";

export function ChatPanel({
  onClose,
  variant = "popup",
  headerActions,
}: {
  onClose?: () => void;
  variant?: "popup" | "full";
  headerActions?: ReactNode;
}) {
  const { messages, isTyping, error, sendMessage, selectTopic, restart } = useChatSession();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipSelect = (topicId: string, label: string) => {
    if (topicId) {
      selectTopic(topicId, label);
    } else {
      sendMessage(label);
    }
  };

  return (
    <div
      className={`flex flex-col bg-[var(--color-canvas)] ${
        variant === "popup" ? "h-full rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl" : "h-full"
      }`}
      role="dialog"
      aria-label="DP HR FAQ Assistant chat"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo height={22} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-ink)] truncate">DP HR FAQ Assistant</p>
            <p className="text-xs text-[var(--color-ink-soft)] truncate">Usually replies instantly</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerActions}
          <button
            type="button"
            onClick={restart}
            aria-label="Restart conversation"
            title="Restart conversation"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
              <path d="M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat"
              title="Close chat"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto dp-scroll px-4 py-4 space-y-4" aria-live="polite">
        {messages.map((m, i) => (
          <MessageBubble key={m.id} message={m} onSelectTopic={handleChipSelect} isLatest={i === messages.length - 1} />
        ))}
        {isTyping && <TypingIndicator />}
        {error && (
          <div className="text-sm text-[var(--color-danger)] bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] bg-white px-3 py-3">
        <div className="flex items-end gap-2">
          <label htmlFor="dp-chat-input" className="sr-only">
            Ask your HR question
          </label>
          <textarea
            id="dp-chat-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your HR question..."
            className="flex-1 resize-none max-h-32 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send message"
            className="w-10 h-10 shrink-0 rounded-xl bg-[var(--color-brand)] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-brand-dark)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.4 20.6 21 12 3.4 3.4 3 10l12 2-12 2z" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-[var(--color-ink-soft)] mt-1.5 px-1">Enter to send · Shift+Enter for a new line</p>
      </div>
    </div>
  );
}
