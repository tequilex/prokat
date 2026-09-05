// Выбор дат/количества живёт в URL query (?from&to&qty): переживает
// OAuth-redirect на чужой origin и восстанавливается после входа без
// sessionStorage. Здесь — чистый разбор и сборка этих параметров.

import { assertDateString } from "@/lib/catalog/availability";
import { addDaysStr } from "@/lib/catalog/dates";

export interface BookingSelection {
  from: string;
  to: string;
  qty: number;
}

export const BOOKING_HORIZON_DAYS = 180;

function isValidDate(s: string | undefined): s is string {
  if (!s) return false;
  try { assertDateString(s); return true; } catch { return false; }
}

// Мусор на входе не ломает страницу — сводится к дефолтам и клампам:
// from ∈ [today, today+horizon], to ∈ [from, today+horizon], qty ∈ [1, maxQty].
export function parseBookingParams(
  sp: { from?: string; to?: string; qty?: string },
  opts: { today: string; maxQty: number; horizonDays?: number },
): BookingSelection {
  const horizon = addDaysStr(opts.today, opts.horizonDays ?? BOOKING_HORIZON_DAYS);

  let from = isValidDate(sp.from) ? sp.from : opts.today;
  if (from < opts.today) from = opts.today;
  if (from > horizon) from = horizon;

  let to = isValidDate(sp.to) ? sp.to : from;
  if (to < from) to = from;
  if (to > horizon) to = horizon;

  const qtyNum = Number(sp.qty);
  const qty = Number.isInteger(qtyNum) ? Math.min(Math.max(qtyNum, 1), opts.maxQty) : 1;

  return { from, to, qty };
}

// Query string для URL страницы позиции. Дефолты (сегодня/сегодня/1) опускаются,
// чтобы canonical-страница без выбора оставалась чистой.
export function buildBookingQuery(sel: BookingSelection, today: string): string {
  const q = new URLSearchParams();
  if (sel.from !== today || sel.to !== sel.from) {
    q.set("from", sel.from);
    q.set("to", sel.to);
  }
  if (sel.qty > 1) q.set("qty", String(sel.qty));
  return q.toString();
}

// Сдвинул ли кламп присланные даты. На странице сдвиг уместен — мусор в URL не
// должен ронять выдачу; в мутации нет: форма, пролежавшая открытой через
// полночь, отправила бы владельцу не те даты, которые человек видел на экране,
// а диалог показывает только «готово».
export function isSelectionShifted(
  requested: { from: string; to: string },
  clamped: BookingSelection,
): boolean {
  return clamped.from !== requested.from || clamped.to !== requested.to;
}

export function rentalDaysCount(sel: BookingSelection): number {
  const ms = Date.parse(`${sel.to}T00:00:00Z`) - Date.parse(`${sel.from}T00:00:00Z`);
  return ms / (24 * 60 * 60 * 1000) + 1;
}
