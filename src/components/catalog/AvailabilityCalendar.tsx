// Серверные календари занятости. Без клиентского JS: на SEO-страницах
// календарь — просто разметка. Свободно = quantity - booked - blocked;
// отсутствие строки availability = день полностью свободен.

import { freeQty, type AvailabilityMap } from "@/lib/catalog/availability";
import { addDaysStr, dayOfMonth, weekdayShort } from "@/lib/catalog/dates";

// «Свободно» — не состояние, а норма: заливки не получает. Заливкой отмечено
// только то, что мешает взять вещь. Раньше свободное красилось --color-muted,
// и на выровненной шкале нейтралей оно сходилось с охряным тинтом в 1.00 —
// легенда показывала один цвет дважды.
//
// Занятое вдобавок зачёркнуто: различать состояния одним цветом нельзя,
// охра и красный в этих тинтах дают одинаковую светлоту.
function dayTone(free: number, quantity: number): string {
  if (free <= 0) return "bg-destructive/15 text-muted-foreground line-through";
  if (free < quantity) return "bg-accent/[0.18] text-foreground";
  return "text-foreground";
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
              className={`flex h-12 flex-col items-center justify-center rounded-lg text-xs ${dayTone(free, quantity)}`}
            >
              <span className="text-muted-foreground">{weekdayShort(d)}</span>
              <span className="font-medium">{dayOfMonth(d)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm border border-muted-foreground" /> свободно</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-accent/[0.18]" /> частично занято</span>
        <span className="flex items-center gap-1"><i aria-hidden="true" className="inline-flex h-3 w-3 items-center justify-center rounded-sm bg-destructive/15 text-[9px] leading-none text-destructive">×</i> занято</span>
      </div>
    </div>
  );
}
