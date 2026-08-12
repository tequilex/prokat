import type { AuthStore, AuthUser, StoredToken, TokenPurpose } from "@/lib/auth/store";

// Реализация порта в памяти. Сценарные тесты флоу входа гоняются на ней —
// живого Postgres в тестах нет, drizzle-реализация проверяется руками.

export type FakeStore = {
  store: AuthStore;
  users: AuthUser[];
  tokens: StoredToken[];
  sessions: Array<{ token: string; userId: string }>;
  accounts: Array<{ userId: string; provider: string; providerAccountId: string }>;
  // Рычаг для теста отката: следующий createUserWithAccount упадёт после вставки юзера.
  failNextAccountInsert(): void;
};

export function fakeAuthStore(seed: Partial<AuthUser>[] = []): FakeStore {
  const users: AuthUser[] = seed.map((u, i) => ({
    id: u.id ?? `u${i + 1}`,
    email: u.email ?? `u${i + 1}@ya.ru`,
    name: u.name ?? null,
    passwordHash: u.passwordHash ?? null,
    emailVerified: u.emailVerified ?? null,
    bannedAt: u.bannedAt ?? null,
    hasOAuthAccounts: u.hasOAuthAccounts ?? false,
  }));
  const tokens: StoredToken[] = [];
  const sessions: Array<{ token: string; userId: string }> = [];
  const accounts: Array<{ userId: string; provider: string; providerAccountId: string }> = [];
  for (const u of users) {
    if (u.hasOAuthAccounts) accounts.push({ userId: u.id, provider: "vk", providerAccountId: `acc-${u.id}` });
  }

  let nextId = users.length + 1;
  let failAccountInsert = false;

  const store: AuthStore = {
    async findUserByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async findUserById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async createUser(email, passwordHash, name) {
      const user: AuthUser = {
        id: `u${nextId++}`, email, passwordHash, name,
        emailVerified: null, bannedAt: null, hasOAuthAccounts: false,
      };
      users.push(user);
      return user;
    },
    async setPassword(userId, passwordHash, name) {
      const u = users.find((x) => x.id === userId);
      if (!u) return;
      u.passwordHash = passwordHash;
      if (name !== undefined) u.name = name;
    },
    async markEmailVerified(userId) {
      const u = users.find((x) => x.id === userId);
      if (u) u.emailVerified = new Date();
    },

    async findUserIdByAccount(provider, providerAccountId) {
      return accounts.find((a) => a.provider === provider && a.providerAccountId === providerAccountId)?.userId ?? null;
    },
    async createUserWithAccount(input) {
      if (users.some((u) => u.email === input.email)) return { ok: false, reason: "email_taken" };
      const user: AuthUser = {
        id: `u${nextId++}`, email: input.email, name: input.name, passwordHash: null,
        emailVerified: null, bannedAt: null, hasOAuthAccounts: true,
      };
      users.push(user);
      if (failAccountInsert) {
        // Имитация транзакции: вставка аккаунта упала — юзер откатывается.
        failAccountInsert = false;
        users.pop();
        throw new Error("account insert failed");
      }
      accounts.push({ userId: user.id, provider: input.provider, providerAccountId: input.providerAccountId });
      return { ok: true, userId: user.id };
    },

    async insertToken(t) { tokens.push({ ...t }); },
    async findTokenByHash(tokenHash) { return tokens.find((t) => t.tokenHash === tokenHash) ?? null; },
    async markTokenUsed(id, usedAt) {
      const t = tokens.find((x) => x.id === id);
      if (t) t.usedAt = usedAt;
    },
    async deleteTokens(userId: string, purpose: TokenPurpose) {
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].userId === userId && tokens[i].purpose === purpose) tokens.splice(i, 1);
      }
    },
    async deleteExpiredTokens(userId, now) {
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].userId === userId && tokens[i].expiresAt.getTime() < now.getTime()) tokens.splice(i, 1);
      }
    },

    async issueSession(userId) {
      const token = `sess-${sessions.length + 1}`;
      sessions.push({ token, userId });
      return { sessionToken: token, expires: new Date(Date.now() + 1000) };
    },
    async dropAllSessions(userId) {
      for (let i = sessions.length - 1; i >= 0; i--) {
        if (sessions[i].userId === userId) sessions.splice(i, 1);
      }
    },
  };

  return { store, users, tokens, sessions, accounts, failNextAccountInsert: () => { failAccountInsert = true; } };
}
