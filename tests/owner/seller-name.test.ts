import { describe, it, expect } from "vitest";
import { parseSellerName } from "@/lib/owner/seller-name";

// Поле «Как вас увидят покупатели» в форме размещения. Живёт отдельно от
// listingFormSchema: схема описывает товар, а это поле — про юзера.
describe("parseSellerName", () => {
  it("возвращает обрезанное имя", () => {
    expect(parseSellerName({ sellerName: "  ПрокатМастер  " })).toEqual({ ok: true, name: "ПрокатМастер" });
  });

  it("пустое значение означает «оставить как есть»", () => {
    expect(parseSellerName({ sellerName: "   " })).toEqual({ ok: true, name: null });
    expect(parseSellerName({})).toEqual({ ok: true, name: null });
  });

  it("отклоняет имя длиннее 100 символов", () => {
    const res = parseSellerName({ sellerName: "я".repeat(101) });
    expect(res.ok).toBe(false);
  });

  it("игнорирует значение неверного типа, а не падает", () => {
    expect(parseSellerName({ sellerName: 42 })).toEqual({ ok: true, name: null });
  });
});
