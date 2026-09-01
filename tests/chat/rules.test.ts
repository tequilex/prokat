import { describe, it, expect } from "vitest";
import {
  canStartThread, canPostMessage, canReadThread, counterpartOf,
  type ChatViewer, type ChatListing, type ChatParticipants,
} from "@/lib/chat/rules";

const OWNER = "01OWNER";
const CUSTOMER = "01CUSTOMER";
const STRANGER = "01STRANGER";

const alive = (id: string): ChatViewer => ({ id, bannedAt: null });
const banned = (id: string): ChatViewer => ({ id, bannedAt: new Date("2026-01-01") });

const activeListing: ChatListing = { ownerUserId: OWNER, status: "active" };
const participants: ChatParticipants = { ownerUserId: OWNER, customerUserId: CUSTOMER };

describe("canStartThread()", () => {
  it("разрешает арендатору написать по активному объявлению", () => {
    expect(canStartThread(alive(CUSTOMER), activeListing, null)).toEqual({ ok: true });
  });

  it("запрещает забаненному", () => {
    expect(canStartThread(banned(CUSTOMER), activeListing, null))
      .toEqual({ ok: false, reason: "banned" });
  });

  it("запрещает владельцу писать самому себе", () => {
    expect(canStartThread(alive(OWNER), activeListing, null))
      .toEqual({ ok: false, reason: "own_listing" });
  });

  it.each(["hidden", "archived"] as const)("запрещает завести тред по %s объявлению", (status) => {
    expect(canStartThread(alive(CUSTOMER), { ...activeListing, status }, null))
      .toEqual({ ok: false, reason: "listing_not_active" });
  });

  it("бан важнее статуса объявления", () => {
    expect(canStartThread(banned(CUSTOMER), { ...activeListing, status: "hidden" }, null))
      .toEqual({ ok: false, reason: "banned" });
  });

  // Бан не трогает объявления владельца (adminBanUser правит только users),
  // поэтому активное объявление забаненного остаётся в выдаче. Писать ему нельзя.
  it("запрещает писать забаненному владельцу", () => {
    expect(canStartThread(alive(CUSTOMER), activeListing, new Date("2026-01-01")))
      .toEqual({ ok: false, reason: "counterpart_banned" });
  });
});

describe("canPostMessage()", () => {
  it("разрешает обоим участникам", () => {
    for (const id of [OWNER, CUSTOMER]) {
      expect(canPostMessage(alive(id), participants, activeListing, null)).toEqual({ ok: true });
    }
  });

  it("запрещает постороннему", () => {
    expect(canPostMessage(alive(STRANGER), participants, activeListing, null))
      .toEqual({ ok: false, reason: "not_participant" });
  });

  it("запрещает забаненному", () => {
    expect(canPostMessage(banned(CUSTOMER), participants, activeListing, null))
      .toEqual({ ok: false, reason: "banned" });
  });

  it("запрещает писать забаненному собеседнику", () => {
    expect(canPostMessage(alive(CUSTOMER), participants, activeListing, new Date("2026-01-01")))
      .toEqual({ ok: false, reason: "counterpart_banned" });
  });

  it.each(["hidden", "archived"] as const)("запрещает писать по %s объявлению", (status) => {
    expect(canPostMessage(alive(CUSTOMER), participants, { ...activeListing, status }, null))
      .toEqual({ ok: false, reason: "listing_not_active" });
  });

  it("посторонний получает not_participant, а не подсказку про статус объявления", () => {
    expect(canPostMessage(alive(STRANGER), participants, { ...activeListing, status: "hidden" }, null))
      .toEqual({ ok: false, reason: "not_participant" });
  });
});

describe("canReadThread()", () => {
  it("пускает обоих участников", () => {
    expect(canReadThread(OWNER, participants)).toBe(true);
    expect(canReadThread(CUSTOMER, participants)).toBe(true);
  });

  it("не пускает постороннего", () => {
    expect(canReadThread(STRANGER, participants)).toBe(false);
  });

  // Читать можно всегда: история переписки остаётся доступной, даже когда
  // писать уже нельзя (объявление скрыли, собеседника забанили).
  it("не зависит от статуса объявления и банов", () => {
    expect(canReadThread(CUSTOMER, participants)).toBe(true);
  });
});

describe("counterpartOf()", () => {
  it("владельцу отдаёт арендатора и наоборот", () => {
    expect(counterpartOf(participants, OWNER)).toBe(CUSTOMER);
    expect(counterpartOf(participants, CUSTOMER)).toBe(OWNER);
  });

  it("постороннему отдаёт null", () => {
    expect(counterpartOf(participants, STRANGER)).toBeNull();
  });
});
