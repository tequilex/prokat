"use server";

// Вход и регистрация по почте. Здесь только сборка зависимостей, лимиты и
// перевод кодов ошибок в тексты — сама логика в src/lib/auth/flows.ts, чтобы
// её можно было тестировать без Postgres и SMTP.

import { headers } from "next/headers";
import { emailDomain, isBlockedDomain, normalizeEmail } from "@/lib/auth/email";
import { registerWithPassword, resendVerification, type FlowDeps } from "@/lib/auth/flows";
import { drizzleAuthStore } from "@/lib/auth/store";
import { clientIp } from "@/lib/http/client-ip";
import { mailTransportAvailable, sendMail } from "@/lib/mail/mailer";
import { checkLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function flowDeps(): FlowDeps {
  const env = getEnv();
  return {
    store: drizzleAuthStore(),
    sendMail,
    baseUrl: env.NEXTAUTH_URL,
    transportAvailable: mailTransportAvailable(),
    blockedExtra: env.BLOCKED_EMAIL_DOMAINS,
  };
}

async function ip(): Promise<string> {
  return clientIp(await headers());
}

const MESSAGES: Record<string, string> = {
  mail_unavailable: "Регистрация по почте сейчас недоступна — войдите через Яндекс или VK",
  mail_failed: "Не удалось отправить письмо, попробуйте позже",
  invalid_email: "Проверьте адрес почты",
  oauth_account_exists: "Эта почта уже привязана ко входу через Яндекс или VK — войдите этим способом",
  already_registered: "Эта почта уже зарегистрирована — войдите или восстановите пароль",
  rate_limited: "Слишком много попыток, попробуйте позже",
};

export async function register(input: { email: string; password: string }): Promise<ActionResult<{ sentTo: string }>> {
  const limit = checkLimit(await ip(), "register");
  if (!limit.ok) return { ok: false, error: MESSAGES.rate_limited };

  const res = await registerWithPassword(flowDeps(), input);
  if (res.ok) return { ok: true, data: { sentTo: res.sentTo } };

  if (res.error === "blocked_domain") {
    return { ok: false, error: blockedMessage(res.domain) };
  }
  if (res.error === "weak_password") return { ok: false, error: res.message };
  return { ok: false, error: MESSAGES[res.error] ?? "Не удалось зарегистрироваться" };
}

export async function resendVerificationEmail(rawEmail: string): Promise<ActionResult> {
  const email = normalizeEmail(rawEmail);
  const byEmail = checkLimit(email, "resend");
  const byIp = checkLimit(await ip(), "mail_ip");
  // Ответ одинаковый даже при отказе лимитера: иначе форма выдаёт, есть ли аккаунт.
  if (!byEmail.ok || !byIp.ok) return { ok: true, data: undefined };

  await resendVerification(flowDeps(), email);
  return { ok: true, data: undefined };
}

// Дёргается формой на blur: список доменов остаётся на сервере и в браузерный
// бандл не уезжает, но красная строка под полем появляется до отправки.
export async function checkEmailDomain(rawEmail: string): Promise<{ blocked: boolean; message: string | null }> {
  const email = normalizeEmail(rawEmail);
  if (!email.includes("@")) return { blocked: false, message: null };
  if (!isBlockedDomain(email, getEnv().BLOCKED_EMAIL_DOMAINS)) return { blocked: false, message: null };
  return { blocked: true, message: blockedMessage(emailDomain(email)) };
}

function blockedMessage(domain: string | null): string {
  const where = domain ? `с почт ${domain}` : "с этой почты";
  return `Регистрация ${where} не поддерживается — войдите через Яндекс или VK`;
}
