import { describe, it, expect } from "vitest";
import { chatErrorText } from "@/lib/chat/errors";

describe("chatErrorText()", () => {
  it.each([
    ["not_participant", "Вы не участник этой переписки."],
    ["listing_not_active", "Объявление снято с публикации — история осталась, писать нельзя."],
    ["counterpart_banned", "Аккаунт собеседника заблокирован — история осталась, писать нельзя."],
    ["own_listing", "Это ваше объявление — переписка с самим собой не заводится."],
  ])("переводит %s", (code, text) => {
    expect(chatErrorText(code)).toBe(text);
  });

  it("разбирает секунды из rate_limited и склоняет их", () => {
    expect(chatErrorText("rate_limited:1")).toBe("Слишком часто. Повторите через 1 секунду.");
    expect(chatErrorText("rate_limited:3")).toBe("Слишком часто. Повторите через 3 секунды.");
    expect(chatErrorText("rate_limited:45")).toBe("Слишком часто. Повторите через 45 секунд.");
  });

  it("округляет длинную паузу до минут", () => {
    expect(chatErrorText("rate_limited:600")).toBe("Слишком часто. Повторите через 10 минут.");
  });

  it("сообщение о превышении длины приходит из zod и отдаётся как есть", () => {
    const fromZod = "Сообщение не длиннее 2000 символов";
    expect(chatErrorText(fromZod)).toBe(fromZod);
  });

  // Незнакомый код — это баг сервера, а не осмысленный ответ человеку.
  it("на неизвестный код отдаёт нейтральную фразу, а не сам код", () => {
    const text = chatErrorText("kaboom_42");
    expect(text).not.toContain("kaboom_42");
    expect(text).toBe("Не удалось отправить. Попробуйте ещё раз.");
  });
});
