// Валидация сообщений. Payload приходит извне и типу не соответствует
// автоматически — разбирается zod'ом до похода в базу.

import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 2000;

// Нормализация до проверки длины: иначе хвост пробелов съедает лимит, а
// сообщение из полусотни пустых строк растягивает ленту переписки.
export function normalizeBody(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const messageBodySchema = z
  .string()
  .transform(normalizeBody)
  .refine((b) => b.length > 0, { message: "Сообщение не может быть пустым" })
  .refine((b) => b.length <= MAX_MESSAGE_LENGTH, {
    message: `Сообщение не длиннее ${MAX_MESSAGE_LENGTH} символов`,
  });

// Первое сообщение по объявлению: тред ещё не существует.
export const startThreadSchema = z.object({
  listingId: z.string().min(1),
  body: messageBodySchema,
});

// Ответ в существующем треде — доступен обоим участникам.
export const postMessageSchema = z.object({
  threadId: z.string().min(1),
  body: messageBodySchema,
});

// Идентификаторы, приходящие с клиента отдельными аргументами. Без разбора
// нестроковое значение уезжало бы прямо в драйвер базы и давало 500 вместо
// внятного отказа.
export const threadIdSchema = z.string().min(1).max(40);
export const cursorSchema = z.string().min(1).max(40);

export type StartThreadInput = z.input<typeof startThreadSchema>;
export type PostMessageInput = z.input<typeof postMessageSchema>;
