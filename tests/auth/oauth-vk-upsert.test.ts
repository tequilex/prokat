import { describe, it, expect } from "vitest";
import { fakeAuthStore } from "../fixtures/auth-store";
import { upsertUserAndSession } from "@/lib/auth/oauth-vk";
import type { VkProfile } from "@/lib/auth/oauth-vk";

const tokens = { accessToken: "at", refreshToken: null, expiresIn: 3600 };

function profile(over: Partial<VkProfile> = {}): VkProfile {
  return {
    user_id: over.user_id ?? "vk-1",
    // Через ?? нельзя: тест передаёт email: null осознанно.
    email: "email" in over ? over.email ?? null : "vk-user@ya.ru",
    first_name: over.first_name ?? "Иван",
    last_name: over.last_name ?? "Петров",
    avatar: over.avatar ?? null,
  };
}

describe("upsertUserAndSession", () => {
  it("finds an existing user by the accounts row", async () => {
    const fake = fakeAuthStore([{ email: "vk-user@ya.ru", hasOAuthAccounts: true }]);
    // Фикстура заводит привязку с providerAccountId = acc-<userId>.
    const res = await upsertUserAndSession({ profile: profile({ user_id: "acc-u1" }), tokens, store: fake.store });

    expect(res.ok).toBe(true);
    expect(fake.users).toHaveLength(1);
    expect(fake.sessions).toHaveLength(1);
  });

  it("does not link by email anymore", async () => {
    // Аккаунт с паролем на том же адресе: склейка отдала бы его владельцу VK.
    const fake = fakeAuthStore([{ email: "vk-user@ya.ru", passwordHash: "hash", emailVerified: new Date() }]);

    const res = await upsertUserAndSession({ profile: profile(), tokens, store: fake.store });

    expect(res).toEqual({ ok: false, reason: "email_taken" });
    expect(fake.users).toHaveLength(1);
    expect(fake.users[0].passwordHash).toBe("hash");
    expect(fake.sessions).toHaveLength(0);
  });

  it("creates the user and the account together", async () => {
    const fake = fakeAuthStore();
    const res = await upsertUserAndSession({ profile: profile(), tokens, store: fake.store });

    expect(res.ok).toBe(true);
    expect(fake.users).toHaveLength(1);
    expect(fake.accounts).toHaveLength(1);
    expect(fake.sessions).toHaveLength(1);
  });

  it("leaves no orphan user when the account insert fails", async () => {
    const fake = fakeAuthStore();
    fake.failNextAccountInsert();

    await expect(upsertUserAndSession({ profile: profile(), tokens, store: fake.store })).rejects.toThrow();
    expect(fake.users).toHaveLength(0);
  });

  it("uses a placeholder address for a vk account without email", async () => {
    const fake = fakeAuthStore();
    const res = await upsertUserAndSession({ profile: profile({ email: null }), tokens, store: fake.store });

    expect(res.ok).toBe(true);
    expect(fake.users[0].email).toBe("vk-vk-1@vk.placeholder");
  });
});
