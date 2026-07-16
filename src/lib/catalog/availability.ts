// Чистая логика занятости позиции по дням. Хранение — таблица availability:
// по строке на (listing, date), отсутствие строки = день полностью свободен.
// Свободно в день = quantity - bookedQty - blockedQty.
//
// Даты везде — строки "YYYY-MM-DD" (как их отдаёт pg `date`).
// Диапазон брони [dateFrom, dateTo] включает обе границы: прокат посуточный,
// день возврата тоже занят.

export interface DayLoad {
  bookedQty: number;
  blockedQty: number;
}

export type AvailabilityMap = Map<string, DayLoad>; // date -> load

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertDateString(s: string): void {
  if (!DATE_RE.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) {
    throw new Error(`invalid date string: ${s}`);
  }
}

// Все даты диапазона включительно. Бросает на некорректном диапазоне —
// вызывающий обязан валидировать ввод раньше (zod в форме заявки).
export function eachDate(dateFrom: string, dateTo: string): string[] {
  assertDateString(dateFrom);
  assertDateString(dateTo);
  const from = Date.parse(`${dateFrom}T00:00:00Z`);
  const to = Date.parse(`${dateTo}T00:00:00Z`);
  if (to < from) throw new Error("date_range_inverted");
  const out: string[] = [];
  for (let t = from; t <= to; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function freeQty(quantity: number, load: DayLoad | undefined): number {
  const used = (load?.bookedQty ?? 0) + (load?.blockedQty ?? 0);
  return Math.max(0, quantity - used);
}

// Можно ли подтвердить бронь qty единиц на весь диапазон.
export function canBook(
  quantity: number,
  map: AvailabilityMap,
  dateFrom: string,
  dateTo: string,
  qty: number,
): boolean {
  if (qty < 1) return false;
  return eachDate(dateFrom, dateTo).every((d) => freeQty(quantity, map.get(d)) >= qty);
}

// Дельта бронирования на диапазон: +qty при подтверждении, -qty при освобождении.
// Возвращает новую карту (вход не мутирует); bookedQty не уходит ниже нуля —
// защита от двойного release.
export function applyBookingDelta(
  map: AvailabilityMap,
  dateFrom: string,
  dateTo: string,
  qtyDelta: number,
): AvailabilityMap {
  const next: AvailabilityMap = new Map(map);
  for (const d of eachDate(dateFrom, dateTo)) {
    const cur = next.get(d) ?? { bookedQty: 0, blockedQty: 0 };
    next.set(d, { ...cur, bookedQty: Math.max(0, cur.bookedQty + qtyDelta) });
  }
  return next;
}
