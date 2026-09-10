import type { TopicResult } from "@/types/chat";

export function ContactCard({ topic }: { topic: TopicResult }) {
  const hasFlaggedContact = topic.contacts.some((c) => c.needsReview);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] overflow-hidden max-w-md">
      <div className="px-4 py-3 bg-[var(--color-brand-tint)] border-b border-[var(--color-border)]">
        <p className="text-xs font-medium text-[var(--color-brand-dark)] tracking-wide">HR Topic</p>
        <p className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">{topic.purpose}</p>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div>
          <p className="text-xs text-[var(--color-ink-soft)] mb-1">Contact Person</p>
          <ul className="space-y-1">
            {topic.contacts.map((c, i) => (
              <li key={`${c.name}-${i}`} className="text-sm text-[var(--color-ink)] flex items-center gap-1.5">
                {c.name}
                {c.needsReview && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    pending review
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs text-[var(--color-ink-soft)] mb-1">Department</p>
          <p className="text-sm text-[var(--color-ink)]">{topic.department}</p>
        </div>

        <div>
          <p className="text-xs text-[var(--color-ink-soft)] mb-1">Contact Email</p>
          <ul className="space-y-1">
            {topic.contacts.map((c, i) =>
              c.email ? (
                <li key={`${c.email}-${i}`}>
                  <a
                    href={`mailto:${c.email}`}
                    className="text-sm text-[var(--color-brand-dark)] underline underline-offset-2 hover:text-[var(--color-brand)] break-all"
                  >
                    {c.email}
                  </a>
                </li>
              ) : (
                <li key={`missing-${i}`} className="text-sm text-[var(--color-ink-soft)] italic">
                  Email on file needs admin review
                </li>
              )
            )}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {topic.contacts
            .filter((c) => c.email)
            .map((c, i) => (
              <a
                key={`btn-${c.email}-${i}`}
                href={`mailto:${c.email}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] transition-colors"
              >
                Email {c.name}
              </a>
            ))}
        </div>

        {hasFlaggedContact && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            One or more contacts for this topic are pending admin review. The email above may be
            temporarily unavailable — please try another listed contact if it doesn&apos;t go through.
          </p>
        )}
      </div>
    </div>
  );
}
