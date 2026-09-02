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
    // idle — аноним: соединения нет и не должно быть.
    if (status === "online" || status === "idle") { setVisible(false); return; }
    // Терминальные состояния ждать незачем: сессии нет или вкладка от прошлой
    // сборки — само не починится.
    if (status === "unauthorized" || status === "stale") { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), GRACE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  if (!visible) return null;

  const terminal = status === "unauthorized" || status === "stale";
  const text = status === "stale" ? content.realtime.stale
    : status === "unauthorized" ? content.realtime.signedOut
      : content.realtime.offline;
  return (
    <div
      role="status"
      // Сверху, а не снизу. Внизу она ложилась прямо на поле ввода переписки:
      // там таб-бар скрыт (--tabbar-h: 0px), а композер прижат к краю экрана —
      // писать становилось невозможно ровно в тот момент, когда связь и так
      // барахлит.
      //
      // Отступ берёт максимум из высоты шапки и 3.5rem: на публичных страницах
      // высота настоящая, а в кабинете и переписке --header-total обнулена, и
      // без запаса плашка накрыла бы имя собеседника.
      //
      // pointer-events-none без исключений: плашка ничего не сообщает по клику,
      // а перехватывать тапы поверх интерфейса ей нельзя.
      className="pointer-events-none fixed inset-x-0 top-[max(var(--header-total),3.5rem)] z-40 flex justify-center px-4"
    >
      <span className="surface flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground shadow-md">
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-pill ${terminal ? "bg-destructive" : "bg-muted-foreground"}`}
        />
        {text}
      </span>
    </div>
  );
}
