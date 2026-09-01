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

  const unread = items.filter((i) => i.unread).length;

  function markOne(id: string) {
    // Оптимистично: человек уходит по ссылке, ждать ответа незачем. Не сошлось —
    // следующий заход покажет строку непрочитанной.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unread: false } : i)));
    startTransition(() => { void markNotificationRead(id); });
  }

  function markAll() {
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })));
    startTransition(() => { void markAllNotificationsRead(); });
  }

  async function loadMore() {
    // Защита от повторного клика: без неё вторая страница приедет дважды.
    if (!cursor || loading) return;
    setLoading(true);
    const res = await fetchMoreNotifications(cursor);
    setLoading(false);
    if (!res.ok) return;
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
            {loading ? content.chat.loadingOlder : t.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
