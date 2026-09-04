import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Выход — самый дорогой путь, который эта задача трогает: к нему добавилась
// чистка куки города, и она не имеет права ему мешать.

const signOut = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("next-auth/react", () => ({ signOut }));

const forgetCityPreference = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/server/actions/city", () => ({ forgetCityPreference }));

import { useSignOut } from "@/components/auth/useSignOut";

beforeEach(() => {
  signOut.mockClear();
  forgetCityPreference.mockClear();
  forgetCityPreference.mockImplementation(async () => undefined);
});

describe("useSignOut", () => {
  it("forgets the chosen city before leaving", async () => {
    const { result } = renderHook(() => useSignOut());
    act(() => { result.current.run(); });

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(forgetCityPreference).toHaveBeenCalledTimes(1);
    // Именно до: signOut редиректит, и после него код уже не выполнится.
    expect(forgetCityPreference.mock.invocationCallOrder[0]!)
      .toBeLessThan(signOut.mock.invocationCallOrder[0]!);
  });

  // Забытая кука не стоит того, чтобы человек остался залогинен: он нажал
  // «Выйти», индикатор погас, ошибки нет — и он всё ещё внутри.
  it("still signs out when forgetting the city fails", async () => {
    forgetCityPreference.mockImplementation(async () => { throw new Error("network"); });

    const { result } = renderHook(() => useSignOut());
    act(() => { result.current.run(); });

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });
});
