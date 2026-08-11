import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { accounts, emailTokens, users } from "@db/schema";
import { newId } from "@/lib/auth/id";
import { dropAllSessions, issueSession } from "@/lib/auth/session";

// Порт данных для всех флоу входа по почте. Логика пишется поверх него, а не
// поверх drizzle, чтобы сценарные тесты гонялись на реализации в памяти без
// живого Postgres. Drizzle-реализация — тонкая обёртка без ветвлений.

export type TokenPurpose = "verify" | "reset";

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  emailVerified: Date | null;
  bannedAt: Date | null;
  // Дискриминатор коллизий: именно наличие OAuth-привязки, а НЕ emailVerified.
  // У всех OAuth-юзеров emailVerified навсегда NULL, и проверка по нему открывала
  // бы захват чужого аккаунта через «перезапись брошенной регистрации».
  hasOAuthAccounts: boolean;
};

export type StoredToken = {
  id: string;
  userId: string;
  purpose: TokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type CreateWithAccountInput = {
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  providerAccountId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  scope: string;
};

export interface AuthStore {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  createUser(email: string, passwordHash: string): Promise<AuthUser>;
  setPassword(userId: string, passwordHash: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;

  findUserIdByAccount(provider: string, providerAccountId: string): Promise<string | null>;
  createUserWithAccount(
    input: CreateWithAccountInput,
  ): Promise<{ ok: true; userId: string } | { ok: false; reason: "email_taken" }>;

  insertToken(t: StoredToken): Promise<void>;
  findTokenByHash(tokenHash: string): Promise<StoredToken | null>;
  // Время передаётся аргументом, а не берётся системное: иначе льготное окно
  // на повторный клик нечем протестировать и оно молча не истекает.
  markTokenUsed(id: string, usedAt: Date): Promise<void>;
  deleteTokens(userId: string, purpose: TokenPurpose): Promise<void>;
  deleteExpiredTokens(userId: string, now: Date): Promise<void>;

  issueSession(userId: string): Promise<{ sessionToken: string; expires: Date }>;
  dropAllSessions(userId: string): Promise<void>;
}

export function drizzleAuthStore(): AuthStore {
  return {
    async findUserByEmail(email) {
      const db = getDb();
      const rows = await db.select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        emailVerified: users.emailVerified,
        bannedAt: users.bannedAt,
        provider: accounts.provider,
      })
        .from(users)
        .leftJoin(accounts, eq(accounts.userId, users.id))
        .where(eq(users.email, email))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        emailVerified: row.emailVerified,
        bannedAt: row.bannedAt,
        hasOAuthAccounts: row.provider !== null,
      };
    },

    async createUser(email, passwordHash) {
      const id = newId();
      await getDb().insert(users).values({ id, email, passwordHash });
      return { id, email, passwordHash, emailVerified: null, bannedAt: null, hasOAuthAccounts: false };
    },

    async setPassword(userId, passwordHash) {
      await getDb().update(users).set({ passwordHash }).where(eq(users.id, userId));
    },

    async markEmailVerified(userId) {
      await getDb().update(users).set({ emailVerified: new Date() }).where(eq(users.id, userId));
    },

    async findUserIdByAccount(provider, providerAccountId) {
      const rows = await getDb().select({ userId: accounts.userId }).from(accounts)
        .where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)))
        .limit(1);
      return rows[0]?.userId ?? null;
    },

    // Обе вставки в одной транзакции: раньше они шли двумя запросами, и падение
    // второй оставляло юзера-сироту — без пароля и без единой OAuth-привязки.
    async createUserWithAccount(input) {
      const db = getDb();
      const taken = await db.select({ id: users.id }).from(users)
        .where(eq(users.email, input.email)).limit(1);
      if (taken.length > 0) return { ok: false, reason: "email_taken" };

      const userId = newId();
      await db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: userId, email: input.email, name: input.name, image: input.image,
        });
        await tx.insert(accounts).values({
          userId,
          type: "oauth",
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          access_token: input.accessToken,
          refresh_token: input.refreshToken,
          expires_at: input.expiresAt,
          token_type: "Bearer",
          scope: input.scope,
          id_token: null,
          session_state: null,
        });
      });
      return { ok: true, userId };
    },

    async insertToken(t) {
      await getDb().insert(emailTokens).values(t);
    },

    async findTokenByHash(tokenHash) {
      const rows = await getDb().select().from(emailTokens)
        .where(eq(emailTokens.tokenHash, tokenHash)).limit(1);
      return rows[0] ?? null;
    },

    async markTokenUsed(id, usedAt) {
      await getDb().update(emailTokens).set({ usedAt }).where(eq(emailTokens.id, id));
    },

    async deleteTokens(userId, purpose) {
      await getDb().delete(emailTokens)
        .where(and(eq(emailTokens.userId, userId), eq(emailTokens.purpose, purpose)));
    },

    async deleteExpiredTokens(userId, now) {
      await getDb().delete(emailTokens)
        .where(and(eq(emailTokens.userId, userId), lt(emailTokens.expiresAt, now)));
    },

    issueSession,
    dropAllSessions,
  };
}
