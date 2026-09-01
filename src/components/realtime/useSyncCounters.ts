"use client";

// Перечитать счётчики после того, как что-то прочитано.
//
// Нужно потому, что при живом сокете бейдж и кружок читают стор, а не серверный
// проп: `router.refresh()` обновляет второй и на первый не влияет. Без этого
// вызова прочитанная переписка гасила счётчик в базе, но не на экране — до
// ближайшего чужого события или перезагрузки.

import { useCallback, useContext } from "react";
import { RealtimeContext } from "@/components/realtime/context";
import { fetchRealtimeUpdate } from "@/server/actions/realtime";

export function useSyncCounters(): () => void {
  const store = useContext(RealtimeContext);
  return useCallback(() => {
    // Без события: содержимое всплывашки здесь не нужно, только числа.
    void fetchRealtimeUpdate().then((res) => {
      if (res.ok) store.getState().setCounters(res.data.counters);
    });
  }, [store]);
}
