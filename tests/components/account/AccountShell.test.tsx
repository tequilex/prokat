import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/requests" }));

import { AccountShell } from "@/components/account/AccountShell";

describe("AccountShell", () => {
  it("renders a separator before a grouped item", () => {
    render(
      <AccountShell
        title="Кабинет"
        items={[
          { href: "/requests", label: "Мои заявки" },
          { href: "/cabinet/requests", label: "Заявки на мои вещи", separatorBefore: true },
        ]}
      >
        x
      </AccountShell>,
    );
    expect(screen.getAllByRole("separator").length).toBeGreaterThan(0);
  });
});
