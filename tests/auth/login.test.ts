import { describe, it, expect } from "vitest";
import { fakeAuthStore } from "../fixtures/auth-store";
import { loginWithPassword } from "@/lib/auth/flows";
import { hashPassword } from "@/lib/auth/password";

const PASSWORD = "normalnyi-parol";

async function userWithPassword(over: Record<string, unknown> = {}) {
  return { email: "a@ya.ru", passwordHash: await hashPassword(PASSWORD), emailVerified: new Date(), ...over };
}

describe("loginWithPassword", () => {
  it("issues a session on a correct password", async () => {
    const fake = fakeAuthStore([await userWithPassword()]);
    const res = await loginWithPassword(fake.store, { email: " A@Ya.RU ", password: PASSWORD });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.sessionToken).toBe("sess-1");
    expect(fake.sessions).toHaveLength(1);
  });

  it("returns the same error for unknown email and wrong password", async () => {
    const fake = fakeAuthStore([await userWithPassword()]);
    const unknown = await loginWithPassword(fake.store, { email: "nobody@ya.ru", password: PASSWORD });
    const wrong = await loginWithPassword(fake.store, { email: "a@ya.ru", password: "wrong-password" });

    expect(unknown).toEqual({ ok: false, error: "invalid_credentials" });
    expect(wrong).toEqual({ ok: false, error: "invalid_credentials" });
    expect(fake.sessions).toHaveLength(0);
  });

  it("points to OAuth when the user has accounts but no password", async () => {
    const fake = fakeAuthStore([{ email: "a@ya.ru", hasOAuthAccounts: true }]);
    expect(await loginWithPassword(fake.store, { email: "a@ya.ru", password: PASSWORD }))
      .toEqual({ ok: false, error: "use_oauth" });
  });

  it("behaves as unknown when the user has neither password nor accounts", async () => {
    // Аккаунт без способов входа (seed, dev-логин): подсказывать нечего.
    const fake = fakeAuthStore([{ email: "owner1@seed.local" }]);
    expect(await loginWithPassword(fake.store, { email: "owner1@seed.local", password: PASSWORD }))
      .toEqual({ ok: false, error: "invalid_credentials" });
  });

  it("refuses an unverified account and offers to resend", async () => {
    const fake = fakeAuthStore([await userWithPassword({ emailVerified: null })]);
    expect(await loginWithPassword(fake.store, { email: "a@ya.ru", password: PASSWORD }))
      .toEqual({ ok: false, error: "email_not_verified" });
    expect(fake.sessions).toHaveLength(0);
  });

  it("checks the password before complaining about verification", async () => {
    // Иначе форма подтверждает существование аккаунта тому, кто пароля не знает.
    const fake = fakeAuthStore([await userWithPassword({ emailVerified: null })]);
    expect(await loginWithPassword(fake.store, { email: "a@ya.ru", password: "wrong-password" }))
      .toEqual({ ok: false, error: "invalid_credentials" });
  });

  it("issues a session for a banned user — the guard redirects later", async () => {
    const fake = fakeAuthStore([await userWithPassword({ bannedAt: new Date() })]);
    expect((await loginWithPassword(fake.store, { email: "a@ya.ru", password: PASSWORD })).ok).toBe(true);
  });
});
