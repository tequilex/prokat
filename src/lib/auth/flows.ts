import { emailDomain, isBlockedDomain, normalizeEmail } from "@/lib/auth/email";
import { consumeToken, issueToken } from "@/lib/auth/email-tokens";
import { checkPasswordRules, fakeVerify, hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AuthStore } from "@/lib/auth/store";
import type { Mail } from "@/lib/mail/mailer";
import { resetEmail, verifyEmail, verifyEmailAgain } from "@/lib/mail/templates";

// Чистая логика всех флоу входа по почте: зависимости приходят аргументом,
// поэтому сценарии тестируются без Postgres, SMTP и Next-окружения.
// Server Actions в src/server/actions/auth-email.ts — тонкие обёртки, которые
// собирают эти зависимости и проверяют лимиты.

export type FlowDeps = {
  store: AuthStore;
  sendMail(mail: Mail): Promise<void>;
  baseUrl: string;
  // Доступность транспорта проверяется и здесь, не только в рендере: прямой
  // вызов действия в обход UI завёл бы аккаунт, который невозможно подтвердить.
  transportAvailable: boolean;
  blockedExtra?: readonly string[];
  now?: Date;
};

export type RegisterResult =
  | { ok: true; sentTo: string }
  | { ok: false; error: "blocked_domain"; domain: string | null }
  | { ok: false; error: "weak_password"; message: string }
  | { ok: false; error: "invalid_email" | "oauth_account_exists" | "already_registered" | "mail_unavailable" | "mail_failed" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function verifyLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/auth/email/verify?token=${encodeURIComponent(token)}`;
}

function resetLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/reset?token=${encodeURIComponent(token)}`;
}

export async function registerWithPassword(
  deps: FlowDeps, input: { email: string; password: string },
): Promise<RegisterResult> {
  if (!deps.transportAvailable) return { ok: false, error: "mail_unavailable" };

  const email = normalizeEmail(input.email);
  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalid_email" };
  if (isBlockedDomain(email, deps.blockedExtra)) {
    return { ok: false, error: "blocked_domain", domain: emailDomain(email) };
  }

  const rulesError = checkPasswordRules(input.password, email);
  if (rulesError) return { ok: false, error: "weak_password", message: rulesError };

  const existing = await deps.store.findUserByEmail(email);

  // Порядок проверок принципиален: дискриминатор — строки в accounts, а не
  // emailVerified. У всех OAuth-юзеров emailVerified навсегда NULL, и проверка
  // по нему позволила бы поставить свой пароль на чужой OAuth-аккаунт.
  if (existing?.hasOAuthAccounts) return { ok: false, error: "oauth_account_exists" };
  if (existing?.emailVerified) return { ok: false, error: "already_registered" };

  const passwordHash = await hashPassword(input.password);
  let userId: string;
  if (existing) {
    // Брошенная регистрация или аккаунт вообще без способов входа (seed,
    // dev-логин, сирота от прерванного OAuth). Присвоение безопасно: доступ
    // получит только тот, кто откроет письмо.
    await deps.store.setPassword(existing.id, passwordHash);
    userId = existing.id;
  } else {
    userId = (await deps.store.createUser(email, passwordHash)).id;
  }

  const token = await issueToken(deps.store, userId, "verify", deps.now);
  try {
    await deps.sendMail(verifyEmail(email, verifyLink(deps.baseUrl, token)));
  } catch {
    return { ok: false, error: "mail_failed" };
  }
  return { ok: true, sentTo: email };
}

// Ответ всегда одинаковый: форма не должна работать проверялкой «а есть ли
// такой аккаунт». Письмо уходит только неподтверждённому password-аккаунту.
export async function resendVerification(deps: FlowDeps, rawEmail: string): Promise<{ ok: boolean }> {
  if (!deps.transportAvailable) return { ok: false };

  const email = normalizeEmail(rawEmail);
  const user = await deps.store.findUserByEmail(email);
  if (!user || user.hasOAuthAccounts || !user.passwordHash || user.emailVerified) return { ok: true };

  const token = await issueToken(deps.store, user.id, "verify", deps.now);
  try {
    await deps.sendMail(verifyEmailAgain(email, verifyLink(deps.baseUrl, token)));
  } catch {
    return { ok: true };
  }
  return { ok: true };
}

export type LoginResult =
  | { ok: true; userId: string; sessionToken: string; expires: Date }
  | { ok: false; error: "invalid_credentials" | "use_oauth" | "email_not_verified" };

export async function loginWithPassword(
  store: AuthStore, input: { email: string; password: string },
): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const user = await store.findUserByEmail(email);

  // Юзера нет — всё равно гоняем argon2, иначе время ответа выдаёт, зарегистрирован
  // ли адрес. Аккаунт без единого способа входа ведёт себя так же: войти в него
  // нельзя, и подсказывать нечего.
  if (!user || (!user.passwordHash && !user.hasOAuthAccounts)) {
    await fakeVerify();
    return { ok: false, error: "invalid_credentials" };
  }

  if (!user.passwordHash) return { ok: false, error: "use_oauth" };
  if (!await verifyPassword(user.passwordHash, input.password)) {
    return { ok: false, error: "invalid_credentials" };
  }

  // Проверка подтверждения — после пароля: иначе форма подтверждает существование
  // аккаунта тому, кто пароля не знает.
  if (!user.emailVerified) return { ok: false, error: "email_not_verified" };

  // Забаненного пускаем: сессия выдаётся, requireAuthState уводит на /banned —
  // одна дорога вместо двух, как с VK и Яндексом.
  const session = await store.issueSession(user.id);
  return { ok: true, userId: user.id, ...session };
}

export type ConfirmResult =
  | { ok: true; userId: string; sessionToken: string; expires: Date }
  | { ok: false };

// Стоп-лист доменов здесь НЕ применяется: аккаунт уже существует, а отказ на
// этом шаге сделал бы его невосстановимым — войти нельзя (не подтверждён),
// подтвердить нельзя (домен в списке).
export async function confirmEmail(store: AuthStore, token: string, now = new Date()): Promise<ConfirmResult> {
  const consumed = await consumeToken(store, token, "verify", now);
  if (!consumed.ok) return { ok: false };

  await store.markEmailVerified(consumed.userId);
  const session = await store.issueSession(consumed.userId);
  return { ok: true, userId: consumed.userId, ...session };
}

export { resetEmail, resetLink };
