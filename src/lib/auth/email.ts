import { getEnv } from "@/lib/env";

// Стоп-лист иностранных почтовых сервисов: требование законодательства РФ —
// авторизация должна опираться на российские системы, а не на зарубежную почту.
// Проверяется ТОЛЬКО при регистрации: на подтверждении и сбросе он сделал бы
// уже существующий аккаунт невосстановимым. Расширяется правкой этого списка
// либо BLOCKED_EMAIL_DOMAINS в .env (домен закрывается рестартом, без пересборки).
const BUILT_IN_BLOCKED: readonly string[] = [
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "ymail.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "gmx.com", "zoho.com",
];

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

// extra — расширение списка. Не передан → берётся из env (в тестах передаём явно,
// чтобы не поднимать окружение).
export function isBlockedDomain(email: string, extra?: readonly string[]): boolean {
  const domain = emailDomain(normalizeEmail(email));
  if (!domain) return false;
  const fromEnv = extra ?? getEnv().BLOCKED_EMAIL_DOMAINS ?? [];
  return BUILT_IN_BLOCKED.includes(domain) || fromEnv.includes(domain);
}
