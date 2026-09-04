import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Виджет тянет две ветки, которых в jsdom не бывает: окно входа уходит в
// next-auth, а форма заявки — в server action, и оба заканчиваются на
// next/server. К способу получения ни одна отношения не имеет.
// (OwnerCard этим не болен: он грузит окно входа через LoginTrigger, а виджет
// импортирует его напрямую.)
vi.mock("@/components/auth/LoginDialog", () => ({ LoginDialog: () => null }));
vi.mock("@/server/actions/booking", () => ({
  createBookingRequest: async () => ({ ok: true, data: undefined }),
}));

const { BookingWidget } = await import("@/components/booking/BookingWidget");

// Способ получения показывается ровно в одном месте — в блоке брони. Тест на
// formatHandover проверяет сами подписи, а этот — что они туда доезжают:
// раньше строка жила на странице товара, и её перенос ничем не был закреплён.
const base = {
  listingId: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
  listingTitle: "Перфоратор Bosch",
  initialPhone: "",
  pathname: "/kazan/elektroinstrumenty/perforator-01ARZ3NDEKTSV4RRFFQ69G5FAW",
  initial: { from: "2026-09-04", to: "2026-09-04", qty: 1 },
  today: "2026-09-04",
  maxDate: "2027-03-03",
  availability: {},
  quantity: 1,
  priceDay: 500,
  priceWeek: null,
  priceHour: null,
  depositLabel: "без залога",
  sellerName: "Артём",
  sellerHref: "/u/01ARZ3NDEKTSV4RRFFQ69G5FAV",
  sellerLocation: null,
  isAuthed: true,
  authProps: { nextAuthProviders: ["yandex"], vkEnabled: false, canRegisterByEmail: true },
};

describe("BookingWidget — способ получения", () => {
  it("показывает оба способа под подписью «Получение»", () => {
    render(<BookingWidget {...base} handoverPickup handoverDelivery />);
    expect(screen.getByText("Получение")).toBeInTheDocument();
    expect(screen.getByText("Самовывоз или доставка")).toBeInTheDocument();
  });

  it("показывает единственный способ", () => {
    render(<BookingWidget {...base} handoverPickup={false} handoverDelivery />);
    expect(screen.getByText("Только доставка")).toBeInTheDocument();
  });
});
