import { describe, it, expect } from "vitest";
import { formatMonthYearGen } from "@/lib/catalog/dates";

describe("formatMonthYearGen", () => {
  it("puts the month into the genitive for «на сайте с …»", () => {
    expect(formatMonthYearGen(new Date(2026, 7, 19))).toBe("августа 2026");
    expect(formatMonthYearGen(new Date(2024, 2, 1))).toBe("марта 2024");
  });
});
