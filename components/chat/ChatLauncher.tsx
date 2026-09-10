"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "./ChatPanel";

export function ChatLauncher({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const isOpen = open ?? internalOpen;
  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open HR FAQ Assistant"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[var(--color-brand)] text-white shadow-lg flex items-center justify-center hover:bg-[var(--color-brand-dark)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-dark)]"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {isOpen && (
        <div
          className={
            maximized
              ? "fixed inset-0 z-50 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[420px] sm:h-[75vh]"
              : "fixed inset-0 z-50 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[400px] sm:h-[600px] sm:max-h-[80vh]"
          }
        >
          <div className="relative h-full">
            <ChatPanel
              onClose={() => setOpen(false)}
              variant="popup"
              headerActions={
                <button
                  type="button"
                  onClick={() => setMaximized((m) => !m)}
                  aria-label={maximized ? "Restore chat size" : "Maximize chat"}
                  title={maximized ? "Restore" : "Maximize"}
                  className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {maximized ? (
                      <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                </button>
              }
            />
          </div>
        </div>
      )}
    </>
  );
}
