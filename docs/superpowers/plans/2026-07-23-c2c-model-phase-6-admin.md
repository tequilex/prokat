# C2C-модель — Фаза 6: админка + финал

> **Для агентных воркеров:** ОБЯЗАТЕЛЬНЫЙ САБ-СКИЛЛ: superpowers:executing-plans.

**Goal:** Убрать раздел «Прокаты» из админки, показывать владельца-юзера вместо провайдера, кнопка «Проверить» в `/admin/users`. Финал: зелёный `tsc` по всему проекту + e2e.

**Architecture:** Раздел providers удаляется; списки/заявки берут владельца из `ownerName/ownerUsername`; верификация — `adminSetUserVerified` на странице пользователей.

Спек: [../specs/2026-07-20-c2c-model-redesign-design.md](../specs/2026-07-20-c2c-model-redesign-design.md) · Ветка: `model_redesign_phase2`.

---

## Область: `server/admin.ts` (+categorySlug), `admin/layout.tsx`, `admin/page.tsx`, `admin/listings|cities|requests|users/page.tsx`. Удаляется `admin/providers/`.
Критерий: **весь `tsc` зелёный (0 ошибок)**, все тесты зелёные, e2e-прогон ключевых флоу.

---

### Task 1: каркас админки — убрать раздел providers

**Files:** Modify `server/admin.ts` (adminListListings +`categorySlug` через join categories), `admin/layout.tsx` (убрать таб «Прокаты»), `admin/page.tsx` (`redirect("/admin/users")`); Delete `admin/providers/`.

- [ ] Применить + `git rm admin/providers`. Commit `refactor(admin): drop providers section`.

---

### Task 2: списки на владельца-юзера

**Files:** Modify `admin/listings/page.tsx`, `admin/cities/page.tsx`, `admin/requests/page.tsx`

- `listings`: `providerName/providerSlug` → `ownerName/ownerUsername`; ссылка карточки — `listingPath(citySlug, categorySlug, listing.slug, listing.id)`; `STATUS_LABEL` без `on_moderation`.
- `cities`: `providerCount` → `listingCount`; `providersCountLabel` → `listingsCountLabel`.
- `requests`: `providerName` → `ownerName`.

- [ ] Применить; tsc чист в этих файлах. Commit `refactor(admin): show owner user, not provider`.

---

### Task 3: верификация пользователя в /admin/users

**Files:** Modify `admin/users/page.tsx`

- import `adminSetUserVerified`.
- Значок «Проверен» при `user.isVerified`; показать `listingCount` (объявлений).
- `ActionButton` «Проверить»/«Снять проверку» → `adminSetUserVerified.bind(null, user.id, !user.isVerified)`.

- [ ] Применить; tsc чист. Commit `feat(admin): verify users (badge + toggle)`.

---

### Task 4: финал — зелёный проект + e2e

- [ ] **tsc:** `pnpm exec tsc --noEmit` → 0 ошибок во всём проекте.
- [ ] **Тесты:** `pnpm test` → PASS.
- [ ] **e2e (dev):** dev-login → `/cabinet/listings` без барьера → разместить товар с городом → карточка в каталоге по `/{city}/{cat}/{slug}-{id}` → `/admin/users` verify.
- [ ] Обновить память проекта: C2C-редизайн завершён.

---

## После фазы
Ветки `model_redesign_phase1` (Ф1–3) и `model_redesign_phase2` (Ф4–6) готовы к ревью/мержу в master (по решению пользователя — finishing-a-development-branch).
