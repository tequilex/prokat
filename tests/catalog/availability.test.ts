import { describe, it, expect } from "vitest";
import {
  eachDate, freeQty, canBook, applyBookingDelta,
  type AvailabilityMap,
} from "@/lib/catalog/availability";

describe("eachDate()", () => {
  it("включает обе границы", () => {
    expect(eachDate("2026-07-20", "2026-07-22")).toEqual([
      "2026-07-20", "2026-07-21", "2026-07-22",
    ]);
  });

  it("один день = одна дата", () => {
    expect(eachDate("2026-07-20", "2026-07-20")).toEqual(["2026-07-20"]);
  });

  it("переживает границу месяца и года", () => {
    expect(eachDate("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02",
    ]);
  });

  it("бросает на инвертированном диапазоне", () => {
    expect(() => eachDate("2026-07-22", "2026-07-20")).toThrow("date_range_inverted");
  });

  it("бросает на мусорной дате", () => {
    expect(() => eachDate("2026-13-40", "2026-07-20")).toThrow(/invalid date/);
    expect(() => eachDate("garbage", "2026-07-20")).toThrow(/invalid date/);
  });
});

describe("freeQty()", () => {
  it("без строки availability день полностью свободен", () => {
    expect(freeQty(3, undefined)).toBe(3);
  });

  it("вычитает booked и blocked", () => {
    expect(freeQty(3, { bookedQty: 1, blockedQty: 1 })).toBe(1);
  });

  it("не уходит ниже нуля при переброни", () => {
    expect(freeQty(1, { bookedQty: 2, blockedQty: 0 })).toBe(0);
  });
});

describe("canBook()", () => {
  const map: AvailabilityMap = new Map([
    ["2026-07-21", { bookedQty: 2, blockedQty: 0 }],
    ["2026-07-22", { bookedQty: 0, blockedQty: 3 }],
  ]);

  it("true, когда qty влезает во все дни диапазона", () => {
    expect(canBook(3, map, "2026-07-20", "2026-07-21", 1)).toBe(true);
  });

  it("false, если хотя бы один день диапазона занят", () => {
    // 2026-07-22: всё заблокировано вручную
    expect(canBook(3, map, "2026-07-20", "2026-07-22", 1)).toBe(false);
  });

  it("false для qty больше свободного остатка", () => {
    expect(canBook(3, map, "2026-07-21", "2026-07-21", 2)).toBe(false);
  });

  it("false для qty < 1", () => {
    expect(canBook(3, map, "2026-07-20", "2026-07-20", 0)).toBe(false);
  });
});

describe("applyBookingDelta()", () => {
  it("подтверждение занимает каждый день диапазона", () => {
    const next = applyBookingDelta(new Map(), "2026-07-20", "2026-07-21", 2);
    expect(next.get("2026-07-20")).toEqual({ bookedQty: 2, blockedQty: 0 });
    expect(next.get("2026-07-21")).toEqual({ bookedQty: 2, blockedQty: 0 });
  });

  it("освобождение возвращает единицы и не трогает blocked", () => {
    const map: AvailabilityMap = new Map([
      ["2026-07-20", { bookedQty: 2, blockedQty: 1 }],
    ]);
    const next = applyBookingDelta(map, "2026-07-20", "2026-07-20", -2);
    expect(next.get("2026-07-20")).toEqual({ bookedQty: 0, blockedQty: 1 });
  });

  it("bookedQty не уходит ниже нуля при двойном release", () => {
    const map: AvailabilityMap = new Map([
      ["2026-07-20", { bookedQty: 1, blockedQty: 0 }],
    ]);
    const once = applyBookingDelta(map, "2026-07-20", "2026-07-20", -1);
    const twice = applyBookingDelta(once, "2026-07-20", "2026-07-20", -1);
    expect(twice.get("2026-07-20")!.bookedQty).toBe(0);
  });

  it("не мутирует входную карту", () => {
    const map: AvailabilityMap = new Map([
      ["2026-07-20", { bookedQty: 0, blockedQty: 0 }],
    ]);
    applyBookingDelta(map, "2026-07-20", "2026-07-20", 1);
    expect(map.get("2026-07-20")).toEqual({ bookedQty: 0, blockedQty: 0 });
  });
});
