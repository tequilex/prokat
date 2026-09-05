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

  // Цена за сутки — единственная: аренда посуточная, других тарифов у брони
  // нет. Пустое поле и ноль разводятся по сообщениям: форма шлёт строки, и
  // «» без обработки стало бы нулём, то есть незаполненная цена жаловалась бы
  // на величину вместо отсутствия.
  it("требует цену за сутки и отличает пустое поле от нуля", () => {
    const { priceDay: _p, ...withoutPrice } = base;
    // null и пробелы — тоже «не заполнено»: Number() сводит их к нулю, и без
    // обработки человек получил бы жалобу на величину вместо отсутствия.
    // Из формы такое не придёт, но payload мутации приходит извне.
    const empty = [withoutPrice, { ...base, priceDay: "" }, { ...base, priceDay: null },
      { ...base, priceDay: "   " }];
    for (const input of empty) {
      const r = listingFormSchema.safeParse(input);
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe("Укажите цену за сутки");
    }

    const zero = listingFormSchema.safeParse({ ...base, priceDay: 0 });
    expect(zero.success).toBe(false);
    expect(zero.error?.issues[0]?.message).toBe("Цена должна быть больше нуля");
  });

  // Цена приходит из формы строкой — приведение обязано её принять.
  it("принимает цену строкой, как её шлёт форма", () => {
    const r = listingFormSchema.safeParse({ ...base, priceDay: "500" });
    expect(r.success).toBe(true);
    expect(r.data?.priceDay).toBe(500);
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
