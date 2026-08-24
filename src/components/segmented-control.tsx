type Segment<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: readonly Segment<T>[];
  onChange: (value: T) => void;
  label: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] bg-[#ebe8df] p-1"
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`h-8 rounded-[6px] px-3 text-sm font-medium transition-all ${option.value === value ? "bg-[var(--surface-strong)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
