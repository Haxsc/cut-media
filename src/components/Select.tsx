"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type Option = { value: string; label: string };

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  options: Option[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  ariaLabel,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setHighlightIndex(idx);
  }, [value, options]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const active = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  function commit(val: string) {
    onChange?.(val);
    setOpen(false);
    // return focus to button for accessibility
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (
      !open &&
      (e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " ")
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlightIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlightIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[highlightIndex];
      if (opt) commit(opt.value);
    }
  }

  const listboxId = `${id}-listbox`;
  const activeId = `${id}-option-${highlightIndex}`;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        className="field ring-brand text-left flex items-center gap-2 pr-10"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className="truncate text-sm">
          {active ? (
            active.label
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </span>
        <svg
          className={`pointer-events-none absolute right-3 h-4 w-4 transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
        <span className="sr-only">Abrir seletor</span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-activedescendant={activeId}
          tabIndex={-1}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface)]/98 backdrop-blur-md shadow-xl outline-none animate-in fade-in slide-in-from-top-1"
          onKeyDown={onKeyDown}
        >
          {options.map((opt, i) => {
            const isActive = value === opt.value;
            const isHighlight = i === highlightIndex;
            return (
              <li
                id={`${id}-option-${i}`}
                key={opt.value}
                role="option"
                aria-selected={isActive}
                className={`flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isHighlight ? "bg-[var(--brand)]/15" : ""
                } ${isActive ? "text-white" : "text-foreground"}`}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(opt.value)}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-[var(--brand)]" : "bg-white/30"
                  }`}
                />
                <span className="truncate">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
