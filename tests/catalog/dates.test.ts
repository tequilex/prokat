import { describe, it, expect } from "vitest";
import { formatMonthYearGen } from "@/lib/catalog/dates";

describe("formatMonthYearGen", () => {
  it("puts the month into the genitive for «на сайте с …»", () => {
    // Даты в UTC: форматтер читает UTC-компоненты, чтобы полночь на границе
    // месяца не уезжала в соседний месяц из-за TZ сервера.
    expect(formatMonthYearGen(new Date(Date.UTC(2026, 7, 19)))).toBe("августа 2026");
    expect(formatMonthYearGen(new Date(Date.UTC(2024, 2, 1)))).toBe("марта 2024");
  });
});
