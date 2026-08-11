import { createHash, randomBytes } from "node:crypto";
import { newId } from "@/lib/auth/id";
import type { AuthStore, TokenPurpose } from "@/lib/auth/store";

const TTL_SECONDS: Record<TokenPurpose, number> = { verify: 24 * 60 * 60, reset: 60 * 60 };

// Почтовые клиенты и корпоративные антивирусы ходят по ссылке раньше человека и
// сжигают токен. Поэтому повторный клик по свежепогашенной ссылке подтверждения
// считается успехом. На reset окно не распространяется: перехваченное письмо не
// должно оставаться рабочим после смены пароля.
const VERIFY_GRACE_MS = 15 * 60 * 1000;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueToken(
  store: AuthStore, userId: string, purpose: TokenPurpose, now = new Date(),
): Promise<string> {
  await store.deleteExpiredTokens(userId, now);
  // Прежние токены удаляем, а не штампуем usedAt: иначе льготное окно оживит их
  // и «отправить письмо ещё раз» перестанет обесценивать прежнюю ссылку.
  await store.deleteTokens(userId, purpose);

  const raw = randomBytes(32).toString("base64url");
  await store.insertToken({
    id: newId(),
    userId,
    purpose,
    tokenHash: hashToken(raw),
    expiresAt: new Date(now.getTime() + TTL_SECONDS[purpose] * 1000),
    usedAt: null,
  });
  return raw;
}

export type ConsumeResult = { ok: true; userId: string } | { ok: false };

export async function consumeToken(
  store: AuthStore, raw: string, purpose: TokenPurpose, now = new Date(),
): Promise<ConsumeResult> {
  const row = await store.findTokenByHash(hashToken(raw));
  if (!row || row.purpose !== purpose) return { ok: false };
  if (row.expiresAt.getTime() <= now.getTime()) return { ok: false };

  if (row.usedAt) {
    const withinGrace = now.getTime() - row.usedAt.getTime() < VERIFY_GRACE_MS;
    if (purpose !== "verify" || !withinGrace) return { ok: false };
    return { ok: true, userId: row.userId };
  }

  await store.markTokenUsed(row.id, now);
  return { ok: true, userId: row.userId };
}
