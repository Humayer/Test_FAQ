import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--color-border)] bg-white">
      <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo height={24} />
        </Link>
        <span className="text-xs text-[var(--color-ink-soft)] font-medium">Internal HR Tool</span>
      </div>
    </header>
  );
}
