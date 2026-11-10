"use client";

import { useEffect, useRef, useState } from "react";

type DropdownOption<T extends string> = {
  value: T;
  label: string;
};

type CompactDropdownProps<T extends string> = {
  value: T;
  options: Array<DropdownOption<T>>;
  onValueChange: (next: T) => void;
  ariaLabel: string;
  disabled?: boolean;
};

export function CompactDropdown<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  disabled = false,
}: CompactDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => {
          if (disabled) {
            return;
          }
          setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-md border border-border bg-white px-2 py-1.5 text-left text-[11px] font-semibold text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span>{selected?.label ?? ""}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5L10 12.5L15 7.5" />
        </svg>
      </button>
      {isOpen && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-40 overflow-hidden rounded-md border border-border bg-white shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
              className={
                option.value === value
                  ? "block w-full bg-emerald-50 px-2 py-1.5 text-left text-[11px] font-semibold text-emerald-700"
                  : "block w-full px-2 py-1.5 text-left text-[11px] text-foreground hover:bg-accent"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
