# C2C-модель — Фаза 3: публичный каталог + резолвинг URL

> **Для агентных воркеров:** ОБЯЗАТЕЛЬНЫЙ САБ-СКИЛЛ: superpowers:executing-plans. Рефакторинг существующих файлов — трансформации + один новый helper с TDD.

**Goal:** Перевести публичный каталог на новую модель: URL товара `/{city}/{categorySlug}/{slug}-{id}`, продавец-юзер вместо витрины провайдера, резолвинг третьего сегмента (подкатегория | товар по id-хвосту).

**Architecture:** Слаг категории уникален глобально → карточка товара всегда 3 сегмента; последний сегмент = `{listingSlug}-{listingId}`, где id — ULID (26 симв.). Витрина провайдера удаляется целиком, продавец — подпись со ссылкой на `/u/{username}` (страница профиля — Фаза 4).

**Tech Stack:** Next 15 App Router, Drizzle, Vitest.

Спек: [../specs/2026-07-20-c2c-model-redesign-design.md](../specs/2026-07-20-c2c-model-redesign-design.md) · Roadmap: [2026-07-21-c2c-model-roadmap.md](./2026-07-21-c2c-model-roadmap.md)

---

## Область фазы

**Входит:** `lib/catalog/listing-path.ts` (new), `lib/catalog/format.ts`, `lib/jsonld.ts`, `server/catalog.ts` (доработка), `components/catalog/ListingCard.tsx`, `components/catalog/CategoryListing.tsx`, `components/booking/OwnerCard.tsx`, `components/booking/BookingWidget.tsx`, `app/(public)/[city]/page.tsx`, `app/(public)/[city]/[seg]/page.tsx`, `app/(public)/[city]/[seg]/[sub]/page.tsx`.

**НЕ входит:** `/u/[username]` страница и `sitemap.ts` — Фаза 4; кабинет/админ — Ф5/Ф6.

**Критерий готовности:** ошибки tsc в этих файлах уходят; dev-прогон: список категории, карточка товара по `/{city}/{cat}/{slug}-{id}`, 301-канонизация, поиск — работают; тесты (в т.ч. новый парсер) зелёные.

---

### Task 1: helper пути товара + доработка catalog

**Files:** Create `src/lib/catalog/listing-path.ts`, `tests/catalog/listing-path.test.ts`; Modify `src/server/catalog.ts`

**`listing-path.ts`** (новый):
```ts
// URL карточки товара: /{city}/{categorySlug}/{listingSlug}-{listingId}.
// id — ULID (26 символов Crockford base32); отделяем его от хвоста slug.

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export function extractListingId(lastSegment: string): { slug: string; id: string } | null {
  const idx = lastSegment.lastIndexOf("-");
  if (idx <= 0) return null;
  const id = lastSegment.slice(idx + 1);
  const slug = lastSegment.slice(0, idx);
  if (!ULID_RE.test(id)) return null;
  return { slug, id };
}

export function listingPath(
  citySlug: string, categorySlug: string, listingSlug: string, listingId: string,
): string {
  return `/${citySlug}/${categorySlug}/${listingSlug}-${listingId}`;
}
```

**catalog.ts** доработки:
- `ListingWithOwner` — добавить `categorySlug: string` (нужен для href карточки).
- `getListingsForCategories` и `searchListings` — добавить `innerJoin(categories, eq(categories.id, listings.categoryId))` и в select `categorySlug: categories.slug`.
- Добавить **`getSellerById(userId)`**: публичные поля продавца для страницы товара/OwnerCard — `{ id, name, username, image, bio, isVerified, createdAt, phone }`.

- [ ] **Тест (TDD):** `tests/catalog/listing-path.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { extractListingId, listingPath } from "@/lib/catalog/listing-path";

describe("extractListingId", () => {
  it("splits slug and ULID tail", () => {
    expect(extractListingId("drel-bosch-01ARZ3NDEKTSV4RRFFQ69G5FAV"))
      .toEqual({ slug: "drel-bosch", id: "01ARZ3NDEKTSV4RRFFQ69G5FAV" });
  });
  it("returns null for a plain subcategory slug", () => {
    expect(extractListingId("dreli")).toBeNull();
  });
  it("returns null when tail is not a ULID", () => {
    expect(extractListingId("kovrik-2")).toBeNull();
  });
});

describe("listingPath", () => {
  it("builds the canonical path", () => {
    expect(listingPath("kazan", "dreli", "drel-bosch", "01ARZ3NDEKTSV4RRFFQ69G5FAV"))
      .toBe("/kazan/dreli/drel-bosch-01ARZ3NDEKTSV4RRFFQ69G5FAV");
  });
});
```
- [ ] Прогнать → FAIL → создать `listing-path.ts` → PASS.
- [ ] Доработать catalog.ts; `tsc` по catalog.ts без ошибок.
- [ ] Commit `feat(catalog): listing path helper + owner/category on cards`.

---

### Task 2: format + jsonld

**Files:** Modify `src/lib/catalog/format.ts`, `src/lib/jsonld.ts`

- `format.ts`: `providersCountLabel` → **`ownersCountLabel`** (текст «N продавцов»/склонения).
- `jsonld.ts`: `buildProductJsonLd` — `providerName` → **`sellerName`** (seller `@type: "Person"`); **удалить** `buildLocalBusinessJsonLd` (витрина провайдера уходит).

- [ ] Применить; проверить потребителей на этот rename ниже. Commit `refactor(seo): product seller, drop local-business jsonld`.

---

### Task 3: карточки (ListingCard + CategoryListing)

**Files:** Modify `src/components/catalog/ListingCard.tsx`, `src/components/catalog/CategoryListing.tsx`

- `ListingCard`: тип `ListingWithProvider` → `ListingWithOwner`; деструктуризация `ownerName, ownerUsername, categorySlug`; href товара = `listingPath(citySlug, categorySlug, listing.slug, listing.id)`; подпись продавца — ссылка на `/u/${ownerUsername}` c `ownerName` (fallback «Продавец» если null).
- `CategoryListing`: `stats.providerCount` → `stats.ownerCount`; `providersCountLabel` → `ownersCountLabel`.

- [ ] Применить; tsc по этим файлам без ошибок. Commit `refactor(catalog): cards link to listing id + seller profile`.

---

### Task 4: продавец на странице товара (OwnerCard + BookingWidget)

**Files:** Modify `src/components/booking/OwnerCard.tsx`, `src/components/booking/BookingWidget.tsx`

- `OwnerCard`: пропсы `{ name, href, isVerified, location }` (убрать `address`/`hoursText`); href = `/u/{username}`; `location` (район/ориентир) вместо адреса; иконку `Store`→`User`.
- `BookingWidget`: пропсы `providerName/providerHref/providerAddress` → `sellerName/sellerHref/sellerLocation` (строки 39-41, 180-183). `nextAuthProviders` — **не трогать** (OAuth).

- [ ] Применить; tsc по этим файлам без ошибок. Commit `refactor(booking): listing page shows seller, not provider`.

---

### Task 5: витрина города + сегмент категории

**Files:** Modify `src/app/(public)/[city]/page.tsx`, `src/app/(public)/[city]/[seg]/page.tsx`

- `[city]/page.tsx`: убрать `getProvidersOfCity` и секцию «Прокаты города» (её нет в новой модели). Оставить категории.
- `[city]/[seg]/page.tsx`: `resolve` использует `getCategoryBySlug` (только категория); **удалить** `ProviderPage` и его metadata-ветку; `generateMetadata` — только категория. Подкатегория по прямому слагу → 301 на `/{city}/{root}/{sub}` (как сейчас).

- [ ] Применить; tsc по этим файлам без ошибок. Commit `refactor(catalog): city hub + segment resolve to category only`.

---

### Task 6: третий сегмент — подкатегория | товар по id

**Files:** Modify `src/app/(public)/[city]/[seg]/[sub]/page.tsx`

- `resolve(citySlug, seg, sub)`:
  1. `extractListingId(sub)` → если есть `{ id }` и `getActiveListingById(id)` найден → **товар**. Каноничность: `seg` должен = слаг категории товара и `sub` slug-часть = `listing.slug`; иначе `permanentRedirect(listingPath(...))`. Продавец: `getSellerById(listing.ownerUserId)`.
  2. иначе — как раньше: `seg`=root категория, `sub`=подкатегория (список), 404 если 0 позиций.
- `ListingPage`: убрать `provider`; продавец из `getSellerById`; `OwnerCard`/`BookingWidget` — новые пропсы (`/u/{username}`, `location`); `listingUrl`/`pathname` = `listingPath(...)`; `buildProductJsonLd` c `sellerName`.
- Тип `Resolved` листинг-ветки: `{ kind:"listing"; city; category; listing; seller }`.

- [ ] Применить; tsc по этому файлу без ошибок. Commit `refactor(catalog): listing page resolves by id, canonical redirect`.

---

### Task 7: smoke + gate

- [ ] Тесты: `pnpm test -- tests/catalog tests/db tests/owner tests/booking` → PASS.
- [ ] Dev-прогон (`pnpm dev`): `/kazan` (категории), `/kazan/elektroinstrument` (список + карточки), клик по карточке → `/kazan/.../{slug}-{id}` (страница товара, продавец, календарь), `/search?q=…`. Проверить 301 при кривом слаге в URL товара.
- [ ] tsc: ошибки остаются только в `app/(app)/**` (кабинет/админ) + `sitemap.ts` (Ф4–6).
- [ ] Отметить готовность Ф3.

---

## Что дальше

**Фаза 4** — профиль продавца `/u/[username]` (использует `getActiveListingsByOwner`, `getSellerById`) + `sitemap.ts` под новый `getAllActiveListingPaths` + `listingPath`.
