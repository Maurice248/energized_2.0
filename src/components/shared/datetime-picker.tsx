"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDatetimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDatetimeDisplay(value: string): string {
  const date = parseDatetimeLocalValue(value);
  if (!date) return "";
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = pad2(date.getMinutes());
  const period = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${period}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(viewMonth: Date): { date: Date; inMonth: boolean }[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = 0; i < 42; i++) {
    const day = i - startOffset + 1;
    const date = new Date(year, month, day);
    cells.push({ date, inMonth: date.getMonth() === month });
  }

  return cells;
}

function setTimeOnDate(date: Date, hours24: number, minutes: number): Date {
  const next = new Date(date);
  next.setHours(hours24, minutes, 0, 0);
  return next;
}

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
};

export function DateTimePicker({ value, onChange, id, className }: DateTimePickerProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const committed = parseDatetimeLocalValue(value) ?? new Date();
  const [draft, setDraft] = useState(committed);
  const [viewMonth, setViewMonth] = useState(() => startOfDay(committed));

  useEffect(() => {
    if (!open) return;
    const next = parseDatetimeLocalValue(value) ?? new Date();
    setDraft(next);
    setViewMonth(startOfDay(next));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const hours24 = draft.getHours();
  const minutes = draft.getMinutes();
  const hour12 = hours24 % 12 || 12;
  const period: "am" | "pm" = hours24 >= 12 ? "pm" : "am";
  const monthCells = buildMonthGrid(viewMonth);
  const today = startOfDay(new Date());

  const commit = () => {
    onChange(toDatetimeLocalValue(draft));
    setOpen(false);
  };

  const setHour12 = (nextHour: number, nextPeriod: "am" | "pm") => {
    let hours = nextHour % 12;
    if (nextPeriod === "pm") hours += 12;
    setDraft(setTimeOnDate(draft, hours, minutes));
  };

  const setMinutes = (nextMinutes: number) => {
    setDraft(setTimeOnDate(draft, hours24, nextMinutes));
  };

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          id={inputId}
          readOnly
          value={formatDatetimeDisplay(value)}
          placeholder="Select date and time"
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-9 pl-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <button
          type="button"
          aria-label="Open date and time picker"
          onClick={() => setOpen(true)}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-[min(100vw-24px,420px)] overflow-hidden rounded-lg border border-input bg-white shadow-lg">
          <div className="grid grid-cols-[1fr_auto]">
            <div className="border-r border-input p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">
                  {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    className="rounded px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
                    }
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    className="rounded px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
                    }
                  >
                    ▼
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-1 font-medium">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthCells.map(({ date, inMonth }) => {
                  const selected = sameDay(date, draft);
                  const isToday = sameDay(date, today);
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => setDraft(setTimeOnDate(date, hours24, minutes))}
                      className={cn(
                        "h-8 rounded text-sm",
                        !inMonth && "text-muted-foreground/60",
                        selected && "bg-[#0078d4] text-white",
                        !selected && isToday && "border border-input",
                        !selected && "hover:bg-muted",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="font-medium text-[#0078d4] hover:underline"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="font-medium text-[#0078d4] hover:underline"
                  onClick={() => {
                    const now = new Date();
                    setDraft(now);
                    setViewMonth(startOfDay(now));
                  }}
                >
                  Today
                </button>
              </div>
            </div>

            <div className="flex flex-col p-2">
              <div className="flex flex-1">
                <TimeColumn
                  label="Hours"
                  values={Array.from({ length: 12 }, (_, i) => i + 1)}
                  selected={hour12}
                  format={(v) => pad2(v)}
                  onSelect={(v) => setHour12(v, period)}
                />
                <TimeColumn
                  label="Minutes"
                  values={Array.from({ length: 60 }, (_, i) => i)}
                  selected={minutes}
                  format={(v) => pad2(v)}
                  onSelect={setMinutes}
                />
                <TimeColumn
                  label="Period"
                  values={["am", "pm"] as const}
                  selected={period}
                  format={(v) => v}
                  onSelect={(v) => setHour12(hour12, v)}
                />
              </div>
              <div className="mt-2 flex justify-end text-sm">
                <button
                  type="button"
                  className="font-medium text-[#0078d4] hover:underline"
                  onClick={commit}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeColumn<T extends string | number>({
  label,
  values,
  selected,
  format,
  onSelect,
}: {
  label: string;
  values: readonly T[];
  selected: T;
  format: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex w-12 flex-col">
      <div className="sr-only">{label}</div>
      <div className="max-h-56 overflow-y-auto">
        {values.map((value) => {
          const isSelected = value === selected;
          return (
            <button
              key={String(value)}
              type="button"
              onClick={() => onSelect(value)}
              className={cn(
                "block w-full rounded px-1 py-1 text-center text-sm",
                isSelected ? "bg-[#0078d4] text-white" : "text-foreground hover:bg-muted",
              )}
            >
              {format(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
