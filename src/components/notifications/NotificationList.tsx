"use client";

// Список уведомлений. Клиентский, потому что делает три вещи, которых серверный
// не умеет: гасит строку по клику, догружает страницу курсором и держит
// оптимистичное состояние прочтения.
//
// Открытие списка прочтение НЕ гасит: иначе колонка read_at теряет смысл, а
// список становится одноразовым — зашёл и всё стёр. Гасит клик по строке и
// кнопка «отметить все».

import { useState, useTransition } from "react";
import Link from "next/link";
import { content } from "@theme/content";
import { notificationTarget } from "@/lib/notifications/target";
import { useRealtime } from "@/components/realtime/context";
import {
  fetchMoreNotifications, markAllNotificationsRead, markNotificationRead,
} from "@/server/actions/notifications";
import type { NotificationItem } from "@/server/notifications";

const t = content.notifications;

export function NotificationList({
  initialItems,
  initialCursor,
}: {
  initialItems: NotificationItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  // При живом сокете бейдж читает стор, а не серверный groups. Значит
  // прочитанное надо погасить и там — иначе число не упадёт до ближайшего
  // чужого события, и это было бы хуже, чем до задачи.
  const setCounters = useRealtime((s) => s.setCounters);
  const counters = useRealtime((s) => s.counters);

  const unread = items.filter((i) => i.unread).length;

  function applyUnread(next: number) {
    if (counters) setCounters({ ...counters, notifications: next });
  }

  function markOne(id: string) {
    // Оптимистично: человек уходит по ссылке, ждать ответа незачем.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unread: false } : i)));
    startTransition(async () => {
      const res = await markNotificationRead(id);
      // Откат: без него строка выглядит прочитанной, а в базе непрочитана, и
      // расхождение всплывёт только при следующем заходе.
      if (!res.ok) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unread: true } : i)));
        setFailed(true);
        return;
      }
      applyUnread(res.data.unread);
    });
  }

  function markAll() {
    const before = items;
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })));
    startTransition(async () => {
      const res = await markAllNotificationsRead();
      if (!res.ok) { setItems(before); setFailed(true); return; }
      applyUnread(res.data.unread);
    });
  }

  async function loadMore() {
    // Защита от повторного клика: без неё вторая страница приедет дважды.
    if (!cursor || loading) return;
    setLoading(true);
    const res = await fetchMoreNotifications(cursor);
    setLoading(false);
    // Молчаливый выход оставлял бы кнопку на месте и выглядел как «зависло».
    if (!res.ok) { setFailed(true); return; }
    setFailed(false);
    // Дедупликация по id: страницы могли пересечься, если между запросами
    // created_at сдвинулся бампом при схлопывании.
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.id));
      return [...prev, ...res.data.items.filter((i) => !seen.has(i.id))];
    });
    setCursor(res.data.nextCursor);
  }

  return (
    <div className="flex flex-col gap-3">
      {unread > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={markAll}
            disabled={pending}
            className="hoverable rounded-sm border border-border px-3 py-1.5 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {t.markAll}
          </button>
        </div>
      )}

      {failed && (
        <p role="status" className="text-sm text-destructive">
          {content.notifications.actionFailed}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const target = notificationTarget(item.kind, item.entityId);
          return (
            <li key={item.id}>
              <Link
                href={target.href as never}
                onClick={() => markOne(item.id)}
                className="hoverable flex items-start gap-3 rounded-lg border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Непрочитанное метится тем же способом, что и в списке
                    переписок: охра плюс контраст текста. Заливка выбранного
                    здесь была бы не по смыслу — строка ничего не выбирает. */}
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2 flex-none rounded-pill ${item.unread ? "bg-accent" : "bg-transparent"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block ${item.unread ? "font-medium" : "text-muted-foreground"}`}>
                    {t.kinds[item.kind]}
                    {item.unread && <span className="sr-only">, {t.unreadMark}</span>}
                  </span>
                  <span className={`mt-0.5 block truncate text-sm ${
                    item.unread ? "text-foreground" : "text-muted-foreground"
                  }`}
                  >
                    {item.listingTitle ?? t.entityGone}
                    {item.partyName ? ` · ${item.partyName}` : ""}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{item.when}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {cursor && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="hoverable rounded-sm border border-border px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {loading ? t.loadingMore : t.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
