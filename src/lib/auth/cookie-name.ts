// Имя session-cookie и извлечение токена. Модуль намеренно не тянет ничего из
// приложения: его берут три разных места, и одно из них — отдельный процесс
// realtime, который живёт вне Next и позвать getEnv() не может (тот тянет всю
// прод-схему окружения).
//
// До этого имя было продублировано трижды: здесь, в middleware и в его тесте.
// Расходились бы они молча — в деве префикса нет, в проде есть.

import { parseCookie } from "cookie";

// Auth.js v5 в production использует префикс `__Secure-`, в dev — голый.
// Само имя — `authjs.session-token` (NextAuth v5 переименовал из next-auth).
export const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

// URL приходит аргументом, а не из окружения: у каждого вызывающего свой способ
// его получить, и зависимости на конкретный парсер тут быть не должно.
export function sessionCookieNameFor(baseUrl: string): string {
  return baseUrl.startsWith("https://")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

// Токен сессии из сырого заголовка Cookie. Нужен процессу realtime: ws отдаёт
// http.IncomingMessage, где cookie лежит строкой, а не разобранной коллекцией.
//
// Разбор берётся из пакета, а не пишется руками: место security-релевантное —
// наивные split(";") + startsWith принимают `xauthjs.session-token` за
// `authjs.session-token`. В cookie@2 функция называется parseCookie, не parse.
export function sessionTokenFromHeader(
  cookieHeader: string | undefined | null,
  baseUrl: string,
): string | null {
  if (!cookieHeader) return null;
  const jar = parseCookie(cookieHeader);
  return jar[sessionCookieNameFor(baseUrl)] ?? null;
}
