import { describe, it, expect } from "vitest";
import { formatHandover } from "@/lib/catalog/format";

describe("formatHandover()", () => {
  it("оба способа — выбор остаётся за людьми", () => {
    expect(formatHandover(true, true)).toBe("Самовывоз или доставка — как договоритесь с владельцем.");
  });

  it("только самовывоз", () => {
    expect(formatHandover(true, false)).toBe("Только самовывоз — забираете сами.");
  });

  it("только доставка", () => {
    expect(formatHandover(false, true)).toBe("Только доставка — владелец привезёт сам.");
  });

  // Валидация такого не пропустит, но колонки правятся не только формой, и
  // выдавать отсутствие данных за «только самовывоз» карточка не должна.
  it("ни одного способа — говорит об этом прямо, а не выдумывает самовывоз", () => {
    expect(formatHandover(false, false)).toBe("Способ получения — по договорённости с владельцем.");
  });
});
