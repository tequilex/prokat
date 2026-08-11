import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthPanel } from "@/components/auth/AuthPanel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/server/actions/auth-email", () => ({
  login: vi.fn(), register: vi.fn(), requestReset: vi.fn(),
  resendVerificationEmail: vi.fn(), checkEmailDomain: vi.fn().mockResolvedValue({ blocked: false, message: null }),
}));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

const providers = { nextAuthProviders: ["yandex"], vkEnabled: true, canRegister: true };

describe("AuthPanel", () => {
  it("starts on the email step", () => {
    render(<AuthPanel {...providers} />);
    expect(screen.getByLabelText("Почта")).toBeInTheDocument();
    expect(screen.queryByText("Выберите сервис")).toBeNull();
  });

  it("switches to the providers step and back", () => {
    render(<AuthPanel {...providers} />);

    fireEvent.click(screen.getByRole("button", { name: "Войти через сервис" }));
    expect(screen.getByText("Выберите сервис")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Яндекс/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Почта")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Войти по почте" }));
    expect(screen.getByLabelText("Почта")).toBeInTheDocument();
  });

  it("hides the switch when no provider is configured", () => {
    render(<AuthPanel nextAuthProviders={[]} vkEnabled={false} canRegister />);
    expect(screen.queryByRole("button", { name: "Войти через сервис" })).toBeNull();
    expect(screen.getByLabelText("Почта")).toBeInTheDocument();
  });
});
