import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PasswordInput } from "@/components/ui/PasswordInput";

describe("PasswordInput", () => {
  it("скрывает пароль по умолчанию и показывает по глазку", () => {
    render(<PasswordInput aria-label="Пароль" defaultValue="sekret" />);
    const input = screen.getByLabelText("Пароль");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Показать пароль" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Скрыть пароль" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("не показывает глазок у пустого поля", () => {
    render(<PasswordInput aria-label="Пароль" />);
    // aria-hidden уводит кнопку из дерева доступности — роли «button» нет.
    expect(screen.queryByRole("button")).toBeNull();

    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "x" } });
    expect(screen.getByRole("button", { name: "Показать пароль" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "" } });
    expect(screen.queryByRole("button")).toBeNull();
  });

});
