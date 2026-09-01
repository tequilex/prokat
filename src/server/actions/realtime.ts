"use server";

// Единственная ручка, которой клиент реагирует на событие сокета.
//
// Счётчики и содержимое всплывашки берутся ОДНИМ вызовом: событие несёт только
// идентификаторы (тело сообщения через сокет не возим), а раздельные ручки
// давали бы два похода к серверу на каждое сообщение.
//
// Это чтение, но вызывается с клиента, значит доступно по сети напрямую — права
// и лимит проверяются здесь так же, как в любой мутации.

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { chatThreads } from "@db/schema";
import { auth } from "@/lib/auth";
import { checkLimit } from "@/lib/rate-limit";
import { canReadThread } from "@/lib/chat/rules";
import { cursorSchema, threadIdSchema } from "@/lib/chat/validation";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { getMessagesAfter, getUnreadCount, type ThreadMessage } from "@/server/chat";
import { countUnseenNonChatEvents } from "@/server/notifications";
import { countNewRequests } from "@/server/owner";
import { readMessageToast, readRequestToast, type ToastContent } from "@/server/realtime";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type Counters = {
  messages: number;
  notifications: number;
  requests: number;
};

const idSchema = z.string().min(1).max(64);

// Событие, на которое реагируем. Необязательное: при подключении и после
// разрыва счётчики забираются без всякого события.
const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message"), threadId: idSchema, messageId: idSchema }),
  z.object({
    type: z.literal("request"),
    requestId: idSchema,
    kind: z.enum(NOTIFICATION_KINDS.filter((k) => k !== "chat_message") as [string, ...string[]]),
  }),
]).optional();

export async function fetchRealtimeUpdate(
  rawEvent?: unknown,
): Promise<ActionResult<{ counters: Counters; toast: ToastContent | null }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "auth_required" };
  const userId = session.user.id;
  if (session.user.bannedAt) return { ok: false, error: "banned" };

  const parsedEvent = eventSchema.safeParse(rawEvent ?? undefined);
  if (!parsedEvent.success) return { ok: false, error: "invalid_input" };

  const limit = checkLimit(userId, "realtime_sync");
  if (!limit.ok) return { ok: false, error: `rate_limited:${limit.retryAfterSec}` };

  const event = parsedEvent.data;
  // Числа абсолютные, а не дельты: инкремент от неизвестного значения разошёлся
  // бы с базой, а после ближайшего refresh проп принёс бы ту же дельту второй раз.
  const [messages, notifications, requests, toast] = await Promise.all([
    getUnreadCount(userId),
    countUnseenNonChatEvents(userId),
    countNewRequests(userId),
    !event
      ? Promise.resolve(null)
      : event.type === "message"
        ? readMessageToast(userId, event.threadId, event.messageId)
        : readRequestToast(userId, event.requestId, event.kind as never),
  ]);

  return { ok: true, data: { counters: { messages, notifications, requests }, toast } };
}

// Догон ленты: всё, что появилось строго после курсора. Отдаётся по
// возрастанию, страницами — при длинном разрыве клиент идёт циклом, пока
// hasMore не станет false. Отдавать «последние N», как getMessages, нельзя:
// середина накопленного тогда исчезла бы бесследно.
export async function fetchNewerMessages(
  rawThreadId: unknown,
  rawAfter: unknown,
): Promise<ActionResult<{ messages: ThreadMessage[]; hasMore: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "auth_required" };
  // Явная проверка бана: страница редиректит забаненного на /banned, но эта
  // ручка живёт без страницы, а canReadThread про бан ничего не знает. Сокет
  // бан проверяет — без этой строки два канала одной задачи разошлись бы в
  // правах: сокет молчит, а экшен отдаёт.
  if (session.user.bannedAt) return { ok: false, error: "banned" };

  const args = z.object({ threadId: threadIdSchema, after: cursorSchema })
    .safeParse({ threadId: rawThreadId, after: rawAfter });
  if (!args.success) return { ok: false, error: "invalid_input" };

  const limit = checkLimit(session.user.id, "realtime_sync");
  if (!limit.ok) return { ok: false, error: `rate_limited:${limit.retryAfterSec}` };

  const rows = await getDb().select({
    ownerUserId: chatThreads.ownerUserId,
    customerUserId: chatThreads.customerUserId,
  })
    .from(chatThreads)
    .where(eq(chatThreads.id, args.data.threadId))
    .limit(1);
  const thread = rows[0];
  if (!thread || !canReadThread(session.user.id, thread)) {
    return { ok: false, error: "not_participant" };
  }

  return { ok: true, data: await getMessagesAfter(args.data.threadId, args.data.after) };
}
