// Запись уведомлений. Модуль намеренно БЕЗ "use server": он вызывается изнутри
// чужих транзакций, а не по сети, и сетевой ручкой быть не должен.
//
// Порядок блокировок во всех вызывающих транзакциях один: сначала chat_threads
// или booking_requests, только потом notifications. Встречный порядок даёт живой
// дедлок на треде с активной перепиской — это проверено, а не предположено.

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications } from "@db/schema";
import { newId } from "@/lib/id";
import { type NotificationKind, notificationRecipient } from "@/lib/notifications/kinds";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

// Сколько прочитанных строк удаляется за один проход. Крона нет, чистка
// ленивая — верхняя граница нужна, чтобы редкий заход на страницу не превращался
// в долгий DELETE.
const PURGE_BATCH = 200;
const PURGE_AFTER_DAYS = 30;

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

// ============================== Чтение ==============================

// Непрочитанные события КРОМЕ переписки. Сообщения исключены намеренно: у них
// свой счётчик, и без этого условия кружок на кабинете показывал бы ровно то
// же, что кружок на чатах, — то есть дублировал бы его.
//
// Идёт по префиксу частичного UNIQUE; kind в него входит третьей колонкой,
// отдельный индекс не нужен.
export async function countUnseenNonChatEvents(userId: string): Promise<number> {
  const rows = await getDb().select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      isNull(notifications.readAt),
      ne(notifications.kind, "chat_message"),
    ));
  return rows[0]?.n ?? 0;
}

// Ленивая чистка прочитанного — крона нет, единственный планировщик в проде это
// бэкап. Дёргается перед чтением списков заявок, по образцу протухания.
//
// DELETE ... LIMIT в Postgres не существует, отсюда подзапрос. SKIP LOCKED не
// украшение: два параллельных рендера иначе встанут друг на друга на
// блокировках строк. Критерий именно read_at — по created_at частичный индекс
// не зайдёт, и удаление пойдёт сиквеншл-сканом.
export async function purgeReadNotifications(): Promise<void> {
  await getDb().execute(sql`
    delete from ${notifications}
    where ${notifications.id} in (
      select ${notifications.id} from ${notifications}
      where ${notifications.readAt} < now() - ${`${PURGE_AFTER_DAYS} days`}::interval
      limit ${PURGE_BATCH}
      for update skip locked
    )
  `);
}

// Гашение уведомлений по заявкам. Экрана уведомлений нет, поэтому «увидел» —
// это заход в тот раздел, куда уведомление и вело: входящие заявки для
// владельца, свои заявки для арендатора. Сообщения гасит markThreadRead.
export async function markRequestNotificationsSeen(
  userId: string,
  side: "owner" | "customer",
): Promise<void> {
  const kinds = side === "owner"
    ? (["request_created", "request_cancelled"] as const)
    : (["request_confirmed", "request_declined", "request_completed", "request_no_show"] as const);

  await getDb().update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(
      eq(notifications.userId, userId),
      inArray(notifications.kind, [...kinds]),
      isNull(notifications.readAt),
    ));
}
