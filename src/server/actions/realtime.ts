"use server";

// Ручки, которыми клиент догоняет состояние после события сокета или разрыва.
//
// Обе — чтения, но вызываются с клиента, значит доступны по сети напрямую.
// Права и лимит проверяются здесь так же, как в любой мутации.

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { chatThreads } from "@db/schema";
import { auth } from "@/lib/auth";
import { checkLimit } from "@/lib/rate-limit";
import { canReadThread } from "@/lib/chat/rules";
import { cursorSchema, threadIdSchema } from "@/lib/chat/validation";
import { getMessagesAfter, getUnreadCount, type ThreadMessage } from "@/server/chat";
import { countUnreadNotifications } from "@/server/notifications";
import { countNewRequests } from "@/server/owner";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type Counters = {
  messages: number;
  notifications: number;
  requests: number;
};

// Событие счётчиков не несёт, а инкремент от неизвестного значения дал бы
// расхождение с базой. Поэтому клиент всегда получает абсолютные числа.
export async function fetchCounters(): Promise<ActionResult<Counters>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "auth_required" };
  const userId = session.user.id;

  const limit = checkLimit(userId, "realtime_sync");
  if (!limit.ok) return { ok: false, error: `rate_limited:${limit.retryAfterSec}` };

  const [messages, notifications, requests] = await Promise.all([
    getUnreadCount(userId),
    countUnreadNotifications(userId),
    countNewRequests(userId),
  ]);
  return { ok: true, data: { messages, notifications, requests } };
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
