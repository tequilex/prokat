import { describe, it, expect } from "vitest";
import { listingFormSchema } from "@/lib/owner/validation";

const base = {
  title: "Дрель Bosch",
  categoryId: "c1",
  cityId: "city1",
  depositType: "none" as const,
  quantity: 1,
  priceDay: 500,
  handoverPickup: true,
  handoverDelivery: false,
};

describe("listingFormSchema", () => {
  it("requires cityId", () => {
    const r = listingFormSchema.safeParse({ ...base, cityId: "" });
    expect(r.success).toBe(false);
  });

  it("accepts valid listing with city and optional location", () => {
    const r = listingFormSchema.safeParse({ ...base, location: "ул. Баумана" });
    expect(r.success).toBe(true);
  });

  // Объявление, которое нельзя ни забрать, ни получить доставкой, — не
  // объявление. Форма такого не отправит, но payload приходит извне.
  it("не пропускает объявление без единого способа получения", () => {
    const r = listingFormSchema.safeParse({
      ...base, handoverPickup: false, handoverDelivery: false,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Выберите хотя бы один способ получения");
  });

  it("оба способа сразу — валидно", () => {
    const r = listingFormSchema.safeParse({
      ...base, handoverPickup: true, handoverDelivery: true,
    });
    expect(r.success).toBe(true);
  });

  // Дефолта у флагов нет намеренно: updateListing пишет .set() всеми полями,
  // и подстановка «самовывоз без доставки» вместо отсутствующего ключа снимала
  // бы владельцу доставку при правке объявления из устаревшей вкладки.
  // Сообщение при этом другое: галочкой такое не чинится.
  it("payload без способа получения не проходит, а не подставляет самовывоз", () => {
    const { handoverPickup: _p, handoverDelivery: _d, ...withoutHandover } = base;
    const r = listingFormSchema.safeParse(withoutHandover);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Форма устарела — обновите страницу");
  });

  // Русское сообщение и на не-boolean: иначе человек увидел бы «Expected
  // boolean, received string» — issues[0].message уходит прямо в интерфейс.
  it("не-boolean тоже отбивается по-русски", () => {
    const r = listingFormSchema.safeParse({ ...base, handoverPickup: "on" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Форма устарела — обновите страницу");
  });
});
