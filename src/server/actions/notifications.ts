"use server";

// Server actions уведомлений: отметка прочтения одной строки, всех сразу и
// догрузка страницы списка.
//
// Инварианты:
// - права проверяются самим запросом: user_id входит в WHERE, а не сверяется
//   после чтения строки. Дешевле и не оставляет окна между чтением и записью;
// - обе отметки возвращают новый счётчик. Иначе прочитанное не гасит бейдж:
//   после подключения сокета число берётся из стора, и серверный groups ему
//   уже не указ.

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { notifications } from "@db/schema";
import { auth } from "@/lib/auth";
import { checkLimit } from "@/lib/rate-limit";
import {
  countUnreadNotifications, getNotifications, toNotificationItem,
  type NotificationItem,
} from "@/server/notifications";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ULID, как и остальные id в проекте.
const notificationIdSchema = z.string().min(1).max(64);

export async function markNotificationRead(
  rawId: unknown,
): Promise<ActionResult<{ unread: number }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "auth_required" };
  const userId = session.user.id;

  const parsed = notificationIdSchema.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const limit = checkLimit(userId, "notification_read");
  if (!limit.ok) return { ok: false, error: `rate_limited:${limit.retryAfterSec}` };

  // Чужая строка просто не попадёт под WHERE — отдельной проверки владения и
  // отдельного ответа «не ваше» не нужно.
  await getDb().update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(
      eq(notifications.id, parsed.data),
      eq(notifications.userId, userId),
      isNull(notifications.readAt),
    ));

  revalidatePath("/notifications");
  return { ok: true, data: { unread: await countUnreadNotifications(userId) } };
}

export async function markAllNotificationsRead(): Promise<ActionResult<{ unread: number }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "auth_required" };
  const userId = session.user.id;

  const limit = checkLimit(userId, "notification_read");
  if (!limit.ok) return { ok: false, error: `rate_limited:${limit.retryAfterSec}` };

  await getDb().update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  revalidatePath("/notifications");
  return { ok: true, data: { unread: 0 } };
}

// Догрузка страницы списка. Это чтение, но вызывается с клиента, а значит
// доступно по сети напрямую — права и лимит проверяются здесь так же, как в
// мутации. Потолок страницы держит сам ридер.
export async function fetchMoreNotifications(
  rawCursor: unknown,
): Promise<ActionResult<{ items: NotificationItem[]; nextCursor: string | null }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "auth_required" };

  const parsed = z.string().min(1).max(120).safeParse(rawCursor);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const limit = checkLimit(session.user.id, "notification_read");
  if (!limit.ok) return { ok: false, error: `rate_limited:${limit.retryAfterSec}` };

  const { rows, nextCursor } = await getNotifications(session.user.id, parsed.data);
  return { ok: true, data: { items: rows.map(toNotificationItem), nextCursor } };
}
