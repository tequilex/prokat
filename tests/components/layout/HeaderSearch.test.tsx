import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { HeaderSearch } from "@/components/layout/HeaderSearch";

describe("HeaderSearch", () => {
  it("navigates to /search with the query on submit", () => {
    render(<HeaderSearch />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "дрель" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/search?q=%D0%B4%D1%80%D0%B5%D0%BB%D1%8C");
  });
});
