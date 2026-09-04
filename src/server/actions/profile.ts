"use server";

// Профиль покупателя: имя и телефон. Телефон предзаполняет форму заявки.

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getCityById, type City } from "@/server/catalog";
import { CITY_COOKIE, cityCookieOptions } from "@/lib/catalog/city-cookie";
import { uploads, users } from "@db/schema";
import { auth } from "@/lib/auth";
import { normalizePhone } from "@/lib/booking/validation";
import { isCoverPreset } from "@/lib/covers";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(100),
  // Пустая строка = «не указан». Существование города zod проверить не может —
  // это делает запрос ниже.
  cityId: z.string().trim().max(64).optional().default(""),
  bio: z.string().trim().max(500).optional().default(""),
  // Пустая строка = убрать телефон; иначе — валидный номер.
  phone: z.string().transform((raw) => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const normalized = normalizePhone(trimmed);
    return normalized === "" ? undefined : normalized;
  }).refine((p) => p !== undefined, {
    message: "Телефон в формате +7 900 000-00-00 (или пусто)",
  }),
});

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.bannedAt) return { ok: false, error: "auth_required" };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid_input" };

  // Город проверяем по базе: zod знает только форму строки, а сюда приходит
  // произвольный payload — action доступен по сети мимо формы. Отключённый
  // город тоже не берём: он не показывается нигде, и в профиле висел бы
  // ссылкой в никуда.
  let city: City | null = null;
  if (parsed.data.cityId) {
    city = await getCityById(parsed.data.cityId);
    if (!city) return { ok: false, error: "Такого города нет" };
  }

  await getDb().update(users)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      bio: parsed.data.bio || null,
      cityId: city?.id ?? null,
    })
    .where(eq(users.id, session.user.id));

  // Выбор города в профиле — такой же явный выбор, как в селекторе шапки, и
  // обязан быть виден сразу. Без этого кука с годовым сроком перебивала бы
  // только что сохранённый город на каждой странице.
  if (city) (await cookies()).set(CITY_COOKIE, city.slug, cityCookieOptions());

  revalidatePath("/profile");
  return { ok: true, data: undefined };
}

/* Обложка профиля. Адрес не принимаем на веру: либо это стандартный пресет из
 * белого списка, либо файл, который этот же человек загрузил через /api/upload
 * — иначе в поле можно положить что угодно, вплоть до чужой картинки с
 * трекером. null — вернуть дефолтный пресет. */
export async function updateCover(url: string | null): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "auth_required" };
  const userId = session.user.id;
  if (session.user.bannedAt) return { ok: false, error: "auth_required" };

  // Server action вызывается по сети с любым payload'ом — тип не гарантирован.
  if (url !== null && typeof url !== "string") return { ok: false, error: "unknown_image" };

  if (url !== null && !isCoverPreset(url)) {
    const rows = await getDb()
      .select({ id: uploads.id })
      .from(uploads)
      .where(and(eq(uploads.publicUrl, url), eq(uploads.userId, userId)))
      .limit(1);
    if (rows.length === 0) return { ok: false, error: "unknown_image" };
  }

  await getDb().update(users).set({ coverUrl: url }).where(eq(users.id, userId));

  // Обложка живёт в layout'ах личной зоны (виден на всех подстраницах) и на
  // публичной витрине.
  revalidatePath("/cabinet", "layout");
  revalidatePath("/profile", "layout");
  revalidatePath("/requests", "layout");
  revalidatePath(`/u/${userId}`);
  return { ok: true, data: undefined };
}
