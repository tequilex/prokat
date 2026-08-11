import { describe, it, expect } from "vitest";
import { fakeAuthStore } from "../fixtures/auth-store";
import { requestPasswordReset, resetPassword } from "@/lib/auth/flows";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueToken } from "@/lib/auth/email-tokens";
import type { Mail } from "@/lib/mail/mailer";

function deps(store: ReturnType<typeof fakeAuthStore>["store"]) {
  const sent: Mail[] = [];
  return {
    sent,
    deps: {
      store,
      sendMail: async (m: Mail) => { sent.push(m); },
      baseUrl: "https://example.ru",
      transportAvailable: true,
      blockedExtra: [] as readonly string[],
    },
  };
}

async function verifiedUser(email = "a@ya.ru") {
  return { email, passwordHash: await hashPassword("staryi-parol"), emailVerified: new Date() };
}

describe("requestPasswordReset", () => {
  it("sends a reset link to a verified password account", async () => {
    const fake = fakeAuthStore([await verifiedUser()]);
    const { deps: d, sent } = deps(fake.store);

    expect(await requestPasswordReset(d, "a@ya.ru")).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("https://example.ru/reset?token=");
  });

  it("answers identically whether or not the email exists", async () => {
    const fake = fakeAuthStore([await verifiedUser()]);
    const { deps: d, sent } = deps(fake.store);

    expect(await requestPasswordReset(d, "nobody@ya.ru")).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
  });

  it("does not issue a token for an oauth-only user", async () => {
    // Иначе через «забыли пароль» можно завести пароль к чужому OAuth-аккаунту.
    const fake = fakeAuthStore([{ email: "a@ya.ru", hasOAuthAccounts: true }]);
    const { deps: d, sent } = deps(fake.store);

    expect(await requestPasswordReset(d, "a@ya.ru")).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
    expect(fake.tokens).toHaveLength(0);
  });

  it("does not issue a token for an unverified account", async () => {
    // Иначе после смены пароля человек попадает в петлю: войти всё равно нельзя.
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "hash" }]);
    const { deps: d, sent } = deps(fake.store);

    expect(await requestPasswordReset(d, "a@ya.ru")).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
  });

  it("invalidates the previous reset link when a new one is requested", async () => {
    const fake = fakeAuthStore([await verifiedUser()]);
    const { deps: d } = deps(fake.store);

    await requestPasswordReset(d, "a@ya.ru");
    const first = fake.tokens[0].tokenHash;
    await requestPasswordReset(d, "a@ya.ru");

    expect(fake.tokens).toHaveLength(1);
    expect(fake.tokens[0].tokenHash).not.toBe(first);
  });
});

describe("resetPassword", () => {
  it("sets the new password, drops every session and logs in", async () => {
    const fake = fakeAuthStore([await verifiedUser()]);
    await fake.store.issueSession("u1");
    await fake.store.issueSession("u1");
    const token = await issueToken(fake.store, "u1", "reset");

    const res = await resetPassword(fake.store, token, "novyi-parol-123");

    expect(res.ok).toBe(true);
    expect(await verifyPassword(fake.users[0].passwordHash!, "novyi-parol-123")).toBe(true);
    // Старые сессии убиты, осталась только выданная сейчас.
    expect(fake.sessions).toHaveLength(1);
  });

  it("deletes the remaining reset tokens", async () => {
    const fake = fakeAuthStore([await verifiedUser()]);
    const token = await issueToken(fake.store, "u1", "reset");

    await resetPassword(fake.store, token, "novyi-parol-123");
    expect(fake.tokens.filter((t) => t.purpose === "reset")).toHaveLength(0);
  });

  it("rejects a reset token presented twice — no grace window here", async () => {
    const fake = fakeAuthStore([await verifiedUser()]);
    const token = await issueToken(fake.store, "u1", "reset");

    await resetPassword(fake.store, token, "novyi-parol-123");
    expect(await resetPassword(fake.store, token, "esche-odin-parol")).toEqual({ ok: false, error: "invalid_token" });
  });

  it("rejects a weak password before touching anything", async () => {
    const fake = fakeAuthStore([await verifiedUser()]);
    const token = await issueToken(fake.store, "u1", "reset");

    const res = await resetPassword(fake.store, token, "short");
    expect(res).toMatchObject({ ok: false, error: "weak_password" });
    expect(await verifyPassword(fake.users[0].passwordHash!, "staryi-parol")).toBe(true);
  });

  it("rejects a verify token presented to the reset flow", async () => {
    const fake = fakeAuthStore([await verifiedUser()]);
    const token = await issueToken(fake.store, "u1", "verify");
    expect(await resetPassword(fake.store, token, "novyi-parol-123")).toEqual({ ok: false, error: "invalid_token" });
  });
});
