// Виды уведомлений и правила их выбора. Модуль чистый — базы не знает, поэтому
// покрыт тестами без живого Postgres. Это единственное место, где точка записи
// связывается с видом.
//
// Список продублирован в drizzle/schema.ts: слой db не имеет права импортировать
// из lib (направление зависимостей app → server → lib → db). От расхождения
// страхует тест, сверяющий enumValues с этим списком.

import type { BookingStatus } from "@/lib/catalog/booking-status";

export const NOTIFICATION_KINDS = [
  "chat_message",
  "request_created",
  "request_cancelled",
  "request_confirmed",
  "request_declined",
  "request_completed",
  "request_no_show",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

// Решения владельца по заявке — подмножество BookingStatus. Сужение не
// косметика: transitionRequest принимает все семь статусов, а вид уведомления
// есть только у четырёх, и `request_${to}` на полном union не типизируется.
export type OwnerDecision = Extract<
  BookingStatus,
  "confirmed" | "declined" | "completed" | "no_show"
>;

export function kindForDecision(to: OwnerDecision): NotificationKind {
  return `request_${to}`;
}

// Получателя задаёт точка записи, а не вид: request_cancelled рождается и у
// владельца (отменил арендатор), и у арендатора (владелец отменил
// подтверждённую). Здесь только охранник «не уведомляй самого себя» — заявку на
// своё объявление создать можно, createBookingRequest сравнивает лишь статус.
export function notificationRecipient(
  recipientId: string | null,
  actorId: string,
): string | null {
  if (!recipientId || recipientId === actorId) return null;
  return recipientId;
}
