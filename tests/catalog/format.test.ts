import { describe, it, expect } from "vitest";
import { formatHandover, formatHandoverShort } from "@/lib/catalog/format";

describe("formatHandover()", () => {
  it("оба способа — выбор остаётся за людьми", () => {
    expect(formatHandover(true, true)).toBe("Самовывоз или доставка");
  });

  it("только самовывоз", () => {
    expect(formatHandover(true, false)).toBe("Только самовывоз");
  });

  it("только доставка", () => {
    expect(formatHandover(false, true)).toBe("Только доставка");
  });

  // Валидация такого не пропустит, но колонки правятся не только формой, и
  // выдавать отсутствие данных за «только самовывоз» карточка не должна.
  it("ни одного способа — говорит об этом прямо, а не выдумывает самовывоз", () => {
    expect(formatHandover(false, false)).toBe("По договорённости");
  });

  // Значение стоит к подписи «Получение» в блоке брони, где на строку есть
  // половина ширины: развёрнутая фраза с точкой её распирала.
  it("подписи короткие и без точки", () => {
    for (const [p, d] of [[true, true], [true, false], [false, true], [false, false]]) {
      const label = formatHandover(p, d);
      expect(label.endsWith(".")).toBe(false);
      expect(label.length).toBeLessThanOrEqual(24);
    }
  });
});

// В подвале карточки «Только» лишнее: там перечисляют, чем вещь отличается от
// соседних в ряду, а не предупреждают об ограничении.
describe("formatHandoverShort()", () => {
  it("оба способа названы так же, как в блоке брони", () => {
    expect(formatHandoverShort(true, true)).toBe("Самовывоз / доставка");
  });

  it("единственный способ — без слова «Только»", () => {
    expect(formatHandoverShort(true, false)).toBe("Самовывоз");
    expect(formatHandoverShort(false, true)).toBe("Доставка");
  });

  it("ни одного способа — говорит об этом прямо", () => {
    expect(formatHandoverShort(false, false)).toBe("По договорённости");
  });
});
