// Какой город показывать там, где его нет в адресе: главная, поиск без ?city=,
// шапка, таб-бар, форма нового объявления.
//
// До этого модуля «город по умолчанию» считался в четырёх местах отдельно и
// везде означал «первый активный по алфавиту» — заведи Архангельск, и витрина
// переехала бы туда. Здесь он один, и у него есть предпочтение человека.
//
// Само правило приоритетов живёт чистой функцией в lib (pickCitySlug) и там же
// тестируется; этот модуль только собирает для неё входы.

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cities, users } from "@db/schema";
import { auth } from "@/lib/auth";
import { pickCitySlug } from "@/lib/catalog/current-city";
import { CITY_COOKIE } from "@/lib/catalog/city-cookie";
import { getActiveCities, type City } from "@/server/catalog";

async function cookieCitySlug(): Promise<string | undefined> {
  return (await cookies()).get(CITY_COOKIE)?.value;
}

// Город из профиля. Отдельным запросом, а не через сессию: в сессии его нет, и
// тащить туда поле ради одной строки в шапке не стоит.
async function profileCitySlug(): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) return undefined;

  const rows = await getDb()
    .select({ slug: cities.slug })
    .from(users)
    .innerJoin(cities, eq(cities.id, users.cityId))
    .where(eq(users.id, session.user.id))
    .limit(1);
  return rows[0]?.slug;
}

function bySlug(active: City[], slug: string | undefined): City | null {
  return active.find((c) => c.slug === slug) ?? null;
}

/**
 * Город для просмотра: кука → мой город → первый активный.
 *
 * Кука вперёд профиля, потому что она отвечает на вопрос «где я сейчас смотрю»,
 * и это более свежее намерение, чем «где я живу».
 */
export async function resolveViewerCity(): Promise<City | null> {
  const active = await getActiveCities();
  if (active.length === 0) return null;

  // Короткое замыкание на куке: в типичном запросе профиль не нужен, и лишнего
  // auth() с походом в users не случается. Резолвер зовёт корневой layout, то
  // есть он в каждом рендере публичной страницы.
  const fromCookie = bySlug(active, await cookieCitySlug());
  if (fromCookie) return fromCookie;

  const slug = pickCitySlug([await profileCitySlug()], active.map((c) => c.slug));
  return bySlug(active, slug);
}

/**
 * Город для формы нового объявления: мой город → кука → первый активный.
 *
 * Порядок обратный: вещь лежит там, где человек живёт, а не там, где он сейчас
 * листает чужой город. Поле остаётся редактируемым, цена ошибки — один клик.
 */
export async function resolveOwnCity(): Promise<City | null> {
  const active = await getActiveCities();
  if (active.length === 0) return null;

  const slug = pickCitySlug(
    [await profileCitySlug(), await cookieCitySlug()],
    active.map((c) => c.slug),
  );
  return bySlug(active, slug);
}
