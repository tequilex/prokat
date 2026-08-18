// In-memory rate limiter — single-instance деплой (Hetzner V1).
// TODO(phase-2): persistent backend (Redis/Postgres) при scale-out.
//
// Ключ — произвольная строка: для доменных действий это userId, для входа и
// писем — почта, IP или их пара.

export type LimitKind =
  | "comment" | "post" | "booking" | "login" | "register" | "resend" | "reset"
  | "mail_ip" | "mail_daily" | "password_change";

// Потолок отправки на весь сервис за сутки. Яндекс даёт 300 писем в сутки по
// SMTP и режет раньше, если письма однотипные, — упереться хочется в свой
// счётчик, а не в блокировку ящика, из которой сервис сам не выберется.
export const MAIL_DAILY_CAP = 250;
// Общий ключ: лимит один на всех, отправитель значения не имеет.
export const MAIL_DAILY_KEY = "service";
export type LimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; reason: "gap" | "window" };

interface Rule { windowMs: number; maxInWindow: number; gapMs: number; }

const RULES: Record<LimitKind, Rule> = {
  comment: { windowMs: 60 * 60 * 1000, maxInWindow: 20, gapMs: 10_000 },
  post:    { windowMs: 60 * 60 * 1000, maxInWindow: 5,  gapMs: 30_000 },
  // Антиспам заявок вместо СМС-верификации (по ТЗ): 5 заявок в час, пауза 30с.
  booking: { windowMs: 60 * 60 * 1000, maxInWindow: 5,  gapMs: 30_000 },
  // Вход: паузы нет, работает счётчик попыток.
  login:    { windowMs: 15 * 60 * 1000, maxInWindow: 10, gapMs: 0 },
  register: { windowMs: 60 * 60 * 1000, maxInWindow: 5,  gapMs: 5_000 },
  resend:   { windowMs: 60 * 60 * 1000, maxInWindow: 5,  gapMs: 60_000 },
  reset:    { windowMs: 60 * 60 * 1000, maxInWindow: 3,  gapMs: 60_000 },
  // Второй контур для всего, что шлёт письма: лимит по почте не мешает бомбить
  // разные ящики, а смена IP снимала бы лимит по почте.
  mail_ip:  { windowMs: 60 * 60 * 1000, maxInWindow: 10, gapMs: 0 },
  // Третий контур, общий: и почта, и IP считаются по своему ключу, поэтому
  // рассылка с десятка адресов проходит оба и выедает суточную квоту провайдера.
  mail_daily: { windowMs: 24 * 60 * 60 * 1000, maxInWindow: MAIL_DAILY_CAP, gapMs: 0 },
  // Ключ — userId. Без лимита поле «текущий пароль» — оракул для перебора.
  password_change: { windowMs: 15 * 60 * 1000, maxInWindow: 5, gapMs: 0 },
};

const MAX_KEYS = 10_000;
const store = new Map<string, number[]>();

function evictIfFull(): void {
  if (store.size < MAX_KEYS) return;
  const firstKey = store.keys().next().value;
  if (firstKey !== undefined) store.delete(firstKey);
}

export function checkLimit(subject: string, kind: LimitKind): LimitResult {
  const rule = RULES[kind];
  const now = Date.now();
  const key = `${subject}:${kind}`;
  const arr = store.get(key) ?? [];

  const fresh = arr.filter((t) => now - t < rule.windowMs);

  if (fresh.length > 0) {
    const last = fresh[fresh.length - 1];
    if (now - last < rule.gapMs) {
      return { ok: false, retryAfterSec: Math.ceil((rule.gapMs - (now - last)) / 1000), reason: "gap" };
    }
  }

  if (fresh.length >= rule.maxInWindow) {
    const oldest = fresh[0];
    return { ok: false, retryAfterSec: Math.ceil((rule.windowMs - (now - oldest)) / 1000), reason: "window" };
  }

  fresh.push(now);
  if (store.has(key)) store.delete(key);
  evictIfFull();
  store.set(key, fresh);
  return { ok: true };
}

export function _resetForTests(): void { store.clear(); }
