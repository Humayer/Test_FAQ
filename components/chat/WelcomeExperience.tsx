"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { ChatLauncher } from "@/components/chat/ChatLauncher";

const CATEGORY_PREVIEW = [
  "Payroll & Gratuity",
  "Provident Fund",
  "Income Tax",
  "Medical Claim",
  "Official Documents",
  "Employee Onboarding",
];

export function WelcomeExperience() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center">
          <div className="flex justify-center mb-8">
            <Logo height={40} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--color-ink)] tracking-tight">
            Welcome to the DP HR FAQ Portal
          </h1>
          <p className="mt-3 text-base text-[var(--color-ink-soft)]">
            Your quick and easy HR information assistant
          </p>

          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] text-white text-sm font-medium px-6 py-3 hover:bg-[var(--color-brand-dark)] transition-colors shadow-[var(--shadow-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-dark)]"
          >
            Start Conversation
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="mt-12 text-left">
            <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-3">Common topics</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {CATEGORY_PREVIEW.map((c) => (
                <span
                  key={c}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white text-[var(--color-ink-soft)]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <ChatLauncher open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
