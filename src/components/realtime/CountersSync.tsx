"use client";

// Одна строчка для серверных страниц, которые гасят уведомления при рендере:
// «Мои заявки» и «Заявки на мои вещи». Сервер уже отметил их увиденными, но
// стор об этом не знает, а кружок в шапке читает именно его.

import { useEffect } from "react";
import { useSyncCounters } from "@/components/realtime/useSyncCounters";

export function CountersSync() {
  const sync = useSyncCounters();
  useEffect(sync, [sync]);
  return null;
}
