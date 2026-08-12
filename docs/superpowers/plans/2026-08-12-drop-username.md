# Отказ от ника — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать `users.username` из системы: публичный профиль адресуется по ULID, человека представляет `name`, экран `/welcome` исчезает.

**Architecture:** Работа идёт снизу вверх — сначала безопасность (`safeCallback`), потом схема, потом серверный слой, потом экраны. Ник удаляется одним махом на уровне схемы: дальше компилятор сам показывает все места, где он использовался, — их 30+, и в этом смысле TypeScript выступает чек-листом.

**Tech Stack:** Next.js 15 (App Router, Server Actions), Drizzle ORM + Postgres 16, Auth.js v5 (database sessions), Vitest.

**Спека:** [`docs/superpowers/specs/2026-08-12-drop-username-design.md`](../specs/2026-08-12-drop-username-design.md) — при расхождении плана и спеки прав спек.

**Ветка:** `drop-username` (отведена от `dev`).

---

## Порядок и зависимости

| # | Задача | Зависит от |
|---|---|---|
| 1 | Ужесточить `safeCallback` | — |
| 2 | Схема: убрать `username` | — |
| 3 | Имя при регистрации почтой | 2 |
| 4 | Адрес возврата в письме | 1, 3 |
| 5 | Гард и `/welcome` | 2 |
| 6 | Профиль по id | 2 |
| 7 | Экраны и подписи | 2, 6 |
| 8 | Форма размещения: имя продавца | 2 |
| 9 | Документация и комментарии | 1–8 |

Задачи 1 и 2 независимы; после 2 проект какое-то время не компилируется — это ожидаемо, компилятор служит списком мест для задач 5–8.

---

## Task 1: Ужесточить `safeCallback`

Открытый редирект: `/\evil.com` проходит текущую проверку, а `new URL("/\\evil.com", "https://prokat.ru")` разворачивается в `https://evil.com/`. Дыра живёт во входе по паролю и в VK-коллбэке; задача 4 переносит адрес возврата в письмо, после чего её станет можно эксплуатировать рассылкой.

**Files:**
- Modify: `src/lib/auth/session.ts`
- Modify: `src/app/api/dev/login/route.ts:69`
- Test: `tests/auth/session.test.ts`

- [ ] **Step 1: Дописать падающие тесты**

```ts
describe("safeCallback: чужие домены", () => {
  it("отбивает обратный слэш — браузер трактует его как /", () => {
    expect(safeCallback("/\\evil.com")).toBe("/");
    expect(safeCallback("/\\\\evil.com")).toBe("/");
  });
  it("отбивает управляющие символы внутри пути", () => {
    expect(safeCallback("/\tevil.com")).toBe("/");
    expect(safeCallback("/\nevil.com")).toBe("/");
  });
  it("пропускает нормальный путь с query и якорем", () => {
    expect(safeCallback("/kazan/bicycles/trek-01j?from=1#top")).toBe("/kazan/bicycles/trek-01j?from=1#top");
  });
  it("выбрасывает всё, кроме пути, query и якоря", () => {
    expect(safeCallback("/a/../../b")).toBe("/b");
  });
});
```

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/session.test.ts`
Expected: FAIL на обратном слэше — он сейчас возвращается как есть.

- [ ] **Step 3: Переписать хелпер**

```ts
// Только собственный путь. Проверка идёт через резолв относительно служебного
// origin: `/\evil.com` и `/\tevil.com` выглядят относительными, но браузер (и
// URL) уводят по ним на чужой домен.
export function safeCallback(input: string | null | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return "/";
  // Обратный слэш и управляющие символы. Их ловим САМИ, до new URL:
  //   safeCallback("/\\evil.com")  → new URL уводит на https://evil.com/
  //   safeCallback("/\tevil.com")  → URL вырезает tab ещё до резолва
  // Дефис и пробел в класс НЕ добавлять: дефис есть в каждом слаге товара
  // и города, иначе любой возврат на карточку схлопнется в "/".
  if (/[\\\u0000-\u001F\u007F]/.test(input)) return "/";
  try {
    const base = "http://callback.invalid";
    const url = new URL(input, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/session.test.ts`
Expected: PASS, включая старые кейсы (`//evil.com`, `https://evil.com` → `/`).

- [ ] **Step 5: Перевести dev-вход на общий хелпер**

В `src/app/api/dev/login/route.ts` заменить инлайн-проверку

```ts
const target = cb && cb.startsWith("/") && !cb.startsWith("//") ? cb : "/";
```

на `const target = safeCallback(cb);` с импортом из `@/lib/auth/session`. Роут отвечает 404 в проде, но вторая копия правила — это способ вернуть дыру.

- [ ] **Step 6: Коммит**

```bash
git add src/lib/auth/session.ts src/app/api/dev/login/route.ts tests/auth/session.test.ts
git commit -m "fix(security): reject backslash paths in callback urls"
```

---

## Task 2: Схема — убрать `username`

**Files:**
- Modify: `drizzle/schema.ts`
- Create: `drizzle/migrations/****_drop_username.sql` (генерируется)
- Test: `tests/auth/schema.test.ts`

- [ ] **Step 1: Поправить тест схемы**

Убрать проверку колонки `username`, добавить обратную:

```ts
it("users has no username column", () => {
  expect((users as Record<string, unknown>).username).toBeUndefined();
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `pnpm vitest run tests/auth/schema.test.ts`
Expected: FAIL — колонка ещё на месте.

- [ ] **Step 3: Удалить колонку и индекс**

В `drizzle/schema.ts` убрать строку `username: varchar("username", { length: 20 }).unique(),` и `usernameIdx` из блока индексов таблицы `users`.

- [ ] **Step 4: Прогнать тест**

Run: `pnpm vitest run tests/auth/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Сгенерировать и применить миграцию**

Run: `pnpm db:generate` затем `pnpm db:migrate`
Expected: `DROP INDEX`, `DROP CONSTRAINT "users_username_unique"` (колонка объявлена
через `.unique()`, поэтому ограничение снимается отдельной строкой) и
`ALTER TABLE "users" DROP COLUMN "username"` — и ничего сверх этого. Данные ников
теряются осознанно.

- [ ] **Step 6: Коммит**

Проект в этот момент не компилируется — так и задумано, дальше компилятор служит списком мест.

```bash
git add drizzle/ tests/auth/schema.test.ts
git commit -m "feat(db): drop the username column"
```

---

## Task 3: Имя при регистрации почтой

**Files:**
- Modify: `src/lib/auth/store.ts` (`createUser`), `tests/fixtures/auth-store.ts`
- Modify: `src/lib/auth/flows.ts` (`registerWithPassword`)
- Modify: `src/server/actions/auth-email.ts` (`register`)
- Modify: `src/components/auth/EmailAuthForm.tsx`
- Test: `tests/auth/register.test.ts`, `tests/components/email-auth-form.test.tsx`

- [ ] **Step 1: Написать падающие тесты логики**

```ts
it("сохраняет имя, введённое при регистрации", async () => {
  const fake = fakeAuthStore();
  const { deps: d } = deps(fake.store);
  await registerWithPassword(d, { email: "a@ya.ru", password: "normalnyi-parol", name: "  Марина  " });
  expect(fake.users[0].name).toBe("Марина");
});

it("отклоняет пустое имя", async () => {
  const fake = fakeAuthStore();
  const res = await registerWithPassword(deps(fake.store).deps, { email: "a@ya.ru", password: "normalnyi-parol", name: "   " });
  expect(res).toMatchObject({ ok: false, error: "invalid_name" });
  expect(fake.users).toHaveLength(0);
});

it("пишет имя и при перезаписи брошенной регистрации", async () => {
  // Ветка setPassword: иначе повторная регистрация оставит человека без имени.
  const fake = fakeAuthStore([{ email: "a@ya.ru", passwordHash: "old" }]);
  await registerWithPassword(deps(fake.store).deps, { email: "a@ya.ru", password: "novyi-parol-1", name: "Марина" });
  expect(fake.users[0].name).toBe("Марина");
});
```

Фикстура `fakeAuthStore` получает поле `name` в `AuthUser` и в `createUser`.

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/register.test.ts`
Expected: FAIL — `registerWithPassword` не знает про имя.

- [ ] **Step 3: Провести имя по цепочке**

- `AuthStore.createUser(email, passwordHash, name)`; для ветки перезаписи —
  `setPassword(userId, hash, name?)`, где третий аргумент **опционален**: сброс
  пароля (`resetPassword` в `flows.ts`) вызывает его с двумя и имя не трогает;
- `AuthUser` получает поле `name: string | null`;
- `registerWithPassword(deps, { email, password, name })`: `trim`, длина 1–100, иначе `{ ok: false, error: "invalid_name" }`; проверка идёт **после** стоп-листа и правил пароля, чтобы порядок сообщений не менялся;
- drizzle-реализация пишет `name` в тех же запросах.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/`
Expected: PASS.

- [ ] **Step 5: Поле в форме**

В `EmailAuthForm` добавить поле «Имя» — видно только в режиме `register`, `required`, `maxLength={100}`, `autoComplete="name"`, плейсхолдер «Как вас зовут». Тест: в режиме входа поля нет, в режиме регистрации есть и уезжает в `register`.

- [ ] **Step 6: Коммит**

```bash
git add src/lib/auth/ src/server/actions/auth-email.ts src/components/auth/EmailAuthForm.tsx tests/
git commit -m "feat(auth): ask for a name during email sign-up"
```

---

## Task 4: Адрес возврата в письме

**Files:**
- Modify: `src/lib/auth/flows.ts` (`verifyLink`, `registerWithPassword`, `resendVerification`)
- Modify: `src/server/actions/auth-email.ts` (`register`, `resendVerificationEmail`)
- Modify: `src/components/auth/EmailAuthForm.tsx`
- Modify: `src/app/api/auth/email/verify/route.ts`
- Test: `tests/auth/register.test.ts` (в `verify.test.ts` новых тестов не появится — см. ниже)

- [ ] **Step 1: Написать падающие тесты**

```ts
it("кладёт адрес возврата в ссылку письма", async () => {
  const { deps: d, sent } = deps(fake.store);
  await registerWithPassword({ ...d, callbackUrl: "/kazan/bicycles/trek-01j" }, { … });
  expect(sent[0].text).toContain("next=%2Fkazan%2Fbicycles%2Ftrek-01j");
});

it("подделанный адрес возврата не уезжает в письмо", async () => {
  await registerWithPassword({ ...d, callbackUrl: "/\\evil.com" }, { … });
  expect(sent[0].text).not.toContain("evil.com");
});
```

Роут `/api/auth/email/verify` тестами не покрываем: `tests/auth/verify.test.ts`
проверяет чистую функцию `confirmEmail` без Next-рантайма, и тащить туда
`NextRequest` ради одного редиректа не стоит. Дёшево проверяется другое — что
`verifyLink` кладёт безопасный `next` и выбрасывает подделанный. Сам редирект
уходит в ручную проверку.

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/auth/register.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

- `verifyLink(baseUrl, token, next)` добавляет `&next=` только если `safeCallback(next) !== "/"`;
- `registerWithPassword` и `resendVerification` берут `callbackUrl` из `FlowDeps`;
- `register` и `resendVerificationEmail` принимают его аргументом и кладут в `flowDeps()`;
- форма передаёт свой проп `callbackUrl` в оба вызова;
- роут `/api/auth/email/verify` после успешного `confirmEmail` редиректит на `safeCallback(next)`.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/auth/`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/auth/flows.ts src/server/actions/auth-email.ts src/components/auth/EmailAuthForm.tsx src/app/api/auth/email/verify/ tests/auth/
git commit -m "feat(auth): return to the original page after email confirmation"
```

---

## Task 5: Гард и `/welcome`

**Files:**
- Modify: `src/lib/auth/guard.ts`
- Modify: `src/app/(auth)/login/page.tsx:27`
- Delete: `src/app/(auth)/welcome/` целиком (`page.tsx`, `actions.ts`, `SubmitButton.tsx`), `src/lib/auth/username.ts`, `tests/auth/username.test.ts`
- Modify: `theme/content.ts`
- Test: `tests/auth/guard.test.ts` (новый)

- [ ] **Step 1: Написать падающий тест гарда**

Проверить, что `requireAuthState` возвращает сессию юзеру **без имени** и не редиректит; забаненного по-прежнему уводит на `/banned`.

- [ ] **Step 2: Убедиться, что падает**

Run: `pnpm vitest run tests/auth/guard.test.ts`
Expected: FAIL — гард редиректит на `/welcome`.

- [ ] **Step 3: Выкинуть проверку ника**

Из `guard.ts` убрать строку `if (!session.user.username) redirect("/welcome");`. В `login/page.tsx` заменить `redirect(session.user.username ? "/" : "/welcome")` на `redirect("/")`.

- [ ] **Step 4: Удалить экран и словарь**

Удалить каталог `src/app/(auth)/welcome/`, `src/lib/auth/username.ts` (вместе с `RESERVED_USERNAMES`) и `tests/auth/username.test.ts`. Из `theme/content.ts` убрать `auth.chooseUsername`, `auth.welcomeTitle`, `auth.welcomeHint`, `auth.welcomeSubmit`, `auth.errorFormat`, `auth.errorReserved`, `auth.errorTaken`.

`"welcome"` в `RESERVED_SLUGS` оставить — вреда нет, а адрес пусть остаётся занятым.

- [ ] **Step 5: Прогнать тесты**

Run: `pnpm vitest run tests/auth/`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "feat(auth): drop the mandatory username step"
```

---

## Task 6: Профиль по id

**Files:**
- Rename: `src/app/(public)/u/[username]/` → `src/app/(public)/u/[id]/`
- Modify: `src/server/catalog.ts` (`getSellerByUsername` удаляется, остаётся `getSellerById`)
- Modify: `src/app/(public)/[city]/[seg]/[sub]/page.tsx:171`
- Modify: `src/lib/indexnow.ts`, `tests/lib/indexnow.test.ts`
- Test: `tests/catalog/seller-profile.test.ts` (новый)

- [ ] **Step 1: Написать падающие тесты**

Резолв продавца по id возвращает публичные поля; по несуществующему id — `null`.

Живого Postgres в тестах нет. Единственный прецедент мока БД —
`tests/storage/upload-route.test.ts` (`vi.mock("@/lib/db", …)` с узкой заглушкой).
Если мок цепочки `select().from().where().limit()` окажется дороже пользы,
ограничиться проверкой того, что ссылка на продавца собирается из id, а сам
резолвер оставить на ручную проверку — это честнее теста, повторяющего реализацию.

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/catalog/`
Expected: FAIL.

- [ ] **Step 3: Переименовать роут и резолвер**

- каталог `[username]` → `[id]`, внутри `const { id } = await params`, `getSellerById(id)`, `notFound()` при `null`;
- **сразу после переименования выполнить `rm -rf .next/types`**: при `typedRoutes: true`
  там остаются типы удалённого роута, и `tsc` начинает выдавать `TS2307` на
  несуществующие пути. Ловушка описана в `CLAUDE.md` в разделе dev-заметок;
- `canonical` в `generateMetadata` меняется на `/u/{id}`; индексация остаётся включённой;
- `getSellerByUsername` удаляется целиком, `Seller` теряет поле `username`;
- на странице товара `sellerHref` становится `` `/u/${seller.id}` `` без тернарника.

- [ ] **Step 4: Вычистить мёртвый IndexNow**

Удалить `postUrlsForIndexNow` из `src/lib/indexnow.ts` и **только** блок `describe("postUrlsForIndexNow")` из `tests/lib/indexnow.test.ts`. Пять тестов `pingIndexNow` и сама функция остаются — они описаны в `docs/DEPLOY.md` как post-deploy шаг.

- [ ] **Step 5: Прогнать тесты**

Run: `pnpm vitest run tests/catalog/ tests/lib/indexnow.test.ts`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "feat(catalog): address seller profiles by id"
```

---

## Task 7: Экраны и подписи

Здесь компилятор ведёт за руку: `pnpm exec tsc --noEmit` перечисляет все места, где ник ещё торчит.

**Files:**
- Modify: `src/components/ui/Avatar.tsx`, `src/components/auth/UserMenu.tsx`, `src/components/account/AccountShell.tsx`, `src/components/booking/OwnerCard.tsx`, `src/components/catalog/ListingCard.tsx`
- Modify: `src/components/layout/Header.tsx`, `src/components/layout/MobileNav.tsx`, `src/components/layout/TabBar.tsx`, `src/app/(public)/page.tsx`
- Modify: `src/app/(app)/(me)/requests/page.tsx:56-57`, `src/app/(app)/(me)/profile/page.tsx:31-38`, `src/app/(app)/cabinet/page.tsx:115`, `src/app/(app)/cabinet/requests/page.tsx:40`, `src/app/(app)/admin/{users,listings}/page.tsx`
- Modify: `src/server/{catalog,booking,cabinet,owner,admin,me}.ts` — убрать `username` из select'ов
- Modify: `src/types/next-auth.d.ts`, `src/lib/auth/config.edge.ts`
- Modify: `scripts/seed.ts:144-158`, `src/app/api/dev/login/route.ts` — `TEST_USERS`, а также `.set({ username })` (~строка 50) и `.values({ username })` (~строка 57)
- Test: `tests/components/{account/AccountShell,booking/OwnerCard,layout/TabBar}.test.tsx`

`scripts/` тоже проверяется компилятором (`tsconfig.json` включает `**/*.ts`),
поэтому seed и dev-вход чистятся здесь же: иначе `tsc` в шаге 4 чистым быть не
может, и исполнитель застрянет на «Expected: чисто».

- [ ] **Step 1: Убрать ник из типов сессии**

Из `next-auth.d.ts` и `config.edge.ts` (`session.user.username = …`). После этого `tsc` покажет остальное.

- [ ] **Step 2: Пройти список компилятора**

Правила замены, единые для всех мест:

| Было | Стало |
|---|---|
| `name ?? '@' + username` | `name ?? "Продавец"` (в кабинете — `"человек"`, как сейчас) |
| `/u/${ownerUsername}` | `/u/${ownerUserId}` (id уже есть в строке заявки) |
| `<Avatar username={…} />` | проп убирается; буква и цвет берутся из `name` |
| `placeHref = username ? … : "/welcome"` | `placeHref = "/cabinet/listings/new"` |
| `@{user.username} · {user.email}` в профиле | `{user.email}`, ссылка на `/u/{user.id}` |
| колонка «ник» в `/admin/users` | колонка «почта» |
| `@{me.username}` второй строкой в `AccountShell` | строка убирается: почты в `CabinetIdentity` нет, тянуть её туда ради подписи не стоит |

- [ ] **Step 3: Меню пользователя**

`UserMenu` больше не принимает `username`: первая строка — имя, вторая — почта.
Почту он сейчас не получает — добавляется проп `email`, `Header` берёт его из
сессии (`session.user.email` есть в типах Auth.js по умолчанию). Шапка и таб-бар перестают показывать «Выбери ник» и рендерят меню любому залогиненному.

- [ ] **Step 4: Прогнать типы и тесты**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: чисто; правятся тесты `AccountShell`, `OwnerCard`, `TabBar`, где ник передавался пропом.

- [ ] **Step 5: Коммит**

```bash
git add src/ tests/
git commit -m "refactor(ui): show names instead of usernames"

# Seed и dev-вход правились здесь же, но к UI не относятся — отдельным коммитом.
git add scripts/seed.ts src/app/api/dev/login/route.ts
git commit -m "chore: drop usernames from seed and dev login"
```

---

## Task 8: Имя продавца в форме размещения

**Files:**
- Modify: `src/components/cabinet/ListingForm.tsx`
- Modify: `src/server/actions/owner.ts` (`createListing`)
- Test: `tests/owner/seller-name.test.ts` (новый)

- [ ] **Step 1: Написать падающие тесты**

```ts
it("сохраняет новое имя продавца вместе с товаром", …);
it("пустое значение не затирает существующее имя", …);
it("имя длиннее 100 символов отклоняется", …);
```

- [ ] **Step 2: Убедиться, что падают**

Run: `pnpm vitest run tests/owner/seller-name.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

- поле «Как вас увидят покупатели» рендерится **только при `mode === "create"`**, предзаполняется из сессии (`session.user.name`), необязательное, `maxLength={100}`;
- значение уезжает тем же вызовом `createListing(input)` отдельным ключом; `listingFormSchema` не трогаем — она про товар, лишний ключ zod отбрасывает;
- в `createListing` перед созданием товара: `trim`, пусто → ничего не делаем, иначе 1–100 символов и `update users set name = …`. Таблица `users` в этот файл сейчас не импортирована — добавить импорт;
- `revalidatePath` не нужен — страницы товара и профиля динамические.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm vitest run tests/owner/`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/components/cabinet/ListingForm.tsx src/server/actions/owner.ts tests/owner/
git commit -m "feat(cabinet): let sellers set their public name when publishing"
```

---

## Task 9: Документация и комментарии

Seed и dev-вход почищены в Task 7 — они ломали компиляцию и не могли ждать.

**Files:**
- Modify: `CLAUDE.md`, `docs/QA-email-auth.md`, `drizzle/schema.ts:101` и `src/app/api/auth/email/verify/route.ts:11` (комментарии)
- Test: прогон всей сюиты

- [ ] **Step 1: Поправить устаревшие комментарии**

`drizzle/schema.ts:101` перечисляет публичные адреса и упоминает `/u/{username}`;
шапка `verify/route.ts` обещает «Дальше /welcome». На компиляцию не влияет, но
после задачи оба врут.

- [ ] **Step 2: Обновить документацию**

- `CLAUDE.md`: из таблицы `users` уходит `username`; в URL-структуре `/u/{username}` → `/u/{id}`, строка про `/welcome` удаляется; в разделе «Ключевые флоу» описание онбординга меняется на «регистрация не требует ника».
- `docs/QA-email-auth.md`: два места с шагом «→ /welcome → выбор ника» переписать на возврат на исходную страницу.

- [ ] **Step 3: Прогнать всё**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: зелено. Затем остановить dev-сервер и выполнить `pnpm build` — каталог `.next` общий, при живом dev-сервере сборка ломает и его, и себя.

- [ ] **Step 4: Пересоздать dev-базу**

```bash
docker compose exec db psql -U app -d app -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;"
pnpm db:migrate && pnpm db:seed
```

- [ ] **Step 5: Коммит**

```bash
git add -A
git commit -m "docs: drop usernames from project docs"
```

---

## Ручная проверка после всего плана

Из спеки, раздел «Ручная проверка» — семь пунктов. Ключевые: регистрация из модалки на карточке товара возвращает на тот же товар с выбранными датами; вход через Яндекс не показывает экрана выбора ника; кабинет, профиль и «Мои заявки» открываются у юзера без имени; поле имени в форме размещения меняет подпись в блоке продавца.
