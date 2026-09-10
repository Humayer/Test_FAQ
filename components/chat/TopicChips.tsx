export function TopicChips({
  items,
  onSelect,
  disabled,
}: {
  items: { label: string; value: string }[];
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item.value, item.label)}
          className="text-sm px-3 py-1.5 rounded-full border border-[var(--color-brand)] text-[var(--color-brand-dark)] bg-white hover:bg-[var(--color-brand-tint)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] focus-visible:outline-offset-2"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
