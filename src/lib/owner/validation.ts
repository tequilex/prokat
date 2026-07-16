// Валидация форм кабинета владельца (прокат и позиция).

import { z } from "zod";
import { normalizePhone } from "@/lib/booking/validation";

// Телефоны вводятся строкой через запятую, храним массивом нормализованных.
const phonesField = z.string().trim().transform((raw) =>
  raw.split(",").map((s) => normalizePhone(s)).filter((p) => p.length > 0),
).refine((arr) => arr.length > 0, { message: "Укажите хотя бы один телефон" });

export const providerFormSchema = z.object({
  name: z.string().trim().min(3, "Название от 3 символов").max(150),
  cityId: z.string().min(1, "Выберите город"),
  description: z.string().trim().max(2000).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  phones: phonesField,
  workHours: z.string().trim().max(200).optional().default(""),
});

export type ProviderForm = z.output<typeof providerFormSchema>;

const priceField = z.union([z.literal(""), z.coerce.number().int().min(0).max(10_000_000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const listingFormSchema = z.object({
  title: z.string().trim().min(3, "Название от 3 символов").max(200),
  categoryId: z.string().min(1, "Выберите категорию"),
  description: z.string().trim().max(3000).optional().default(""),
  priceDay: priceField,
  priceHour: priceField,
  priceWeek: priceField,
  depositType: z.enum(["money", "document", "none"]),
  depositAmount: priceField,
  quantity: z.coerce.number().int().min(1).max(1000),
  photos: z.array(z.object({
    url: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })).max(10).default([]),
}).refine((v) => v.priceDay !== null || v.priceHour !== null || v.priceWeek !== null, {
  message: "Укажите хотя бы одну цену",
  path: ["priceDay"],
});

export type ListingForm = z.output<typeof listingFormSchema>;

// Слаги, зарезервированные под маршруты приложения: /{city}/{provider}
// не должен перекрывать их (категории проверяются отдельно по БД).
export const RESERVED_SLUGS = new Set([
  "api", "admin", "cabinet", "requests", "login", "welcome", "banned",
  "privacy", "dev", "sitemap.xml", "robots.txt", "manifest.webmanifest",
]);
