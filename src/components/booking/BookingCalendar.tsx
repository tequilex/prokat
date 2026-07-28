"use client";

import { DayPicker } from "react-day-picker";
import { ru } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { freeQty, type DayLoad } from "@/lib/catalog/availability";

function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Календарь выбора дат с учётом занятости. Занятые дни (свободно < qty) показаны
// и заблокированы. Логика выбора (pickup → dropoff) живёт в BookingWidget:
// сюда приходят from/to (пустые = ничего не выбрано), клик по дню уходит вверх.
export function BookingCalendar({
  from, to, onDayPick, today, maxDate, availability, quantity, qty,
}: {
  from: string;
  to: string;
  onDayPick: (date: string) => void;
  today: string;
  maxDate: string;
  availability: Record<string, DayLoad>;
  quantity: number;
  qty: number;
}) {
  const isBooked = (date: Date) => freeQty(quantity, availability[fmt(date)]) < qty;
  const isDisabled = (date: Date) => {
    const k = fmt(date);
    return k < today || k > maxDate || isBooked(date);
  };

  // Пусто → выбора нет; только from → одиночный день (ждём «Вернуть»).
  const selected = from ? { from: parse(from), to: parse(to || from) } : undefined;

  return (
    <div className="rdp-theme">
      <DayPicker
        locale={ru}
        mode="range"
        selected={selected}
        onSelect={() => {}}
        onDayClick={(date) => { if (!isDisabled(date)) onDayPick(fmt(date)); }}
        disabled={[{ before: parse(today) }, { after: parse(maxDate) }, isBooked]}
        modifiers={{ booked: isBooked, past: (date) => fmt(date) < today }}
        modifiersClassNames={{ booked: "rdp-booked", past: "rdp-past" }}
        startMonth={parse(today)}
        endMonth={parse(maxDate)}
        weekStartsOn={1}
        showOutsideDays
      />
    </div>
  );
}
