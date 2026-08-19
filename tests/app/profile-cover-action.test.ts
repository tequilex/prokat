// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Моки объявлены через vi.hoisted: экшен импортируется статически, и фабрики
// vi.mock исполняются раньше остального тела модуля.
const { authMock, selectLimit, updateWhere, updateSet, db } = vi.hoisted(() => {
  const selectLimit = vi.fn();
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  return {
    authMock: vi.fn(),
    selectLimit,
    updateWhere,
    updateSet,
    // Экшен ходит в БД дважды: проверить, что адрес — из своих uploads, и записать.
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({ where: vi.fn(() => ({ limit: selectLimit })) })),
      })),
      update: vi.fn(() => ({ set: updateSet })),
    },
  };
});
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({ getDb: () => db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateCover } from "@/server/actions/profile";

const me = { user: { id: "u1", bannedAt: null } };

beforeEach(() => {
  vi.clearAllMocks();
  updateWhere.mockResolvedValue(undefined);
});

describe("updateCover", () => {
  it("rejects anonymous and banned users", async () => {
    authMock.mockResolvedValueOnce(null);
    expect(await updateCover(null)).toEqual({ ok: false, error: "auth_required" });

    authMock.mockResolvedValueOnce({ user: { id: "u1", bannedAt: new Date() } });
    expect(await updateCover(null)).toEqual({ ok: false, error: "auth_required" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects a url that is not the user's own upload", async () => {
    authMock.mockResolvedValue(me);
    selectLimit.mockResolvedValueOnce([]);
    const res = await updateCover("https://images.example.ru/alien.webp");
    expect(res).toEqual({ ok: false, error: "unknown_image" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("saves a url the user uploaded themselves", async () => {
    authMock.mockResolvedValue(me);
    selectLimit.mockResolvedValueOnce([{ id: "up1" }]);
    const res = await updateCover("https://images.example.ru/mine.webp");
    expect(res).toEqual({ ok: true, data: undefined });
    expect(updateSet).toHaveBeenCalledWith({ coverUrl: "https://images.example.ru/mine.webp" });
  });

  it("clears the cover without touching uploads", async () => {
    authMock.mockResolvedValue(me);
    const res = await updateCover(null);
    expect(res).toEqual({ ok: true, data: undefined });
    expect(db.select).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith({ coverUrl: null });
  });
});
