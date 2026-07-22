# C2C-модель — Фаза 4: профиль продавца + sitemap

> **Для агентных воркеров:** ОБЯЗАТЕЛЬНЫЙ САБ-СКИЛЛ: superpowers:executing-plans.

**Goal:** Публичный профиль продавца `/u/{username}` (имя, аватар, «на сайте с», значок «Проверен», сетка товаров) + `sitemap.ts` под новый URL товара.

**Architecture:** Профиль резолвится по `username` (`getSellerByUsername`), товары — `getActiveListingCardsByOwner` (ListingWithOwner, переиспользует `ListingCard`). Sitemap строит URL товара через `listingPath`, витрины прокатов убирает.

Спек: [../specs/2026-07-20-c2c-model-redesign-design.md](../specs/2026-07-20-c2c-model-redesign-design.md) · Roadmap: [2026-07-21-c2c-model-roadmap.md](./2026-07-21-c2c-model-roadmap.md). Ветка: `model_redesign_phase2`.

---

## Область: `server/catalog.ts` (+2 функции), `app/sitemap.ts`, `app/(public)/u/[username]/page.tsx` (new).
Критерий готовности: `/u/{username}` рендерит профиль + карточки; sitemap отдаёт новые URL; `app/(public)` и `sitemap.ts` — 0 ошибок tsc; тесты зелёные.

---

### Task 1: catalog — резолв продавца по нику + карточки продавца

**Files:** Modify `src/server/catalog.ts`

- `getSellerByUsername(username)` — как `getSellerById`, но `where users.username = username`.
- `getActiveListingCardsByOwner(userId): Promise<ListingWithOwner[]>` — активные товары продавца в форме карточки (join users + categories, как `getListingsForCategories`, но `where ownerUserId = userId`, сортировка `desc(createdAt)`).

- [ ] Применить; tsc по catalog.ts без ошибок. Commit `feat(catalog): resolve seller by username + owner cards`.

---

### Task 2: sitemap на новый URL товара

**Files:** Modify `src/app/sitemap.ts`

- import: убрать `getProvidersOfCity`, добавить `listingPath` из `@/lib/catalog/listing-path`.
- Удалить цикл `getProvidersOfCity` (витрины прокатов).
- Ссылка товара: `${base}${listingPath(l.citySlug, l.categorySlug, l.listingSlug, l.listingId)}`.

- [ ] Применить; tsc по sitemap.ts без ошибок. Commit `refactor(seo): sitemap uses listing id url, drops providers`.

---

### Task 3: страница профиля `/u/[username]`

**Files:** Create `src/app/(public)/u/[username]/page.tsx`

- `dynamic = "force-dynamic"`.
- `generateMetadata`: title «{name} — профиль на …», canonical `/u/{username}`.
- Страница: `getSellerByUsername(username)` → `notFound()` если нет. Параллельно `getActiveListingCardsByOwner(seller.id)`; занятость карточек — `getAvailabilityRows` + `buildAvailabilityByListing` (как в CategoryListing).
- Хедер профиля: аватар (`seller.image`, fallback иконка `User`), `seller.name ?? username`, `@username`, значок «Проверен» (`BadgeCheck` если `isVerified`), «на сайте с {createdAt в ru}», `bio`.
- Сетка `ListingCard` (по `citySlug` из `listing.cityId` — карточке нужен citySlug; берём его через город товара). ВНИМАНИЕ: `ListingCard` требует `citySlug` — товары продавца могут быть в разных городах, поэтому в `getActiveListingCardsByOwner` вернуть ещё `citySlug` (join cities) ИЛИ рендерить карточку с citySlug из отдельной map. Решение: добавить `citySlug` в `ListingWithOwner`? Нет — это ломает другие потребители. Вместо: в Task 1 функция возвращает `Array<ListingWithOwner & { citySlug: string }>`.
- Пустое состояние: «У продавца пока нет активных объявлений».

- [ ] Применить; tsc без ошибок. Commit `feat(profile): public seller profile at /u/[username]`.

---

### Task 4: smoke + gate

- [ ] Тесты: `pnpm test` → PASS.
- [ ] Dev: `/u/{username}` рендерит профиль + карточки; `/sitemap.xml` отдаёт новые URL.
- [ ] tsc: ошибки остаются только в `app/(app)/**` (кабинет/админ — Ф5/Ф6).

---

## Что дальше
**Фаза 5** — кабинет: снять барьер провайдера, форма товара +город/локация, единый профиль/настройки.
