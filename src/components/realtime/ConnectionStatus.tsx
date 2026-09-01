"use client";

// Полоска «связи нет». Нужна потому, что молчащий сокет неотличим от затишья:
// сообщения просто перестают приходить, и это читается как «мне никто не
// пишет», а не как поломка.
//
// Показывается НЕ сразу. Штатная ротация соединения по TTL и обычный сетевой
// микро-обрыв длятся секунды, и мигающая плашка раздражала бы сильнее, чем
// помогала. Появляется, только если связи нет дольше паузы.

import { useEffect, useState } from "react";
import { useRealtime } from "@/components/realtime/context";
import { content } from "@theme/content";

// Переподключение по TTL укладывается в секунду, обычный обрыв — в несколько.
const GRACE_MS = 6000;

export function ConnectionStatus() {
  const status = useRealtime((s) => s.status);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "online") { setVisible(false); return; }
    // Терминальный отказ ждать незачем: сессии нет, само не починится.
    if (status === "unauthorized") { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), GRACE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  if (!visible) return null;

  const terminal = status === "unauthorized";
  return (
    <div
      role="status"
      // Над таб-баром на мобиле, иначе плашка легла бы под него.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+0.75rem)] z-40 flex justify-center px-4 md:bottom-4"
    >
      <span className="surface pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground shadow-md">
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-pill ${terminal ? "bg-destructive" : "bg-muted-foreground"}`}
        />
        {terminal ? content.realtime.signedOut : content.realtime.offline}
      </span>
    </div>
  );
}
