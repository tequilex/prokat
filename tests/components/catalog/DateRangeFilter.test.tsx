import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { DateRangeFilter } from "@/components/catalog/DateRangeFilter";

const open = () => fireEvent.click(screen.getByRole("button", { name: /даты|—/ }));

describe("DateRangeFilter", () => {
  it("без дат показывает «Любые даты»", () => {
    render(<DateRangeFilter resetHref="/kazan" today="2026-08-29" />);
    expect(screen.getByText("Любые даты")).toBeInTheDocument();
  });

  it("с диапазоном показывает его на кнопке", () => {
    render(<DateRangeFilter from="2026-08-28" to="2026-09-03" resetHref="/kazan" today="2026-08-29" />);
    expect(screen.getByText("28 авг — 3 сен")).toBeInTheDocument();
  });

  it("по клику рисует сетку календаря", () => {
    render(<DateRangeFilter resetHref="/kazan" today="2026-08-29" />);
    open();
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(27);
  });

  // Календарь открывался пустой растянутой панелью: .rdp-theme тянет месяц и
  // сетку на 100% контейнера, а у поповера своей ширины нет. jsdom раскладку
  // не считает, поэтому проверяем не ширину, а само наличие ограничения.
  it("контейнер календаря имеет заданную ширину", () => {
    render(<DateRangeFilter resetHref="/kazan" today="2026-08-29" />);
    open();
    expect(document.querySelector(".rdp-theme")).toHaveClass("w-[19rem]");
  });

  it("«Показать» заблокирована, пока диапазон не выбран целиком", () => {
    render(<DateRangeFilter resetHref="/kazan" today="2026-08-29" />);
    open();
    expect(screen.getByRole("button", { name: "Показать" })).toBeDisabled();
  });

  // Поповер приклеен к кнопке и при прокрутке уезжает вверх, наползая на липкий
  // хедер (он ниже по z-index и накрыть его не может). Поэтому закрываем.
  it("закрывается при прокрутке страницы", () => {
    render(<DateRangeFilter resetHref="/kazan" today="2026-08-29" />);
    open();
    expect(screen.getByRole("grid")).toBeInTheDocument();

    fireEvent.scroll(window);
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });
});
