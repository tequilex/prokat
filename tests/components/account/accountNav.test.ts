import { describe, it, expect } from "vitest";
import { buildAccountNav } from "@/components/account/accountNav";

describe("buildAccountNav", () => {
  it("groups sections by the role the person is in", () => {
    const groups = buildAccountNav({ newRequestsCount: 2 });
    expect(groups.map((g) => g.title)).toEqual(["сейчас", "мои вещи", "я арендую", "аккаунт"]);
    expect(groups.flatMap((g) => g.items).map((i) => i.href)).toEqual([
      // Переписка идёт и по своим вещам, и по чужим — поэтому в «сейчас»,
      // а не в одной из ролевых групп.
      "/cabinet", "/chat",
      "/cabinet/requests", "/cabinet/listings", "/cabinet/calendar",
      "/requests",
      "/profile",
    ]);
  });



  it("badges unread messages on the chat section", () => {
    const items = buildAccountNav({ newRequestsCount: 0, unreadMessages: 4 })
      .flatMap((g) => g.items);
    expect(items.find((i) => i.href === "/chat")!.badge).toBe(4);
  });

  it("omits the chat badge when everything is read", () => {
    const items = buildAccountNav({ newRequestsCount: 0, unreadMessages: 0 })
      .flatMap((g) => g.items);
    expect(items.find((i) => i.href === "/chat")!.badge).toBeFalsy();
  });

  it("matches the summary exactly — /cabinet prefixes every other section", () => {
    const summary = buildAccountNav({ newRequestsCount: 0 })
      .flatMap((g) => g.items)
      .find((i) => i.href === "/cabinet")!;
    expect(summary.exact).toBe(true);
  });

  it("counts pending requests only on the owner inbox", () => {
    const items = buildAccountNav({ newRequestsCount: 2 }).flatMap((g) => g.items);
    expect(items.find((i) => i.href === "/cabinet/requests")!.badge).toBe(2);
    expect(items.filter((i) => i.badge).length).toBe(1);
  });

  // Бейджи считают разное и схлопываться в одно число не должны: сообщения по
  // штукам, заявки — только входящие.
  it("keeps the badges independent", () => {
    const items = buildAccountNav({ newRequestsCount: 2, unreadMessages: 7 })
      .flatMap((g) => g.items);
    expect(items.find((i) => i.href === "/chat")!.badge).toBe(7);
    expect(items.find((i) => i.href === "/cabinet/requests")!.badge).toBe(2);
  });

  it("writes hub hints in humane Russian and omits them at zero", () => {
    const items = buildAccountNav({
      newRequestsCount: 0, activeListings: 3, upcomingBookings: 2, pendingMine: 1,
    }).flatMap((g) => g.items);
    expect(items.find((i) => i.href === "/cabinet/listings")!.hint).toBe("3");
    expect(items.find((i) => i.href === "/cabinet/calendar")!.hint).toBe("2 брони");
    expect(items.find((i) => i.href === "/requests")!.hint).toBe("1 ждёт");

    const bare = buildAccountNav({ newRequestsCount: 0 }).flatMap((g) => g.items);
    expect(bare.every((i) => i.hint === undefined)).toBe(true);
  });

  it("drops provider settings and stats tabs", () => {
    const items = buildAccountNav({ newRequestsCount: 0 }).flatMap((g) => g.items);
    expect(items.some((i) => i.href === "/cabinet/settings")).toBe(false);
    expect(items.some((i) => i.href === "/cabinet/stats")).toBe(false);
  });
});
