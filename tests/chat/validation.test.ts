import { describe, it, expect } from "vitest";
import {
  normalizeBody, messageBodySchema, startThreadSchema, postMessageSchema,
  MAX_MESSAGE_LENGTH,
} from "@/lib/chat/validation";

describe("normalizeBody()", () => {
  it("срезает пробелы по краям", () => {
    expect(normalizeBody("  привет  ")).toBe("привет");
  });

  it("приводит переносы к LF", () => {
    expect(normalizeBody("а\r\nб\rв")).toBe("а\nб\nв");
  });

  // Иначе одним сообщением из пятисот пустых строк растягивают ленту.
  it("схлопывает три и более переносов в два", () => {
    expect(normalizeBody("а\n\n\n\n\nб")).toBe("а\n\nб");
  });

  it("оставляет одиночный и двойной перенос как есть", () => {
    expect(normalizeBody("а\nб")).toBe("а\nб");
    expect(normalizeBody("а\n\nб")).toBe("а\n\nб");
  });
});

describe("messageBodySchema", () => {
  it("принимает обычное сообщение", () => {
    expect(messageBodySchema.parse(" здравствуйте ")).toBe("здравствуйте");
  });

  it.each(["", "   ", "\n\n\n"])("отклоняет пустое (%j)", (input) => {
    expect(messageBodySchema.safeParse(input).success).toBe(false);
  });

  it(`принимает ровно ${MAX_MESSAGE_LENGTH} символов`, () => {
    expect(messageBodySchema.safeParse("я".repeat(MAX_MESSAGE_LENGTH)).success).toBe(true);
  });

  it("отклоняет на символ длиннее предела", () => {
    expect(messageBodySchema.safeParse("я".repeat(MAX_MESSAGE_LENGTH + 1)).success).toBe(false);
  });

  // Предел считается после нормализации: хвост пробелов не должен съедать лимит.
  it("считает длину после нормализации", () => {
    const padded = `${"я".repeat(MAX_MESSAGE_LENGTH)}     `;
    expect(messageBodySchema.safeParse(padded).success).toBe(true);
  });
});

describe("startThreadSchema", () => {
  it("принимает объявление и текст", () => {
    const parsed = startThreadSchema.parse({ listingId: "01L", body: " привет " });
    expect(parsed).toEqual({ listingId: "01L", body: "привет" });
  });

  it.each([
    { listingId: "", body: "привет" },
    { listingId: "01L", body: "" },
    { body: "привет" },
  ])("отклоняет %j", (input) => {
    expect(startThreadSchema.safeParse(input).success).toBe(false);
  });
});

describe("postMessageSchema", () => {
  it("принимает тред и текст", () => {
    const parsed = postMessageSchema.parse({ threadId: "01T", body: "ага" });
    expect(parsed).toEqual({ threadId: "01T", body: "ага" });
  });

  it("отклоняет без треда", () => {
    expect(postMessageSchema.safeParse({ body: "ага" }).success).toBe(false);
  });
});
