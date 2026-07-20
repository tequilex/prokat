import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OwnerCard } from "@/components/booking/OwnerCard";

describe("OwnerCard", () => {
  it("links the provider name and shows the verified badge when verified", () => {
    render(
      <OwnerCard
        name="ПрокатМастер"
        href="/kazan/prokatmaster"
        isVerified
        address="ул. Баумана"
        hoursText={null}
      />,
    );
    expect(screen.getByRole("link", { name: /ПрокатМастер/ })).toHaveAttribute(
      "href",
      "/kazan/prokatmaster",
    );
    expect(screen.getByText(/Проверен/)).toBeInTheDocument();
  });

  it("omits the badge when not verified", () => {
    render(<OwnerCard name="Частник" href="/kazan/chastnik" isVerified={false} />);
    expect(screen.queryByText(/Проверен/)).toBeNull();
  });
});
