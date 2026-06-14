import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldLabel({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-sm font-medium text-foreground">{children}</label>
      {hint && <p className="text-xs text-foreground/65">{hint}</p>}
    </div>
  );
}

export function TagInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const add = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Eliminar ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <input
          type="text"
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={placeholder ?? "Escribe y presiona Enter"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(e.currentTarget.value);
              e.currentTarget.value = "";
            }
          }}
        />
      )}
    </div>
  );
}
