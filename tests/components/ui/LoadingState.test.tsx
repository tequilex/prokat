import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LoadingState } from "@/components/ui/LoadingState";

describe("LoadingState", () => {
  it("announces what is being waited for", () => {
    render(<LoadingState title="Ищем рядом…" hint="секунду" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Ищем рядом…");
    expect(status).toHaveTextContent("секунду");
  });

  it("keeps the inline variant to a single line", () => {
    render(<LoadingState inline title="Секунду" />);
    expect(screen.getByRole("status")).toHaveTextContent("Секунду");
  });
});
