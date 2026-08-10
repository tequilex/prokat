// Серверные календари занятости. Без клиентского JS: на SEO-страницах
// календарь — просто разметка. Свободно = quantity - booked - blocked;
// отсутствие строки availability = день полностью свободен.

import { freeQty, type AvailabilityMap } from "@/lib/catalog/availability";
import { addDaysStr, dayOfMonth, weekdayShort } from "@/lib/catalog/dates";

function dayTone(free: number, quantity: number): string {
  if (free <= 0) return "bg-destructive/15 text-muted-foreground line-through";
  if (free < quantity) return "bg-accent/10 text-foreground";
  return "bg-muted text-foreground";
}

// Мини-полоска на 7 дней для карточки в листинге.
export function MiniCalendar({
  quantity, map, from, days = 7,
}: {
  quantity: number;
  map: AvailabilityMap;
  from: string;
  days?: number;
}) {
  const dates = Array.from({ length: days }, (_, i) => addDaysStr(from, i));
  return (
    <div className="flex gap-1" aria-label="Занятость на ближайшую неделю">
      {dates.map((d) => {
        const free = freeQty(quantity, map.get(d));
        return (
          <div
            key={d}
            title={`${d}: свободно ${free} из ${quantity}`}
            className={`flex h-8 w-8 flex-col items-center justify-center rounded-sm text-micro leading-snug ${dayTone(free, quantity)}`}
          >
            <span className="text-muted-foreground">{weekdayShort(d)}</span>
            <span>{dayOfMonth(d)}</span>
          </div>
        );
      })}
    </div>
  );
}

// Полный календарь на несколько недель для страницы позиции.
export function FullCalendar({
  quantity, map, from, weeks = 4,
}: {
  quantity: number;
  map: AvailabilityMap;
  from: string;
  weeks?: number;
}) {
  const dates = Array.from({ length: weeks * 7 }, (_, i) => addDaysStr(from, i));
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {dates.map((d) => {
          const free = freeQty(quantity, map.get(d));
          return (
            <div
              key={d}
              title={`${d}: свободно ${free} из ${quantity}`}
              className={`flex h-12 flex-col items-center justify-center rounded-md text-xs ${dayTone(free, quantity)}`}
            >
              <span className="text-muted-foreground">{weekdayShort(d)}</span>
              <span className="font-medium">{dayOfMonth(d)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-muted" /> свободно</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-accent/10" /> частично занято</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-destructive/15" /> занято</span>
      </div>
    </div>
  );
}
