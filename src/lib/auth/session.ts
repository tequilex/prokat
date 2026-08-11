import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sessions } from "@db/schema";
import { getEnv } from "@/lib/env";

// Общий механизм выдачи сессии для всех способов входа: VK, почта с паролем,
// dev-логин. Сессия — строка в БД, cookie хранит только её токен, поэтому
// удаление строки отзывает доступ мгновенно (на этом держится бан).

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const sessionTtlSeconds = SESSION_TTL_SECONDS;

export function sessionCookieName(): string {
  return getEnv().NEXTAUTH_URL.startsWith("https://")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

// Только относительный путь: иначе callbackUrl превращается в открытый редирект.
export function safeCallback(input: string | null | undefined): string {
  if (!input) return "/";
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  return input;
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getEnv().NEXTAUTH_URL.startsWith("https://"),
    path: "/",
    expires,
  };
}

export async function issueSession(userId: string): Promise<{ sessionToken: string; expires: Date }> {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await getDb().insert(sessions).values({ sessionToken, userId, expires });
  return { sessionToken, expires };
}

// Сброс пароля обязан выкидывать все живые сессии: он же реакция на угон.
export async function dropAllSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}
