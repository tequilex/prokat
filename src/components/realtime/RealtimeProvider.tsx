"use client";

// Соединение с процессом доставки и единственное место, где живёт правило
// обновления серверных частей страницы.
//
// Провайдер стоит в корневом layout — счётчик должен оживать где угодно, а не
// только в кабинете. Соединение при этом открывается только залогиненным: флаг
// приезжает заголовком из middleware, поэтому третьего auth() на каждой
// публичной странице не нужно.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CLOSE, isTerminalClose, type ClientFrame } from "@/lib/realtime/events";
import { fetchCounters } from "@/server/actions/realtime";
import { createRealtimeStore } from "@/components/realtime/store";
import { RealtimeContext } from "@/components/realtime/context";


// Адрес строится из location, а не из переменной окружения. NEXT_PUBLIC_* она
// была бы обязана быть, а такая переменная запекается на next build — то есть
// вернулась бы цепочка build arg'ов через четыре файла и целый класс отказов
// «прод-бандл уехал с пустым адресом, вскрылось только в браузере».
// В деве Caddy нет: Next на :3000, сокет на :3100. Именно location.hostname, а
// не localhost, — с телефона страницу открывают по 192.168.x.x.
const DEV_REALTIME_PORT = 3100;

function socketUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return `ws://${window.location.hostname}:${DEV_REALTIME_PORT}/ws`;
  }
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/ws`;
}

// Дебаунс общий для событий и отметок прочтения: на серверную часть страницы
// они действуют одинаково, а раздельные таймеры дали бы два рендера подряд.
const REFRESH_DEBOUNCE_MS = 400;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;

// Refresh нужен только там, где есть что чинить: список переписок, галочки,
// серверные бейджи. На каталоге его нет вовсе, а страницы там force-dynamic —
// вызывать его значило бы гонять полный SSR выдачи на каждое чужое сообщение.
function refreshableRoute(pathname: string): boolean {
  return pathname.startsWith("/chat")
    || pathname.startsWith("/cabinet")
    || pathname.startsWith("/requests")
    || pathname.startsWith("/notifications")
    || pathname.startsWith("/profile");
}

export function RealtimeProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [store] = useState(createRealtimeStore);
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const socketRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const scheduleRefresh = useCallback(() => {
    // Фоновая вкладка не перерисовывается: иначе каждое событие стоило бы
    // десятка запросов к базе на вкладку, а ядро на сервере одно.
    if (document.visibilityState !== "visible") return;
    if (!refreshableRoute(pathRef.current)) return;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
  }, [router]);

  const pullCounters = useCallback(async () => {
    // Событие счётчиков не несёт, поэтому инкрементить нечего: клиент всегда
    // забирает абсолютные числа. Иначе после ближайшего refresh проп уже
    // содержал бы ту же дельту, и число удвоилось бы.
    const res = await fetchCounters();
    if (res.ok) store.getState().setCounters(res.data);
  }, [store]);

  useEffect(() => {
    if (!enabled) {
      store.getState().setStatus("offline");
      return;
    }
    stoppedRef.current = false;

    const connect = () => {
      if (stoppedRef.current) return;
      const socket = new WebSocket(socketUrl());
      socketRef.current = socket;
      store.getState().setStatus("connecting");

      socket.onopen = () => {
        attemptsRef.current = 0;
        store.getState().setStatus("online");
        void pullCounters();
      };

      socket.onmessage = (event) => {
        let frame: ClientFrame;
        try {
          frame = JSON.parse(String(event.data)) as ClientFrame;
        } catch {
          return;
        }
        const state = store.getState();
        if (frame.type === "resync") {
          state.markResync();
          void pullCounters();
        } else if (frame.type === "message") {
          state.pushMessage(frame.threadId, frame.messageId);
          if (frame.counters) void pullCounters();
        } else if (frame.type === "request") {
          if (frame.counters) void pullCounters();
        }
        scheduleRefresh();
      };

      socket.onclose = (event) => {
        socketRef.current = null;
        const state = store.getState();
        // Счётчики перестают быть достоверными: без этого умерший realtime
        // заморозил бы бейдж на последнем известном числе навсегда.
        state.forgetCounters();

        if (isTerminalClose(event.code)) {
          // Сессии нет, бан или чужой Origin. Переподключение здесь дало бы
          // вечный цикл у вкладки с мёртвой cookie и выело бы лимитер.
          state.setStatus("unauthorized");
          stoppedRef.current = true;
          return;
        }
        state.setStatus("offline");
        // Джиттер обязателен: рестарт realtime иначе соберёт все вкладки в один
        // залп, а ядро одно.
        const wait = event.code === CLOSE.ttl
          ? BACKOFF_BASE_MS * Math.random()
          : Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** attemptsRef.current)
            * (0.5 + Math.random());
        attemptsRef.current += 1;
        setTimeout(connect, wait);
      };

      socket.onerror = () => socket.close();
    };

    connect();

    // iOS Safari замораживает вкладку: close приходит с задержкой или не
    // приходит вовсе. Возврат видимости — самостоятельный повод убедиться, что
    // канал жив, и дочитать пропущенное.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!socketRef.current && !stoppedRef.current) {
        attemptsRef.current = 0;
        connect();
      } else if (socketRef.current?.readyState === WebSocket.OPEN) {
        store.getState().markResync();
        void pullCounters();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stoppedRef.current = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, store, pullCounters, scheduleRefresh]);

  return (
    <RealtimeContext.Provider value={store}>{children}</RealtimeContext.Provider>
  );
}

