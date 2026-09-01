// Публикация события доставки. Мост между транзакцией в app и процессом
// realtime: pg_notify доставляет payload только после коммита, поэтому событие
// не может обогнать данные, о которых рассказывает.
//
// Вызывается ПОСЛЕДНИМ оператором транзакции. Причина не в стиле: ошибка внутри
// транзакции откатывает её целиком — то есть сообщение пользователя не
// сохранилось бы из-за неудачного уведомления. Savepoint для этого не нужен:
// длина payload гарантируется построением (ULID фиксированной длины, тела
// сообщения в событии нет), а лимит pg_notify — почти 8 КБ.

import { sql } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import {
  REALTIME_CHANNEL, serializeNotify, type NotifyPayload,
} from "@/lib/realtime/events";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function publish(tx: Tx, payload: NotifyPayload): Promise<void> {
  await tx.execute(sql`select pg_notify(${REALTIME_CHANNEL}, ${serializeNotify(payload)})`);
}
