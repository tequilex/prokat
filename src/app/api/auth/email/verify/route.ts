import { NextResponse, type NextRequest } from "next/server";
import { confirmEmail } from "@/lib/auth/flows";
import { safeCallback, sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import { drizzleAuthStore } from "@/lib/auth/store";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Переход по ссылке из письма: подтверждаем почту и сразу логиним, чтобы человек
// не вводил пароль второй раз, и возвращаем на страницу, с которой он начинал.
export async function GET(req: NextRequest) {
  const env = getEnv();
  const token = req.nextUrl.searchParams.get("token");

  if (!token) return NextResponse.redirect(new URL("/login?error=verify_token_invalid", env.NEXTAUTH_URL));

  const res = await confirmEmail(drizzleAuthStore(), token);
  if (!res.ok) {
    return NextResponse.redirect(new URL("/login?error=verify_token_invalid", env.NEXTAUTH_URL));
  }

  // Возвращаем туда, откуда человек ушёл регистрироваться. Параметр приходит
  // из письма, то есть извне, — safeCallback тут единственная защита.
  const next = safeCallback(req.nextUrl.searchParams.get("next"));
  const redirect = NextResponse.redirect(new URL(next, env.NEXTAUTH_URL));
  redirect.cookies.set(sessionCookieName(), res.sessionToken, sessionCookieOptions(res.expires));
  return redirect;
}
