import { describe, it, expect, vi } from "vitest";
import { fakeAuthStore } from "../fixtures/auth-store";
import { registerWithPassword, resendVerification } from "@/lib/auth/flows";
import { verifyPassword } from "@/lib/auth/password";
import type { Mail } from "@/lib/mail/mailer";

function deps(store: ReturnType<typeof fakeAuthStore>["store"], over: Partial<{ transportAvailable: boolean }> = {}) {
  const sent: Mail[] = [];
  return {
    sent,
    deps: {
      store,
      sendMail: async (m: Mail) => { sent.push(m); },
      baseUrl: "https://example.ru",
      blockedExtra: [] as readonly string[],
      transportAvailable: over.transportAvailable ?? true,
    },
  };
}

describe("registerWithPassword", () => {
  it("creates an unverified user and sends a verify email", async () => {
    const fake = fakeAuthStore();
    const { deps: d, sent } = deps(fake.store);

    const res = await registerWithPassword(d, { email: " A@Ya.ru ", name: "Марина", password: "normalnyi-parol" });

    expect(res).toEqual({ ok: true, sentTo: "a@ya.ru" });
    expect(fake.users).toHaveLength(1);
    expect(fake.users[0].email).toBe("a@ya.ru");
    expect(fake.users[0].emailVerified).toBeNull();
    expect(await verifyPassword(fake.users[0].passwordHash!, "normalnyi-parol")).toBe(true);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("a@ya.ru");
    expect(sent[0].text).toContain("https://example.ru/api/auth/email/verify?token=");
  });

  it("rejects a blocked domain", async () => {
    const fake = fakeAuthStore();
    const { deps: d, sent } = deps(fake.store);
    const res = await registerWithPassword(d, { email: "a@gmail.com", name: "Марина", password: "normalnyi-parol" });

    expect(res).toMatchObject({ ok: false, error: "blocked_domain", domain: "gmail.com" });
    expect(fake.users).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("rejects a malformed email", async () => {
    const fake = fakeAuthStore();
    const res = await registerWithPassword(deps(fake.store).deps, { email: "not-an-email", password: "normalnyi-parol" });
    expect(res).toMatchObject({ ok: false, error: "invalid_email" });
  });

  it("rejects a password shorter than 8 chars", async () => {
    const fake = fakeAuthStore();
    const res = await registerWithPassword(deps(fake.store).deps, { email: "a@ya.ru", password: "short" });
    expect(res).toMatchObject({ ok: false, error: "weak_password" });
    expect(fake.users).toHaveLength(0);
  });

  it("refuses when the email belongs to an OAuth account and leaves the password alone", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", hasOAuthAccounts: true }]);
    const { deps: d, sent } = deps(fake.store);

    const res = await registerWithPassword(d, { email: "a@ya.ru", name: "Марина", password: "normalnyi-parol" });

    expect(res).toMatchObject({ ok: false, error: "oauth_account_exists" });
    expect(fake.users[0].passwordHash).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it("refuses when the email is already verified", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "old", emailVerified: new Date() }]);
    const res = await registerWithPassword(deps(fake.store).deps, { email: "a@ya.ru", name: "Марина", password: "normalnyi-parol" });

    expect(res).toMatchObject({ ok: false, error: "already_registered" });
    expect(fake.users[0].passwordHash).toBe("old");
  });

  it("overwrites the password of an abandoned unverified registration", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "old" }]);
    const { deps: d, sent } = deps(fake.store);

    const res = await registerWithPassword(d, { email: "a@ya.ru", name: "Марина", password: "novyi-parol-123" });

    expect(res).toEqual({ ok: true, sentTo: "a@ya.ru" });
    expect(fake.users).toHaveLength(1);
    expect(await verifyPassword(fake.users[0].passwordHash!, "novyi-parol-123")).toBe(true);
    expect(sent).toHaveLength(1);
  });

  it("claims a user that has neither password nor oauth accounts", async () => {
    // seed-владельцы и /api/dev/login создают ровно такие записи.
    const fake = fakeAuthStore([{ email: "owner1@seed.local" }]);
    const { deps: d } = deps(fake.store);

    const res = await registerWithPassword(d, { email: "owner1@seed.local", name: "Марина", password: "normalnyi-parol" });

    expect(res).toEqual({ ok: true, sentTo: "owner1@seed.local" });
    expect(fake.users).toHaveLength(1);
    expect(fake.users[0].passwordHash).not.toBeNull();
  });

  it("refuses when the mail transport is unavailable", async () => {
    const fake = fakeAuthStore();
    const { deps: d } = deps(fake.store, { transportAvailable: false });

    const res = await registerWithPassword(d, { email: "a@ya.ru", name: "Марина", password: "normalnyi-parol" });

    expect(res).toMatchObject({ ok: false, error: "mail_unavailable" });
    expect(fake.users).toHaveLength(0);
  });

  it("reports a failed send instead of pretending success", async () => {
    const fake = fakeAuthStore();
    const d = {
      store: fake.store,
      sendMail: vi.fn().mockRejectedValue(new Error("smtp down")),
      baseUrl: "https://example.ru",
      blockedExtra: [] as readonly string[],
      transportAvailable: true,
    };

    const res = await registerWithPassword(d, { email: "a@ya.ru", name: "Марина", password: "normalnyi-parol" });

    expect(res).toMatchObject({ ok: false, error: "mail_failed" });
    // Аккаунт остаётся — его можно дожать кнопкой «отправить ещё раз».
    expect(fake.users).toHaveLength(1);
  });
});

describe("resendVerification", () => {
  it("re-issues a verify token and sends the email again", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "hash" }]);
    const { deps: d, sent } = deps(fake.store);

    const res = await resendVerification(d, "a@ya.ru");

    expect(res).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(fake.tokens).toHaveLength(1);
  });

  it("invalidates the previous link when a new one is sent", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "hash" }]);
    const { deps: d } = deps(fake.store);

    await resendVerification(d, "a@ya.ru");
    const firstHash = fake.tokens[0].tokenHash;
    await resendVerification(d, "a@ya.ru");

    expect(fake.tokens).toHaveLength(1);
    expect(fake.tokens[0].tokenHash).not.toBe(firstHash);
  });

  it("answers identically for unknown, verified and oauth emails", async () => {
    const fake = fakeAuthStore([
      { email: "verified@ya.ru", passwordHash: "hash", emailVerified: new Date() },
      { email: "oauth@ya.ru", hasOAuthAccounts: true },
    ]);
    const { deps: d, sent } = deps(fake.store);

    expect(await resendVerification(d, "unknown@ya.ru")).toEqual({ ok: true });
    expect(await resendVerification(d, "verified@ya.ru")).toEqual({ ok: true });
    expect(await resendVerification(d, "oauth@ya.ru")).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
  });
});

describe("registerWithPassword: имя", () => {
  it("сохраняет имя, введённое при регистрации", async () => {
    const fake = fakeAuthStore();
    const { deps: d } = deps(fake.store);

    await registerWithPassword(d, { email: "a@ya.ru", password: "normalnyi-parol", name: "  Марина  " });

    expect(fake.users[0].name).toBe("Марина");
  });

  it("отклоняет пустое имя и никого не создаёт", async () => {
    const fake = fakeAuthStore();
    const res = await registerWithPassword(deps(fake.store).deps, {
      email: "a@ya.ru", password: "normalnyi-parol", name: "   ",
    });

    expect(res).toMatchObject({ ok: false, error: "invalid_name" });
    expect(fake.users).toHaveLength(0);
  });

  it("отклоняет имя длиннее 100 символов", async () => {
    const fake = fakeAuthStore();
    const res = await registerWithPassword(deps(fake.store).deps, {
      email: "a@ya.ru", password: "normalnyi-parol", name: "я".repeat(101),
    });
    expect(res).toMatchObject({ ok: false, error: "invalid_name" });
  });

  it("пишет имя и при перезаписи брошенной регистрации", async () => {
    // Ветка setPassword: без этого повторная регистрация оставит человека без имени.
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "old" }]);

    await registerWithPassword(deps(fake.store).deps, {
      email: "a@ya.ru", password: "novyi-parol-1", name: "Марина",
    });

    expect(fake.users[0].name).toBe("Марина");
  });
});

describe("registerWithPassword: адрес возврата", () => {
  it("кладёт адрес возврата в ссылку письма", async () => {
    const fake = fakeAuthStore();
    const { deps: d, sent } = deps(fake.store);

    await registerWithPassword(
      { ...d, callbackUrl: "/kazan/bicycles/trek-01j" },
      { email: "a@ya.ru", name: "Марина", password: "normalnyi-parol" },
    );

    expect(sent[0].text).toContain("next=%2Fkazan%2Fbicycles%2Ftrek-01j");
  });

  it("не тащит в письмо подделанный адрес", async () => {
    const fake = fakeAuthStore();
    const { deps: d, sent } = deps(fake.store);

    await registerWithPassword(
      { ...d, callbackUrl: "/\\evil.com" },
      { email: "a@ya.ru", name: "Марина", password: "normalnyi-parol" },
    );

    expect(sent[0].text).not.toContain("evil.com");
    expect(sent[0].text).not.toContain("next=");
  });

  it("без адреса возврата параметра в ссылке нет", async () => {
    const fake = fakeAuthStore();
    const { deps: d, sent } = deps(fake.store);

    await registerWithPassword(d, { email: "a@ya.ru", name: "Марина", password: "normalnyi-parol" });

    expect(sent[0].text).not.toContain("next=");
  });
});
