"use server";

// Server actions админки: модерация прокатов/позиций, CRUD городов и
// категорий, бан пользователей. Все проверяют роль admin сами (в отличие
// от assertAdmin с redirect — actions возвращают ошибку).

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { categories, cities, listings, providers, users } from "@db/schema";
import { auth } from "@/lib/auth";
import { newId } from "@/lib/id";
import { slugify } from "@/lib/slugify";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session.user.id;
}

// ============================== Модерация ==============================

export async function adminSetListingStatus(
  listingId: string,
  status: "active" | "hidden" | "archived",
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const res = await getDb().update(listings)
    .set({ status, updatedAt: new Date() })
    .where(eq(listings.id, listingId))
    .returning({ id: listings.id });
  if (res.length === 0) return { ok: false, error: "not_found" };
  revalidatePath("/admin/listings");
  return { ok: true, data: undefined };
}

export async function adminSetProviderVerified(
  providerId: string,
  isVerified: boolean,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const res = await getDb().update(providers)
    .set({ isVerified })
    .where(eq(providers.id, providerId))
    .returning({ id: providers.id });
  if (res.length === 0) return { ok: false, error: "not_found" };
  revalidatePath("/admin/providers");
  return { ok: true, data: undefined };
}

// ============================== Города ==============================

const citySchema = z.object({
  name: z.string().trim().min(2).max(100),
  region: z.string().trim().max(100).optional().default(""),
});

export async function adminCreateCity(input: unknown): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const parsed = citySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid_input" };

  const db = getDb();
  const slug = slugify(parsed.data.name);
  if (!slug) return { ok: false, error: "bad_name" };
  const dup = await db.select({ id: cities.id }).from(cities).where(eq(cities.slug, slug)).limit(1);
  if (dup.length > 0) return { ok: false, error: "Город с таким слагом уже есть" };

  await db.insert(cities).values({
    id: newId(),
    name: parsed.data.name,
    slug,
    region: parsed.data.region || null,
  });
  revalidatePath("/admin/cities");
  return { ok: true, data: undefined };
}

export async function adminSetCityActive(cityId: string, isActive: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const res = await getDb().update(cities)
    .set({ isActive })
    .where(eq(cities.id, cityId))
    .returning({ id: cities.id });
  if (res.length === 0) return { ok: false, error: "not_found" };
  revalidatePath("/admin/cities");
  return { ok: true, data: undefined };
}

// ============================== Категории ==============================

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  parentId: z.string().optional().default(""),
  vertical: z.string().trim().max(40).optional().default(""),
});

export async function adminCreateCategory(input: unknown): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid_input" };
  const form = parsed.data;

  const db = getDb();
  const slug = slugify(form.name);
  if (!slug) return { ok: false, error: "bad_name" };
  const dup = await db.select({ id: categories.id }).from(categories)
    .where(eq(categories.slug, slug)).limit(1);
  if (dup.length > 0) return { ok: false, error: "Категория с таким слагом уже есть" };

  if (form.parentId) {
    // Дерево строго 2 уровня: родителем может быть только корневая.
    const parent = await db.select().from(categories)
      .where(and(eq(categories.id, form.parentId), isNull(categories.parentId)))
      .limit(1);
    if (parent.length === 0) return { ok: false, error: "bad_parent" };
  }

  await db.insert(categories).values({
    id: newId(),
    parentId: form.parentId || null,
    name: form.name,
    slug,
    vertical: form.vertical || null,
  });
  revalidatePath("/admin/categories");
  return { ok: true, data: undefined };
}

export async function adminDeleteCategory(categoryId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const db = getDb();

  const [children, used] = await Promise.all([
    db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, categoryId)).limit(1),
    db.select({ id: listings.id }).from(listings).where(eq(listings.categoryId, categoryId)).limit(1),
  ]);
  if (children.length > 0) return { ok: false, error: "Сначала удалите подкатегории" };
  if (used.length > 0) return { ok: false, error: "В категории есть позиции — удалить нельзя" };

  await db.delete(categories).where(eq(categories.id, categoryId));
  revalidatePath("/admin/categories");
  return { ok: true, data: undefined };
}

// ============================== Пользователи ==============================

export async function adminBanUser(userId: string, reason: string): Promise<ActionResult> {
  const adminId = await requireAdmin();
  if (!adminId) return { ok: false, error: "forbidden" };
  if (userId === adminId) return { ok: false, error: "Нельзя забанить себя" };
  if (reason.trim().length < 5) return { ok: false, error: "Причина от 5 символов" };

  const res = await getDb().update(users)
    .set({ bannedAt: new Date(), banReason: reason.trim() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (res.length === 0) return { ok: false, error: "not_found" };
  revalidatePath("/admin/users");
  return { ok: true, data: undefined };
}

export async function adminUnbanUser(userId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const res = await getDb().update(users)
    .set({ bannedAt: null, banReason: null })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (res.length === 0) return { ok: false, error: "not_found" };
  revalidatePath("/admin/users");
  return { ok: true, data: undefined };
}
