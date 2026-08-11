import { describe, it, expect } from "vitest";
import { fakeAuthStore } from "../fixtures/auth-store";
import type { StoredToken } from "@/lib/auth/store";

function token(over: Partial<StoredToken> = {}): StoredToken {
  return {
    id: over.id ?? "t1",
    userId: over.userId ?? "u1",
    purpose: over.purpose ?? "verify",
    tokenHash: over.tokenHash ?? "hash-1",
    expiresAt: over.expiresAt ?? new Date(Date.now() + 60_000),
    usedAt: over.usedAt ?? null,
  };
}

describe("fakeAuthStore: users", () => {
  it("creates and finds a user, then sets the password", async () => {
    const { store } = fakeAuthStore();
    const created = await store.createUser("a@ya.ru", "hash");
    expect(await store.findUserByEmail("a@ya.ru")).toMatchObject({ id: created.id, passwordHash: "hash" });

    await store.setPassword(created.id, "hash-2");
    expect((await store.findUserByEmail("a@ya.ru"))?.passwordHash).toBe("hash-2");
  });

  it("marks the email verified", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    await store.markEmailVerified("u1");
    expect((await store.findUserByEmail("a@ya.ru"))?.emailVerified).toBeInstanceOf(Date);
  });

  it("drops every session of the user and keeps the others", async () => {
    const { store, sessions } = fakeAuthStore([{ email: "a@ya.ru" }, { email: "b@ya.ru" }]);
    await store.issueSession("u1");
    await store.issueSession("u1");
    await store.issueSession("u2");

    await store.dropAllSessions("u1");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId).toBe("u2");
  });
});

describe("fakeAuthStore: oauth accounts", () => {
  it("finds a user by the accounts row", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru", hasOAuthAccounts: true }]);
    expect(await store.findUserIdByAccount("vk", "acc-u1")).toBe("u1");
    expect(await store.findUserIdByAccount("vk", "nope")).toBeNull();
  });

  it("refuses to create a user when the email is taken", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const res = await store.createUserWithAccount({
      email: "a@ya.ru", name: null, image: null,
      provider: "vk", providerAccountId: "vk-1",
      accessToken: "t", refreshToken: null, expiresAt: null, scope: "email",
    });
    expect(res).toEqual({ ok: false, reason: "email_taken" });
  });

  it("rolls back when the account insert fails", async () => {
    const fake = fakeAuthStore();
    fake.failNextAccountInsert();
    await expect(fake.store.createUserWithAccount({
      email: "new@ya.ru", name: null, image: null,
      provider: "vk", providerAccountId: "vk-1",
      accessToken: "t", refreshToken: null, expiresAt: null, scope: "email",
    })).rejects.toThrow();

    expect(fake.users).toHaveLength(0);
    expect(await fake.store.findUserByEmail("new@ya.ru")).toBeNull();
  });
});

describe("fakeAuthStore: tokens", () => {
  it("deletes only the requested purpose", async () => {
    const { store, tokens } = fakeAuthStore([{ email: "a@ya.ru" }]);
    await store.insertToken(token({ id: "t1", purpose: "verify", tokenHash: "h1" }));
    await store.insertToken(token({ id: "t2", purpose: "reset", tokenHash: "h2" }));

    await store.deleteTokens("u1", "verify");
    expect(tokens.map((t) => t.id)).toEqual(["t2"]);
  });

  it("deletes expired tokens and keeps the live ones", async () => {
    const { store, tokens } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const now = new Date();
    await store.insertToken(token({ id: "old", tokenHash: "h1", expiresAt: new Date(now.getTime() - 1000) }));
    await store.insertToken(token({ id: "live", tokenHash: "h2", expiresAt: new Date(now.getTime() + 1000) }));

    await store.deleteExpiredTokens("u1", now);
    expect(tokens.map((t) => t.id)).toEqual(["live"]);
  });

  it("stamps usedAt on the token it is given", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    await store.insertToken(token());
    await store.markTokenUsed("t1");
    expect((await store.findTokenByHash("hash-1"))?.usedAt).toBeInstanceOf(Date);
  });
});
