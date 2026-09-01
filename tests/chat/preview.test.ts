import { describe, it, expect } from "vitest";
import { toPreview } from "@/server/chat";
import { newSortableId } from "@/lib/id";

describe("toPreview()", () => {
  it("схлопывает переносы и лишние пробелы в одну строку", () => {
    expect(toPreview("привет\n\nкак дела?  ")).toBe("привет как дела?");
  });

  it("короткое сообщение оставляет как есть", () => {
    expect(toPreview("ок")).toBe("ок");
  });

  it("длинное обрезает и ставит многоточие", () => {
    const preview = toPreview("я".repeat(300));
    expect(preview).toHaveLength(201);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("ровно на границе не обрезает", () => {
    const exact = "я".repeat(200);
    expect(toPreview(exact)).toBe(exact);
  });
});

describe("newSortableId()", () => {
  // id сообщения — единственный ключ сортировки ленты и курсор пагинации.
  // Обычный ulid() внутри одной миллисекунды упорядочен не был бы.
  it("возрастает даже когда id выданы подряд в одну миллисекунду", () => {
    const ids = Array.from({ length: 50 }, () => newSortableId());
    expect([...ids].sort()).toEqual(ids);
  });
});
