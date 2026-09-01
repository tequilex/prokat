// Контракт события доставки. Живёт между двумя процессами: app кладёт payload
// в pg_notify, realtime его читает и рассылает по сокетам.
//
// Две разные формы, и путать их нельзя:
// - NotifyPayload — то, что едет через Postgres. Несёт список получателей.
// - ClientFrame — то, что уходит в браузер. Списка получателей в нём нет и быть
//   не должно: он говорит одному человеку про других.
//
// Тела сообщения в событии нет намеренно (см. план): клиент дочитывает его
// ридером «новее курсора». Поэтому даже неверный список получателей содержимого
// не раскроет — участие перепроверяет сам ридер.

import { z } from "zod";
import { NOTIFICATION_KINDS, type RequestNotificationKind } from "@/lib/notifications/kinds";

// Один канал на все виды. По каналу на вид означало бы N подписок LISTEN и N
// мест, где о новом виде забудут.
export const REALTIME_CHANNEL = "inrenta_realtime";

// Список для zod собирается из общего, чтобы новый вид не пришлось вписывать
// сюда руками — забыть это можно только молча.
const REQUEST_KINDS = NOTIFICATION_KINDS.filter(
  (k): k is RequestNotificationKind => k !== "chat_message",
);
export type RequestKind = RequestNotificationKind;

const idSchema = z.string().min(1).max(64);

const notifySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("chat_message"),
    threadId: idSchema,
    messageId: idSchema,
    recipients: z.array(idSchema).min(1).max(2),
    countFor: idSchema.nullable(),
  }),
  z.object({
    kind: z.enum(REQUEST_KINDS as [RequestKind, ...RequestKind[]]),
    requestId: idSchema,
    recipients: z.array(idSchema).min(1).max(1),
    countFor: idSchema.nullable(),
  }),
]);

export type NotifyPayload = z.infer<typeof notifySchema>;

export type ClientFrame =
  | { type: "message"; threadId: string; messageId: string; counters: boolean }
  | { type: "request"; requestId: string; counters: boolean };

// Получатели собираются ТОЛЬКО здесь и только из строки треда — параметром
// снаружи список не принимается никогда.
export function chatMessageNotify(input: {
  threadId: string;
  messageId: string;
  senderId: string;
  recipientId: string | null;
  /** false — строка уведомления схлопнулась с уже непрочитанной. */
  inserted: boolean;
}): NotifyPayload {
  return {
    kind: "chat_message",
    threadId: input.threadId,
    messageId: input.messageId,
    // Отправитель в списке: без эха его вторая вкладка сообщения не увидит.
    recipients: input.recipientId
      ? [input.senderId, input.recipientId]
      : [input.senderId],
    // Счётчик поднимается только получателю и только при настоящей вставке:
    // на схлопнутом уведомлении клиентский счётчик уехал бы от базы.
    countFor: input.inserted && input.recipientId ? input.recipientId : null,
  };
}

export function requestNotify(input: {
  kind: RequestKind;
  requestId: string;
  recipientId: string;
}): NotifyPayload {
  // Деятелю эхо не нужно: его собственная страница перерисовывается сама.
  return {
    kind: input.kind,
    requestId: input.requestId,
    recipients: [input.recipientId],
    countFor: input.recipientId,
  };
}

export function serializeNotify(payload: NotifyPayload): string {
  return JSON.stringify(payload);
}

// Возвращает null, а не бросает: исключение в обработчике notification роняет
// процесс, а restart: unless-stopped перезапустит его в цикл.
export function parseNotify(raw: string): NotifyPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = notifySchema.safeParse(parsed);
  return result.success ? result.data : null;
}

export function toClientFrame(payload: NotifyPayload, forUserId: string): ClientFrame {
  const counters = payload.countFor === forUserId;
  return payload.kind === "chat_message"
    ? { type: "message", threadId: payload.threadId, messageId: payload.messageId, counters }
    : { type: "request", requestId: payload.requestId, counters };
}
