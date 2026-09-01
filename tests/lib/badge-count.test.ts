import { describe, it, expect } from "vitest";
import { badgeCount } from "@/lib/badge-count";

describe("бейдж со счётчиком", () => {
  it("показывает число как есть", () => {
    expect(badgeCount(3)).toEqual({ display: "3", label: "новых: 3" });
  });

  // С уведомлениями трёхзначное число становится реальным, а пилюля рассчитана
  // на два знака: без потолка она расползётся и сломает строку навигации.
  it("срезает всё, что больше двух знаков", () => {
    expect(badgeCount(99)?.display).toBe("99");
    expect(badgeCount(100)?.display).toBe("99+");
    expect(badgeCount(1348)?.display).toBe("99+");
  });

  it("в подписи остаётся точное число, даже когда видно 99+", () => {
    expect(badgeCount(1348)?.label).toBe("новых: 1348");
  });

  it("ноль бейджа не даёт", () => {
    expect(badgeCount(0)).toBeNull();
    expect(badgeCount(undefined)).toBeNull();
  });
});
