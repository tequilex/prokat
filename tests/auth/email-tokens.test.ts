import { describe, it, expect } from "vitest";
import { fakeAuthStore } from "../fixtures/auth-store";
import { consumeToken, hashToken, issueToken } from "@/lib/auth/email-tokens";

const NOW = new Date("2026-08-11T12:00:00Z");
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

describe("issueToken", () => {
  it("returns a raw token and stores only its hash", async () => {
    const { store, tokens } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const raw = await issueToken(store, "u1", "verify", NOW);

    expect(raw).toHaveLength(43); // 32 байта в base64url
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toBe(hashToken(raw));
    expect(tokens[0].tokenHash).not.toBe(raw);
  });

  it("gives verify 24 hours and reset 1 hour", async () => {
    const { store, tokens } = fakeAuthStore([{ email: "a@ya.ru" }]);
    await issueToken(store, "u1", "verify", NOW);
    await issueToken(store, "u1", "reset", NOW);

    const verify = tokens.find((t) => t.purpose === "verify")!;
    const reset = tokens.find((t) => t.purpose === "reset")!;
    expect(verify.expiresAt.getTime() - NOW.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(reset.expiresAt.getTime() - NOW.getTime()).toBe(60 * 60 * 1000);
  });

  it("deletes previous tokens of the same purpose", async () => {
    const { store, tokens } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const first = await issueToken(store, "u1", "verify", NOW);
    await issueToken(store, "u1", "verify", NOW);

    expect(tokens).toHaveLength(1);
    expect(await consumeToken(store, first, "verify", NOW)).toEqual({ ok: false });
  });

  it("keeps tokens of the other purpose", async () => {
    const { store, tokens } = fakeAuthStore([{ email: "a@ya.ru" }]);
    await issueToken(store, "u1", "reset", NOW);
    await issueToken(store, "u1", "verify", NOW);
    expect(tokens).toHaveLength(2);
  });

  it("clears expired tokens of the user", async () => {
    const { store, tokens } = fakeAuthStore([{ email: "a@ya.ru" }]);
    await issueToken(store, "u1", "reset", NOW);
    // Через двое суток reset-токен давно протух и должен исчезнуть при следующем выпуске.
    await issueToken(store, "u1", "verify", minutes(60 * 48));

    expect(tokens.map((t) => t.purpose)).toEqual(["verify"]);
  });
});

describe("consumeToken", () => {
  it("accepts a fresh token once", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const raw = await issueToken(store, "u1", "verify", NOW);
    expect(await consumeToken(store, raw, "verify", NOW)).toEqual({ ok: true, userId: "u1" });
  });

  it("rejects an expired token", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const raw = await issueToken(store, "u1", "reset", NOW);
    expect(await consumeToken(store, raw, "reset", minutes(61))).toEqual({ ok: false });
  });

  it("rejects a token of another purpose", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const raw = await issueToken(store, "u1", "verify", NOW);
    expect(await consumeToken(store, raw, "reset", NOW)).toEqual({ ok: false });
  });

  it("rejects an unknown token", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    expect(await consumeToken(store, "no-such-token", "verify", NOW)).toEqual({ ok: false });
  });

  it("accepts a verify token re-presented inside the grace window", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const raw = await issueToken(store, "u1", "verify", NOW);
    await consumeToken(store, raw, "verify", NOW);
    // Почтовый антивирус сжёг ссылку до человека — в пределах окна вход всё равно даём.
    expect(await consumeToken(store, raw, "verify", minutes(14))).toEqual({ ok: true, userId: "u1" });
  });

  it("rejects a verify token re-presented after the grace window", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const raw = await issueToken(store, "u1", "verify", NOW);
    await consumeToken(store, raw, "verify", NOW);
    expect(await consumeToken(store, raw, "verify", minutes(16))).toEqual({ ok: false });
  });

  it("rejects a reset token re-presented at all", async () => {
    const { store } = fakeAuthStore([{ email: "a@ya.ru" }]);
    const raw = await issueToken(store, "u1", "reset", NOW);
    await consumeToken(store, raw, "reset", NOW);
    expect(await consumeToken(store, raw, "reset", minutes(1))).toEqual({ ok: false });
  });
});
