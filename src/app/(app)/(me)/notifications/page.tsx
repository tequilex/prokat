// Уведомления: единый список событий с историей вместо трёх разрозненных
// бейджей. Protected route (middleware редиректит анонимов, страница
// перепроверяет сессию сама).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getNotifications, purgeReadNotifications, toNotificationItem,
} from "@/server/notifications";
import { NotificationList } from "@/components/notifications/NotificationList";
import { content } from "@theme/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: content.notifications.title,
  robots: { index: false },
};

export default async function NotificationsPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/notifications");

  // Ленивая чистка прочитанного — крона нет, единственный планировщик в проде
  // это бэкап. Тот же приём, что у протухания заявок: работа делается перед
  // чтением списка.
  await purgeReadNotifications();

  const { rows, nextCursor } = await getNotifications(session.user.id);

  return (
    <section aria-label={content.notifications.title}>
      {rows.length === 0 ? (
        <EmptyState>{content.notifications.empty}</EmptyState>
      ) : (
        <NotificationList
          initialItems={rows.map(toNotificationItem)}
          initialCursor={nextCursor}
        />
      )}
    </section>
  );
}
