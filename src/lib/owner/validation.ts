// Валидация формы товара кабинета.

import { z } from "zod";

const priceField = z.union([z.literal(""), z.coerce.number().int().min(0).max(10_000_000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const handoverField = z.boolean({
  required_error: "Форма устарела — обновите страницу",
  invalid_type_error: "Форма устарела — обновите страницу",
});

export const listingFormSchema = z.object({
  title: z.string().trim().min(3, "Название от 3 символов").max(200),
  categoryId: z.string().min(1, "Выберите категорию"),
  cityId: z.string().min(1, "Выберите город"),
  description: z.string().trim().max(3000).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),  // район/ориентир, опц.
  priceDay: priceField,
  priceHour: priceField,
  priceWeek: priceField,
  depositType: z.enum(["money", "document", "none"]),
  depositAmount: priceField,
  quantity: z.coerce.number().int().min(1).max(1000),
  // Способ получения. Флаги обязательные, без дефолтов: updateListing пишет
  // .set() всеми полями, и подстановка «самовывоз без доставки» вместо
  // отсутствующего ключа молча снимала бы владельцу доставку при любой правке
  // объявления из устаревшей вкладки. Пусть лучше запрос не пройдёт.
  // Сообщения разные не для красоты: «оба сняты» человек чинит галочкой, а
  // отсутствующий ключ шлёт бандл, в форме которого этого поля ещё нет, — там
  // единственное лечение перезагрузить страницу.
  handoverPickup: handoverField,
  handoverDelivery: handoverField,
  photos: z.array(z.object({
    url: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })).max(10).default([]),
}).refine((v) => v.priceDay !== null || v.priceHour !== null || v.priceWeek !== null, {
  message: "Укажите хотя бы одну цену",
  path: ["priceDay"],
}).refine((v) => v.handoverPickup || v.handoverDelivery, {
  message: "Выберите хотя бы один способ получения",
  path: ["handoverPickup"],
});

export type ListingForm = z.output<typeof listingFormSchema>;

// Слаги, зарезервированные под маршруты приложения: слаг категории (сегмент после
// города) не должен их перекрывать (категории проверяются отдельно по БД).
export const RESERVED_SLUGS = new Set([
  "api", "admin", "cabinet", "requests", "login", "welcome", "banned",
  "privacy", "dev", "u", "sitemap.xml", "robots.txt", "manifest.webmanifest",
]);
