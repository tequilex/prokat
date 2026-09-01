// Запись уведомлений. Модуль намеренно БЕЗ "use server": он вызывается изнутри
// чужих транзакций, а не по сети, и сетевой ручкой быть не должен.
//
// Порядок блокировок во всех вызывающих транзакциях один: сначала chat_threads
// или booking_requests, только потом notifications. Встречный порядок даёт живой
// дедлок на треде с активной перепиской — это проверено, а не предположено.

import { sql } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import { notifications } from "@db/schema";
import { newId } from "@/lib/id";
import { type NotificationKind, notificationRecipient } from "@/lib/notifications/kinds";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export type NotifyResult = {
  id: string;
  // false означает, что строка схлопнулась с уже существующей непрочитанной.
  // На этом флаге будет висеть «счётчик +1» при подключении сокета: слать его на
  // схлопнутое уведомление нельзя, иначе клиентский счётчик уедет от базы.
  inserted: boolean;
};

// Единственный путь записи. Охранник «не уведомляй самого себя» стоит внутри, а
// не у вызывающих: он нужен в четырёх местах, и поставленный в трёх из четырёх
// выглядел бы работающим. Заявку на своё объявление создать можно.
export async function notify(
  tx: Tx,
  input: {
    recipientId: string | null;
    actorId: string;
    kind: NotificationKind;
    entityId: string;
  },
): Promise<NotifyResult | null> {
  const userId = notificationRecipient(input.recipientId, input.actorId);
  if (!userId) return null;

  const rows = await tx.insert(notifications)
    .values({ id: newId(), userId, kind: input.kind, entityId: input.entityId })
    .onConflictDoUpdate({
      target: [notifications.userId, notifications.kind, notifications.entityId],
      // targetWhere обязателен: ON CONFLICT по частичному индексу без повторения
      // его предиката падает с 42P10 в рантайме.
      targetWhere: sql`${notifications.readAt} is null`,
      // Бамп created_at, а не пустой set: без него схлопнутое уведомление не
      // всплывает в списке, а снимок в markThreadRead гасит его вместе со
      // свежим сообщением — ровно та гонка, ради которой всё в транзакции.
      set: { createdAt: sql`now()` },
    })
    // id из RETURNING, а не сгенерированный: при схлопывании возвращается id
    // существующей строки. xmax = 0 отличает настоящую вставку от обновления.
    .returning({ id: notifications.id, inserted: sql<boolean>`(xmax = 0)` });

  return rows[0] ?? null;
}
