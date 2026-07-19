import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/server/catalog", async (orig) => ({
  ...(await orig<typeof import("@/server/catalog")>()),
  searchListings: vi.fn(async () => ({ items: [], total: 0 })),
  getAvailabilityRows: vi.fn(async () => []),
}));

import { SearchResults } from "@/components/catalog/SearchResults";

const city = { id: "c1", slug: "kazan", name: "Казань" } as never;

describe("SearchResults", () => {
  it("prompts for a query when q is empty", async () => {
    render(await SearchResults({ city, q: "", searchParams: {} }));
    expect(screen.getByText(/Введите запрос/)).toBeInTheDocument();
  });

  it("shows a not-found message when a query yields nothing", async () => {
    render(await SearchResults({ city, q: "дрель", searchParams: { q: "дрель" } }));
    expect(screen.getByText(/Ничего не найдено/)).toBeInTheDocument();
  });
});
