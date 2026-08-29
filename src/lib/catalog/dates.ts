import { ruPlural } from "@/lib/plural";
// Дата-хелперы каталога. Работаем в UTC: занятость считается по календарным
// дням, а не по часам, поэтому смещение зоны сервера роли не играет —
// важно лишь единообразие с eachDate() из availability.ts.

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayStr(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDaysStr(dateStr: string, days: number): string {
  const t = Date.parse(`${dateStr}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;

export function weekdayShort(dateStr: string): string {
  return WEEKDAYS_SHORT[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

export function dayOfMonth(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDate();
}

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
] as const;

const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
] as const;

/* «28 авг» — для кнопок и чипов, где полное название распирает контрол. */
export function formatDayMonthShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function formatDayMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}`;
}

/* «августа 2026» — для оборотов вида «на сайте с …». Родительный падеж:
 * Intl без числа дня даёт именительный («август 2026»), и получается
 * «с август». UTC — как у соседей выше, чтобы не зависеть от TZ сервера. */
export function formatMonthYearGen(date: Date): string {
  return `${MONTHS_GEN[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/* Сколько осталось до срока, словами: «2 ч 40 мин», «6 ч», «завтра».
 * Возвращает null, когда срок уже прошёл — вызывающий решает, что показать. */
export function formatTimeLeft(until: Date, now: Date = new Date()): string | null {
  const minutes = Math.floor((until.getTime() - now.getTime()) / 60000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} мин`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
  }
  const days = Math.floor(hours / 24);
  return `${days} ${ruPlural(days, "день", "дня", "дней")}`;
}
