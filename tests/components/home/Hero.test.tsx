import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { Hero } from "@/components/home/Hero";
import { content } from "@theme/content";

describe("Hero", () => {
  it("shows the headline and a working search", () => {
    render(<Hero citySlug="kazan" chips={[{ slug: "instrument", name: "Инструмент" }]} />);
    expect(screen.getByText(content.home.heroTitle)).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Инструмент" })).toHaveAttribute(
      "href",
      "/kazan/instrument",
    );
  });

  it("omits chips when no city", () => {
    render(<Hero chips={[{ slug: "instrument", name: "Инструмент" }]} />);
    expect(screen.queryByRole("link", { name: "Инструмент" })).toBeNull();
  });
});
