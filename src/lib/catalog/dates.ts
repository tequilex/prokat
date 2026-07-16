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

export function formatDayMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}`;
}
