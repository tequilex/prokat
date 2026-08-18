import { describe, it, expect } from "vitest";
import { fakeAuthStore } from "../fixtures/auth-store";
import { changePassword } from "@/lib/auth/flows";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
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

async function passwordUser(email = "a@ya.ru") {
  return { email, passwordHash: await hashPassword("staryi-parol"), emailVerified: new Date() };
}

describe("changePassword", () => {
  it("меняет пароль при верном текущем", async () => {
    const fake = fakeAuthStore([await passwordUser()]);
    const { deps: d } = deps(fake.store);

    const res = await changePassword(d, {
      userId: "u1", currentPassword: "staryi-parol", newPassword: "novyi-parol-1",
    });
    expect(res).toEqual({ ok: true });
    expect(await verifyPassword(fake.users[0].passwordHash!, "novyi-parol-1")).toBe(true);
  });

  it("закрывает остальные сессии, текущая живёт", async () => {
    // Текущую нельзя трогать: Next перерисовывает страницу после экшена ещё со
    // старой кукой, и убитая текущая сессия выглядит как разлогин на месте.
    const fake = fakeAuthStore([await passwordUser(), { email: "b@ya.ru" }]);
    const mine = await fake.store.issueSession("u1");    // текущая
    await fake.store.issueSession("u1");                 // «сессия в кафе»
    const alien = await fake.store.issueSession("u2");   // чужая — не трогаем
    const { deps: d } = deps(fake.store);

    const res = await changePassword(d, {
      userId: "u1", currentPassword: "staryi-parol", newPassword: "novyi-parol-1",
      keepSessionToken: mine.sessionToken,
    });
    expect(res).toEqual({ ok: true });
    expect(fake.sessions.map((s) => s.token).sort()).toEqual(
      [mine.sessionToken, alien.sessionToken].sort(),
    );
  });

  it("без токена текущей сессии закрывает все", async () => {
    // Кука обязана быть у залогиненного; если её вдруг нет — безопаснее убить всё.
    const fake = fakeAuthStore([await passwordUser()]);
    await fake.store.issueSession("u1");
    const { deps: d } = deps(fake.store);

    const res = await changePassword(d, {
      userId: "u1", currentPassword: "staryi-parol", newPassword: "novyi-parol-1",
    });
    expect(res).toEqual({ ok: true });
    expect(fake.sessions).toHaveLength(0);
  });

  it("шлёт письмо-уведомление на почту аккаунта", async () => {
    const fake = fakeAuthStore([await passwordUser()]);
    const { deps: d, sent } = deps(fake.store);

    await changePassword(d, { userId: "u1", currentPassword: "staryi-parol", newPassword: "novyi-parol-1" });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("a@ya.ru");
    // Владельцу нужен рецепт на случай «это был не я»: ссылка на вход со сбросом.
    expect(sent[0].text).toContain("https://example.ru/login");
  });

  it("отклоняет неверный текущий пароль, ничего не меняя", async () => {
    const fake = fakeAuthStore([await passwordUser()]);
    await fake.store.issueSession("u1");
    const { deps: d, sent } = deps(fake.store);

    const res = await changePassword(d, {
      userId: "u1", currentPassword: "ne-tot-parol", newPassword: "novyi-parol-1",
    });
    expect(res).toEqual({ ok: false, error: "invalid_current" });
    expect(await verifyPassword(fake.users[0].passwordHash!, "staryi-parol")).toBe(true);
    expect(fake.sessions).toHaveLength(1);
    expect(sent).toHaveLength(0);
  });

  it("отклоняет слабый новый пароль", async () => {
    const fake = fakeAuthStore([await passwordUser()]);
    const { deps: d } = deps(fake.store);

    const res = await changePassword(d, {
      userId: "u1", currentPassword: "staryi-parol", newPassword: "short",
    });
    expect(res).toMatchObject({ ok: false, error: "weak_password" });
    expect(await verifyPassword(fake.users[0].passwordHash!, "staryi-parol")).toBe(true);
  });

  it("отказывает аккаунту без пароля (OAuth)", async () => {
    const fake = fakeAuthStore([{ email: "vk@ya.ru", hasOAuthAccounts: true }]);
    const { deps: d } = deps(fake.store);

    const res = await changePassword(d, {
      userId: "u1", currentPassword: "whatever-123", newPassword: "novyi-parol-1",
    });
    expect(res).toEqual({ ok: false, error: "no_password" });
  });

  it("смена проходит, даже если письмо не ушло", async () => {
    const fake = fakeAuthStore([await passwordUser()]);
    const { deps: d } = deps(fake.store);
    d.sendMail = async () => { throw new Error("smtp down"); };

    const res = await changePassword(d, {
      userId: "u1", currentPassword: "staryi-parol", newPassword: "novyi-parol-1",
    });
    expect(res).toEqual({ ok: true });
    expect(await verifyPassword(fake.users[0].passwordHash!, "novyi-parol-1")).toBe(true);
  });
});
