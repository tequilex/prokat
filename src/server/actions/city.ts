"use server";

// Выбор города в шапке. Пишет куку «где я сейчас смотрю» — ту, что читает
// resolveViewerCity для страниц без города в адресе.
//
// Куку пишет именно server action, а не document.cookie на клиенте: во-первых,
// атрибуты (path, secure, срок) задаются в одном месте и не разъезжаются;
// во-вторых, cookies().set сбрасывает клиентский кеш роутера, а без этого
// ломался бы «Назад» — страницы переиспользуются при навигации назад/вперёд, и
// человек вернулся бы на главную со старой лентой под новым названием города.

import { cookies } from "next/headers";
import { z } from "zod";
import { getCityBySlug } from "@/server/catalog";
import { CITY_COOKIE, cityCookieOptions } from "@/lib/catalog/city-cookie";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const slugSchema = z.string().trim().min(1).max(80);

// Прав здесь не спрашиваем: город смотрят и анонимы, это настройка браузера, а
// не пользователя. Но слаг проверяем по базе — в куку не должно попадать то,
// чего нет: она живёт год и потом молча обнуляла бы витрину.
export async function setCityPreference(input: unknown): Promise<ActionResult> {
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const city = await getCityBySlug(parsed.data);
  if (!city) return { ok: false, error: "unknown_city" };

  (await cookies()).set(CITY_COOKIE, city.slug, cityCookieOptions());
  return { ok: true, data: undefined };
}

/* Выход из аккаунта. Кука живёт год и вперёд профиля в цепочке, поэтому без
 * чистки второй человек за тем же браузером получил бы город первого — и его
 * собственный «мой город» этим бы перебивался. */
export async function forgetCityPreference(): Promise<void> {
  (await cookies()).delete(CITY_COOKIE);
}
