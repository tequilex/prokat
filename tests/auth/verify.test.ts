import { describe, it, expect } from "vitest";
import { fakeAuthStore } from "../fixtures/auth-store";
import { confirmEmail } from "@/lib/auth/flows";
import { issueToken } from "@/lib/auth/email-tokens";

describe("confirmEmail", () => {
  it("marks the email verified and issues a session", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "hash" }]);
    const token = await issueToken(fake.store, "u1", "verify");

    const res = await confirmEmail(fake.store, token);

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.sessionToken).toBe("sess-1");
    expect(fake.users[0].emailVerified).toBeInstanceOf(Date);
  });

  it("refuses an unknown token", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "hash" }]);
    expect(await confirmEmail(fake.store, "nope")).toEqual({ ok: false });
    expect(fake.sessions).toHaveLength(0);
  });

  it("refuses an expired token", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "hash" }]);
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const token = await issueToken(fake.store, "u1", "verify", past);

    expect(await confirmEmail(fake.store, token)).toEqual({ ok: false });
    expect(fake.users[0].emailVerified).toBeNull();
  });

  it("refuses a reset token presented to the verify route", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "hash" }]);
    const token = await issueToken(fake.store, "u1", "reset");
    expect(await confirmEmail(fake.store, token)).toEqual({ ok: false });
  });

  it("does not apply the domain blocklist — the account already exists", async () => {
    // Отказ здесь сделал бы аккаунт невосстановимым: войти нельзя (не подтверждён),
    // подтвердить нельзя (домен в списке).
    const fake = fakeAuthStore([{ email: "a@gmail.com", passwordHash: "hash" }]);
    const token = await issueToken(fake.store, "u1", "verify");

    expect((await confirmEmail(fake.store, token)).ok).toBe(true);
    expect(fake.users[0].emailVerified).toBeInstanceOf(Date);
  });

  it("accepts a second click inside the grace window (mail scanners burn links)", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "hash" }]);
    const token = await issueToken(fake.store, "u1", "verify");

    expect((await confirmEmail(fake.store, token)).ok).toBe(true);
    expect((await confirmEmail(fake.store, token)).ok).toBe(true);
    expect(fake.sessions).toHaveLength(2);
  });
});
