import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OwnerCard } from "@/components/booking/OwnerCard";

describe("OwnerCard", () => {
  it("links the seller name and shows the verified badge when verified", () => {
    render(
      <OwnerCard
        name="Артём"
        href="/u/prokatmaster"
        username="prokatmaster"
        image={null}
        cityName="Казань"
        isVerified
        location="ул. Баумана"
        createdAt={new Date("2023-05-01")}
      />,
    );
    expect(screen.getByRole("link", { name: /Артём/ })).toHaveAttribute("href", "/u/prokatmaster");
    expect(screen.getByText(/Проверен/)).toBeInTheDocument();
  });

  it("omits the badge when not verified", () => {
    render(
      <OwnerCard
        name="Частник"
        href="/u/chastnik"
        username="chastnik"
        image={null}
        cityName="Казань"
        isVerified={false}
        createdAt={new Date("2024-01-01")}
      />,
    );
    expect(screen.queryByText(/Проверен/)).toBeNull();
  });
});
