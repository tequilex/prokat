// Куда ведёт уведомление и на какую сущность оно ссылается. Модуль чистый —
// типов роутов Next не знает намеренно: слой lib от app не зависит, а href в
// навигации кабинета уже строкой (см. AccountNavItem).
//
// Это единственное место, где живёт полиморфизм entity_id: колонки entity_type
// нет, тип выводится из вида. Разъехаться молча ему не даёт тест, требующий
// адрес у каждого вида списка.

import type { NotificationKind } from "@/lib/notifications/kinds";

export type NotificationEntity = "thread" | "booking_request";

export type NotificationTarget = {
  entity: NotificationEntity;
  href: string;
};

// Отдельного роута на заявку в проекте нет — есть два списка. Поэтому шесть
// видов схлопываются в два адреса, и entity_id в адресе не участвует.
// Делит их не слово «заявка», а получатель: request_cancelled достаётся
// ВЛАДЕЛЬЦУ (отменил арендатор), и смотреть он идёт во входящие.
const OWNER_FACING: ReadonlySet<NotificationKind> = new Set([
  "request_created",
  "request_cancelled",
]);

export function notificationTarget(
  kind: NotificationKind,
  entityId: string,
): NotificationTarget {
  if (kind === "chat_message") {
    return { entity: "thread", href: `/chat/${entityId}` };
  }
  return {
    entity: "booking_request",
    href: OWNER_FACING.has(kind) ? "/cabinet/requests" : "/requests",
  };
}
