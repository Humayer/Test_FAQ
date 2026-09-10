import type { ChatMessage } from "@/types/chat";
import { ContactCard } from "./ContactCard";
import { TopicChips } from "./TopicChips";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function MessageBubble({
  message,
  onSelectTopic,
  isLatest,
}: {
  message: ChatMessage;
  onSelectTopic: (topicId: string, label: string) => void;
  isLatest: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-br-sm bg-[var(--color-brand)] text-white px-4 py-2.5 text-sm shadow-sm"
              : "rounded-2xl rounded-bl-sm bg-white border border-[var(--color-border)] text-[var(--color-ink)] px-4 py-2.5 text-sm shadow-sm"
          }
        >
          {message.content}
        </div>

        {message.kind === "topic-result" && message.topic && (
          <div className="mt-2">
            <ContactCard topic={message.topic} />
          </div>
        )}

        {message.kind === "topic-choices" && message.choices && (
          <div className="mt-2">
            <TopicChips
              disabled={!isLatest}
              items={message.choices.map((c) => ({ label: c.purpose, value: c.id }))}
              onSelect={(value, label) => onSelectTopic(value, label)}
            />
          </div>
        )}

        {message.kind === "no-match" && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-[var(--color-ink-soft)]">You could also try one of these topics:</p>
            <TopicChips
              disabled={!isLatest}
              items={message.suggestions.map((s) => ({ label: s, value: s }))}
              onSelect={(value) => onSelectTopic("", value)}
            />
          </div>
        )}

        <span className="text-[11px] text-[var(--color-ink-soft)] mt-1 px-1">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}
