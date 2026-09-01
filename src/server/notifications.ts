// Запись уведомлений. Модуль намеренно БЕЗ "use server": он вызывается изнутри
// чужих транзакций, а не по сети, и сетевой ручкой быть не должен.
//
// Порядок блокировок во всех вызывающих транзакциях один: сначала chat_threads
// или booking_requests, только потом notifications. Встречный порядок даёт живой
// дедлок на треде с активной перепиской — это проверено, а не предположено.

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import {
  bookingRequests, chatThreads, listings, notifications, users,
} from "@db/schema";
import { newId } from "@/lib/id";
import { type NotificationKind, notificationRecipient } from "@/lib/notifications/kinds";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export const NOTIFICATIONS_PAGE_SIZE = 30;

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

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  entityId: string;
  readAt: Date | null;
  createdAt: Date;
  /** Название вещи, о которой уведомление. null — сущность недоступна. */
  listingTitle: string | null;
  /** Вторая сторона: собеседник в треде или контрагент по заявке. */
  partyName: string | null;
};

// Строка в том виде, в каком её получает клиент: без Date, без read_at.
//
// Дата форматируется здесь, а не в клиентском компоненте: он рендерится и на
// сервере тоже, а таймзона контейнера и браузера разные — toLocaleString на
// клиенте дал бы рассинхрон гидратации.
export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  entityId: string;
  unread: boolean;
  when: string;
  listingTitle: string | null;
  partyName: string | null;
};

export function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    entityId: row.entityId,
    unread: row.readAt === null,
    when: row.createdAt.toLocaleString("ru-RU", {
      day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    }),
    listingTitle: row.listingTitle,
    partyName: row.partyName,
  };
}

// Курсор непрозрачный для вызывающего: пара (created_at, id), потому что
// created_at не уникален и на бампе при схлопывании двигается.
//
// Метка возится ТЕКСТОМ, отданным самим Postgres, и биндится обратно как
// timestamp. Через Date её проносить нельзя: Postgres хранит микросекунды, а
// node-postgres отдаёт миллисекунды — округлённый курсор перескакивает через
// строки, и вторая страница молча теряет всё, что попало в тот же миллисекундный
// интервал. Та же ловушка, что и в гашении уведомлений при markThreadRead.
function decodeCursor(raw: string): { createdAt: string; id: string } | null {
  const at = raw.indexOf("|");
  if (at <= 0) return null;
  const createdAt = raw.slice(0, at);
  const id = raw.slice(at + 1);
  return createdAt && id ? { createdAt, id } : null;
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  // Идёт по префиксу частичного UNIQUE — отдельный индекс под счётчик не нужен.
  const rows = await getDb().select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows[0]?.n ?? 0;
}

// Список с историей. Два LEFT JOIN по одной колонке entity_id — цена того, что
// связь полиморфная и внешнего ключа нет. Сущность могла стать недоступной
// (объявление скрыли, собеседника забанили): такие строки остаются в списке,
// но без названия — история переписки и заявок в проекте не прячется.
export async function getNotifications(
  userId: string,
  cursor?: string,
): Promise<{ rows: NotificationRow[]; nextCursor: string | null }> {
  const thread = alias(chatThreads, "n_thread");
  const threadListing = alias(listings, "n_thread_listing");
  const threadParty = alias(users, "n_thread_party");
  const request = alias(bookingRequests, "n_request");
  const requestListing = alias(listings, "n_request_listing");
  const requestParty = alias(users, "n_request_party");

  const after = cursor ? decodeCursor(cursor) : null;

  const rows = await getDb().select({
    id: notifications.id,
    kind: notifications.kind,
    entityId: notifications.entityId,
    readAt: notifications.readAt,
    createdAt: notifications.createdAt,
    // Текстовое представление метки — из него собирается курсор.
    createdAtText: sql<string>`${notifications.createdAt}::text`,
    listingTitle: sql<string | null>`coalesce(${threadListing.title}, ${requestListing.title})`,
    partyName: sql<string | null>`coalesce(${threadParty.name}, ${requestParty.name})`,
  })
    .from(notifications)
    .leftJoin(thread, and(
      eq(notifications.kind, "chat_message"),
      eq(thread.id, notifications.entityId),
    ))
    .leftJoin(threadListing, eq(threadListing.id, thread.listingId))
    // Вторая сторона треда — тот из двоих, кто не получатель уведомления.
    .leftJoin(threadParty, sql`${threadParty.id} = case
      when ${thread.ownerUserId} = ${notifications.userId} then ${thread.customerUserId}
      else ${thread.ownerUserId} end`)
    .leftJoin(request, and(
      sql`${notifications.kind} <> 'chat_message'`,
      eq(request.id, notifications.entityId),
    ))
    .leftJoin(requestListing, eq(requestListing.id, request.listingId))
    .leftJoin(requestParty, sql`${requestParty.id} = case
      when ${request.ownerUserId} = ${notifications.userId} then ${request.customerUserId}
      else ${request.ownerUserId} end`)
    .where(and(
      eq(notifications.userId, userId),
      after
        ? sql`(${notifications.createdAt}, ${notifications.id})
             < (${after.createdAt}::timestamp, ${after.id})`
        : undefined,
    ))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    // N+1: лишняя строка отвечает на вопрос «есть ли ещё», не считая всего.
    .limit(NOTIFICATIONS_PAGE_SIZE + 1);

  const page = rows.slice(0, NOTIFICATIONS_PAGE_SIZE);
  const last = page[page.length - 1];
  const nextCursor = rows.length > NOTIFICATIONS_PAGE_SIZE && last
    ? `${last.createdAtText}|${last.id}`
    : null;
  return { rows: page, nextCursor };
}

// Ленивая чистка прочитанного — крона нет, единственный планировщик в проде это
// бэкап. Дёргается перед чтением списка, по образцу протухания заявок.
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
