export function StatCard({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warning" }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className={`text-3xl font-semibold ${tone === "warning" ? "text-amber-600" : "text-[var(--color-ink)]"}`}>
        {value}
      </p>
      <p className="text-sm text-[var(--color-ink-soft)] mt-1">{label}</p>
    </div>
  );
}
