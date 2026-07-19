import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { HeroSearch } from "@/components/home/HeroSearch";

describe("HeroSearch", () => {
  it("navigates to /search with the query on submit", () => {
    render(<HeroSearch />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "палатка" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/search?q=%D0%BF%D0%B0%D0%BB%D0%B0%D1%82%D0%BA%D0%B0");
  });
});
