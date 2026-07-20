# C2C-модель — Фаза 2: серверный слой

> **Для агентных воркеров:** ОБЯЗАТЕЛЬНЫЙ САБ-СКИЛЛ: superpowers:executing-plans. Это рефакторинг существующих файлов — задачи описаны как точные трансформации (не полный дамп), применять через Edit.

**Goal:** Перевести весь серверный слой (read-функции + server actions + валидация форм) с сущности `providers` на прямую модель `users`/`listings.cityId`, убрать провайдер-функции и барьер владельца.

**Architecture:** Каждый запрос, который джойнил `providers` ради города/владельца, переключается: город берётся из `listings.cityId`, владелец — из `listings.ownerUserId`/`bookingRequests.ownerUserId` (join `users` для имени/телефона/ника). Провайдер-специфичные функции и формы удаляются.

**Tech Stack:** Drizzle ORM, Zod, Next server actions, Vitest.

Спек: [../specs/2026-07-20-c2c-model-redesign-design.md](../specs/2026-07-20-c2c-model-redesign-design.md) · Roadmap: [2026-07-21-c2c-model-roadmap.md](./2026-07-21-c2c-model-roadmap.md)

---

## Область фазы

**Входит:** `lib/owner/validation.ts`, `server/catalog.ts`, `server/owner.ts`, `server/booking.ts`, `server/admin.ts`, `server/actions/owner.ts`, `server/actions/booking.ts`, `server/actions/admin.ts`.

**НЕ трогаем:**
- `server/me.ts`, `server/actions/profile.ts` — там только `users` и OAuth-`accounts.provider` (штатный Auth.js, не наша сущность).
- `app/**`, `components/**` — презентация, Фазы 3–6.
- Админ-UI и кнопка verify — Фаза 6 (здесь только server-действие `adminSetUserVerified`).

**Критерий готовности Ф2:** `grep -rn "\bproviders\b" src/server src/lib/owner` — пусто (кроме OAuth-контекста); целевые тесты зелёные; smoke серверных запросов на seed-данных отдаёт товары/заявки. Оставшиеся ошибки `tsc` — только в `app/**` и `components/**` (чинят Ф3–6).

---

### Task 1: `lib/owner/validation.ts` — формы

**Files:** Modify `src/lib/owner/validation.ts`; Test `tests/owner/validation.test.ts` (new)

Трансформации:
- **Удалить** `providerFormSchema`, тип `ProviderForm`, `phonesField` и импорт `normalizePhone` (его единственный потребитель).
- **`listingFormSchema`** — добавить поля:
  ```ts
  cityId: z.string().min(1, "Выберите город"),
  location: z.string().trim().max(120).optional().default(""),
  ```
- `RESERVED_SLUGS` — оставить (может понадобиться админке для слагов), обновить комментарий (провайдера в URL больше нет). Проверить мёртвость в Ф6.

- [ ] **Шаг 1: Тест (failing)** — `tests/owner/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { listingFormSchema } from "@/lib/owner/validation";

const base = { title: "Дрель Bosch", categoryId: "c1", cityId: "city1",
  depositType: "none" as const, quantity: 1, priceDay: 500 };

describe("listingFormSchema", () => {
  it("requires cityId", () => {
    const r = listingFormSchema.safeParse({ ...base, cityId: "" });
    expect(r.success).toBe(false);
  });
  it("accepts valid listing with city and optional location", () => {
    const r = listingFormSchema.safeParse({ ...base, location: "ул. Баумана" });
    expect(r.success).toBe(true);
  });
});
```
- [ ] **Шаг 2:** Run `pnpm test -- tests/owner/validation.test.ts` → FAIL (cityId ещё нет).
- [ ] **Шаг 3:** Применить трансформации к `validation.ts`.
- [ ] **Шаг 4:** Run тест → PASS.
- [ ] **Шаг 5:** Commit `feat(validation): listing form takes city, drop provider form`.

---

### Task 2: `server/catalog.ts` — каталог на город/владельца

**Files:** Modify `src/server/catalog.ts`

Трансформации:
- Убрать импорт `providers` и `export type Provider`.
- `getListingCountsByCategory`: убрать `innerJoin(providers)`, фильтр `eq(listings.cityId, cityId)` напрямую.
- `getListingsForCategories` и `searchListings`: `innerJoin(providers)` → `innerJoin(users, eq(users.id, listings.ownerUserId))`; фильтр `eq(listings.cityId, cityId)`; в select вместо `providerName/providerSlug` → `ownerName: users.name, ownerUsername: users.username`.
- Переименовать `interface ListingWithProvider` → `ListingWithOwner { listing; ownerName; ownerUsername }`.
- `getCategoryStats`: `providerCount` → `ownerCount: count(distinct ownerUserId)`; убрать join, фильтр `listings.cityId`.
- **Удалить** `getProvidersOfCity`.
- `getProviderListings(providerId)` → **`getActiveListingsByOwner(userId)`**: `where ownerUserId = userId AND status='active'`.
- `getListingBySlug(providerId, slug)` → **`getActiveListingById(id)`**: резолв карточки по id (из хвоста URL), `where id = id AND status='active'`.
- `resolveCitySegment`: убрать ветку `provider`; вернуть только `Category | null` (2-й сегмент = категория). Разбор «товар по id» — отдельной `getActiveListingById` (страница решает в Ф3).
- `getAllActiveListingPaths` (sitemap): join `categories`(on categoryId)+`cities`(on cityId); вернуть `{ citySlug, categorySlug, listingSlug, listingId, updatedAt }` под URL `/{city}/{cat}/{slug}-{id}`.

- [ ] Применить трансформации; проверить `pnpm exec tsc --noEmit 2>&1 | grep "server/catalog"` → без ошибок в этом файле.
- [ ] Commit `refactor(catalog): city on listing, owner instead of provider`.

---

### Task 3: `server/owner.ts` + `actions/owner.ts` — кабинет без барьера

**Files:** Modify `src/server/owner.ts`, `src/server/actions/owner.ts`

`owner.ts`:
- Удалить `getOwnerProvider`, `getProviderCity`, `getProviderStats`, `ListingStats` (мёртвый), import `providers`/`Provider`.
- `getProviderRequests(providerId)` → `getOwnerRequests(userId)`: `where bookingRequests.ownerUserId = userId`.
- `countNewRequests(providerId)` → `countNewRequests(userId)`: `where ownerUserId = userId`.
- `getOwnerListings(providerId)` → `getOwnerListings(userId)`: `where listings.ownerUserId = userId`.
- `getOwnerListing(providerId, id)` → `getOwnerListing(userId, id)`: `where ownerUserId AND id`.

`actions/owner.ts`:
- `requireOwner()` → `requireUser()`: возвращает `{ userId }` (сессия + не забанен); провайдер не нужен.
- **Удалить** `createProvider`, `updateProvider`.
- `uniqueListingSlug` — убрать (slug больше не уникален): в create просто `slug = slugify(title)`, при пустом — ошибка.
- `createListing`: брать `userId`; вставлять `ownerUserId: userId, cityId: form.cityId, location: form.location || null`; `slug = slugify(form.title)`.
- `updateListing/setListingStatus/setBlockedDates`: `where ownerUserId = userId`; в update листинга разрешить смену `cityId`/`location`.
- `transitionRequest`: `where ... req.ownerUserId !== userId`.
- Убрать импорты `providerFormSchema`, `RESERVED_SLUGS`, `providers`.

- [ ] Применить; `tsc` без ошибок в этих файлах.
- [ ] Commit `refactor(owner): listings owned by user, drop provider onboarding`.

---

### Task 4: `server/booking.ts` + `actions/booking.ts` — заявки

**Files:** Modify `src/server/booking.ts`, `src/server/actions/booking.ts`

`booking.ts` — `getCustomerRequests(userId)`:
- Убрать join `providers`; join `users`(on `listings.ownerUserId`), `cities`(on `listings.cityId`), `categories`(on `listings.categoryId`).
- Select: `listingTitle, listingSlug, listingId: listings.id, categorySlug: categories.slug, citySlug: cities.slug, ownerName: users.name, ownerUsername: users.username, ownerPhone: users.phone` (контакт после подтверждения = телефон продавца).

`actions/booking.ts`:
- `createBookingRequest`: строка `providerId: listing.providerId` → **`ownerUserId: listing.ownerUserId`**.
- Комментарий про `provider_status_idx` → `owner_status_idx`.

- [ ] Применить; `tsc` без ошибок в этих файлах.
- [ ] Commit `refactor(booking): requests denormalize owner user`.

---

### Task 5: `server/admin.ts` + `actions/admin.ts` — админ-запросы

**Files:** Modify `src/server/admin.ts`, `src/server/actions/admin.ts`

`admin.ts`:
- **Удалить** `adminListProviders`.
- `adminListListings`: join `users`(ownerUserId)+`cities`(cityId); `providerName/providerSlug` → `ownerName: users.name, ownerUsername: users.username`.
- `adminListRequests`: join `users`(on ownerUserId) как продавца; `providerName` → `ownerName`.
- `adminListCities`: `providerCount` → `listingCount` (count listings where cityId).
- `adminListUsers`: добавить в select `isVerified` (уже в `users`, попадёт через `user`).
- `adminCounts`: убрать `providers`; оставить `listings/requests/users`.
- Убрать import `providers`.

`actions/admin.ts`:
- `adminSetProviderVerified(providerId, isVerified)` → **`adminSetUserVerified(userId, isVerified)`**: `update users set isVerified, verifiedAt = isVerified ? new Date() : null`; `revalidatePath("/admin/users")`.
- Убрать `providers` из импорта.
- Остальное (города/категории/бан) — не трогать.

- [ ] Применить; `tsc` без ошибок в этих файлах.
- [ ] Commit `refactor(admin): drop providers, verify moves to users`.

---

### Task 6: Smoke + фиксация фазы

- [ ] **grep-чистота:** `grep -rn "\bproviders\b" src/server src/lib/owner` → пусто.
- [ ] **Целевые тесты:** `pnpm test -- tests/db tests/auth tests/owner tests/catalog tests/booking` → PASS.
- [ ] **Smoke серверных запросов** на seed-данных (быстрый tsx-скрипт или dev): `getListingsForCategories(cityKazan, [powerTools])` отдаёт товары с `ownerName/ownerUsername`; `getActiveListingsByOwner(owner1)` отдаёт его товары.
- [ ] **Отметить:** оставшиеся `tsc`-ошибки только в `app/**`/`components/**` (Ф3–6).

---

## Что дальше

**Фаза 3** — публичный каталог + резолвинг URL: страницы `[city]/[seg]/[sub]` под новый резолвер (категория/подкатегория/товар по id-хвосту), `ListingCard` с подписью продавца, 301-канонизация. Использует `getActiveListingById`, `ListingWithOwner`, `getAllActiveListingPaths` из этой фазы.
