// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Моки через vi.hoisted: экшен импортируется статически, фабрики vi.mock
// исполняются раньше тела модуля.
const { authMock, listingLimit, availWhere, transaction, db } = vi.hoisted(() => {
  const listingLimit = vi.fn();
  const availWhere = vi.fn();
  const transaction = vi.fn();
  return {
    authMock: vi.fn(),
    listingLimit,
    availWhere,
    transaction,
    // Экшен читает объявление с владельцем, потом занятость на диапазон,
    // и только потом заходит в транзакцию.
    db: {
      select: vi.fn((fields?: unknown) =>
        fields
          ? { from: () => ({ innerJoin: () => ({ where: () => ({ limit: listingLimit }) }) }) }
          : { from: () => ({ where: availWhere }) },
      ),
      transaction,
    },
  };
});
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({ getDb: () => db }));
vi.mock("@/lib/rate-limit", () => ({ checkLimit: () => ({ ok: true }) }));
vi.mock("@/server/notifications", () => ({ notify: vi.fn() }));
vi.mock("@/server/realtime", () => ({ publish: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createBookingRequest } from "@/server/actions/booking";
import { todayStr } from "@/lib/catalog/dates";

const TODAY = todayStr();

const form = (from: string, to: string) => ({
  listingId: "l1", from, to, qty: 1, phone: "+79000000000",
});

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "u1", bannedAt: null } });
  listingLimit.mockResolvedValue([
    { listing: { id: "l1", ownerUserId: "u2", status: "active", quantity: 1 }, ownerBannedAt: null },
  ]);
});

describe("createBookingRequest: устаревший выбор дат", () => {
  it("прошедшая дата не подтягивается к сегодня, а отклоняется", async () => {
    // Кламп молча сдвинул бы from на сегодня, и владелец получил бы заявку на
    // даты, которых человек не выбирал. Диалог показывает только «готово».
    const res = await createBookingRequest(form("2020-01-01", "2020-01-03"));
    expect(res).toEqual({ ok: false, error: "dates_stale" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("за горизонтом брони — тоже отказ, а не кламп", async () => {
    const res = await createBookingRequest(form("2099-01-01", "2099-01-02"));
    expect(res).toEqual({ ok: false, error: "dates_stale" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("сегодняшний день проходит проверку и доходит до занятости", async () => {
    // Занятость отдаём полной: доказывает, что охранник дат пропустил дальше,
    // не заводя транзакцию ради этого.
    availWhere.mockResolvedValue([
      { listingId: "l1", date: TODAY, bookedQty: 1, blockedQty: 0 },
    ]);
    const res = await createBookingRequest(form(TODAY, TODAY));
    expect(res).toEqual({ ok: false, error: `dates_taken:${TODAY}` });
    expect(transaction).not.toHaveBeenCalled();
  });
});
