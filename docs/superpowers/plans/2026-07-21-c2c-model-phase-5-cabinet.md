# C2C-модель — Фаза 5: кабинет

> **Для агентных воркеров:** ОБЯЗАТЕЛЬНЫЙ САБ-СКИЛЛ: superpowers:executing-plans.

**Goal:** Снять барьер «создай прокат» — любой залогиненный юзер размещает товары и получает заявки. Форма товара берёт город/локацию; настройки проката удаляются, профиль/настройки — один экран.

**Architecture:** Навигация кабинета больше не зависит от `hasProvider` — owner-табы показываются всем. Гейты layout/страниц: только `requireAuthState`. Онбординг провайдера (`/cabinet/new`, `ProviderForm`) и `/cabinet/settings` удаляются. Все `provider.id` → `userId`.

Спек: [../specs/2026-07-20-c2c-model-redesign-design.md](../specs/2026-07-20-c2c-model-redesign-design.md) · Ветка: `model_redesign_phase2`.

---

## Область: `components/account/accountNav.ts`, `app/(app)/cabinet/**`, `app/(app)/(me)/**`, `components/cabinet/{ListingForm,ProviderForm}.tsx`, `components/me/ProfileForm.tsx`, `server/actions/profile.ts`. Удаляются: `cabinet/new`, `cabinet/settings`, `ProviderForm.tsx`.
Критерий: `app/(app)/cabinet` + `(me)` — 0 ошибок tsc; dev-прогон размещения/заявок; тесты зелёные (accountNav-тест обновлён).

---

### Task 1: навигация + layouts + вход (снять провайдер-гейт)

**Files:** Modify `components/account/accountNav.ts`, `app/(app)/cabinet/layout.tsx`, `app/(app)/(me)/layout.tsx`, `app/(app)/cabinet/page.tsx`; Test `tests/components/account/accountNav.test.ts`

- `buildAccountNav({ newRequestsCount })` — убрать `hasProvider`; всегда: Мои заявки, Профиль → separator → Заявки на мои вещи (badge), Мои объявления, Календарь. Убрать «Настройки проката».
- `cabinet/layout` + `(me)/layout`: убрать `getOwnerProvider`; `countNewRequests(session.user.id)`; всегда `AccountShell`.
- `cabinet/page`: `redirect("/cabinet/listings")`.
- Обновить accountNav-тест под новую сигнатуру.

- [ ] Тест обновить → применить → tsc чист в этих файлах. Commit `refactor(cabinet): unified nav, no provider gate`.

---

### Task 2: удалить онбординг и настройки проката

**Files:** Delete `app/(app)/cabinet/new/`, `app/(app)/cabinet/settings/`, `components/cabinet/ProviderForm.tsx`

- [ ] `git rm` три пути. Commit `refactor(cabinet): drop provider onboarding & settings`.

---

### Task 3: форма товара + город/локация

**Files:** Modify `components/cabinet/ListingForm.tsx`, `app/(app)/cabinet/listings/new/page.tsx`, `app/(app)/cabinet/listings/[id]/page.tsx`

- `ListingFormValues` +`cityId: string` +`location: string`. Проп `cities: Array<{id;name}>`. Поля: select города (после названия), input «Район/ориентир (необязательно)».
- `listings/new`: убрать `getOwnerProvider`-гейт; `getActiveCities()`; initial +`cityId:""`,+`location:""`.
- `listings/[id]`: `getOwnerListing(session.user.id, id)`; `getActiveCities()`; initial +`cityId: listing.cityId`,+`location: listing.location ?? ""`.

- [ ] Применить; tsc чист. Commit `feat(cabinet): listing form takes city and location`.

---

### Task 4: список товаров + календарь на userId

**Files:** Modify `app/(app)/cabinet/listings/page.tsx`, `app/(app)/cabinet/calendar/page.tsx`

- `listings/page`: `getOwnerListings(session.user.id)`; убрать `getProviderCity`; `STATUS_LABEL` без `on_moderation`; ссылка «посмотреть в каталоге» через `listingPath` — построить map `cityId→slug` (getActiveCities) и `categoryId→slug` (getAllCategories).
- `calendar/page`: `getOwnerListings(session.user.id)` (проверить сигнатуру при чтении).

- [ ] Применить; tsc чист. Commit `refactor(cabinet): listings & calendar by user`.

---

### Task 5: заявки владельца и покупателя

**Files:** Modify `app/(app)/cabinet/requests/page.tsx`, `app/(app)/(me)/requests/page.tsx`

- `cabinet/requests`: `getOwnerRequests(session.user.id)`; поля строки как раньше (`customerName/customerUsername/listingTitle`), `ownerComment` вместо `providerComment` в RequestActions.
- `(me)/requests`: возврат `getCustomerRequests` теперь `ownerName/ownerUsername/ownerPhone/listingId/categorySlug/citySlug/ownerComment`; ссылку на товар строить `listingPath(citySlug, categorySlug, listingSlug, listingId)`; контакт после подтверждения — `ownerPhone`.

- [ ] Применить (прочитать оба + RequestActions перед правкой); tsc чист. Commit `refactor(cabinet): requests by owner user`.

---

### Task 6: единый профиль/настройки

**Files:** Modify `app/(app)/(me)/profile/page.tsx`, `components/me/ProfileForm.tsx`, `server/actions/profile.ts`

- Профиль — единственный экран настроек (settings проката удалён в Task 2). Добавить редактирование `bio` (публичный профиль его показывает): `ProfileForm` +поле «О себе», `updateProfile` схема +`bio` (max 500), запись в `users.bio`. Ссылка «Открыть мой профиль» → `/u/{username}`.

- [ ] Применить (прочитать ProfileForm перед правкой); tsc чист. Commit `feat(profile): edit bio, link to public profile`.

---

### Task 7: smoke + gate

- [ ] Тесты: `pnpm test` → PASS.
- [ ] Dev: залогиниться (dev-login), `/cabinet/listings` (без барьера), разместить товар (город в форме), `/cabinet/requests`, `/profile`.
- [ ] tsc: ошибки остаются только в `app/(app)/admin/**` (Ф6).

---

## Что дальше
**Фаза 6** — админка: убрать раздел providers, кнопка verify в `/admin/users`, показывать владельца; финальный зелёный `tsc` + все тесты.
