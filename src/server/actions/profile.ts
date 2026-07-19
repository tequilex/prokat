"use server";

// Профиль покупателя: имя и телефон. Телефон предзаполняет форму заявки.

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { users } from "@db/schema";
import { auth } from "@/lib/auth";
import { normalizePhone } from "@/lib/booking/validation";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(100),
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

  await getDb().update(users)
    .set({ name: parsed.data.name, phone: parsed.data.phone ?? null })
    .where(eq(users.id, session.user.id));

  revalidatePath("/profile");
  return { ok: true, data: undefined };
}
