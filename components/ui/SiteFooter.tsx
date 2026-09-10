export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-white">
      <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-ink-soft)]">
          &copy; {new Date().getFullYear()} Datapath. Internal use only.
        </p>
        <p className="text-xs text-[var(--color-ink-soft)]">DP HR FAQ Portal</p>
      </div>
    </footer>
  );
}
