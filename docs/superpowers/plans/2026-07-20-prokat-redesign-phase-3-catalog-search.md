# prokat Redesign — Phase 3: Catalog Search + Mobile Filters

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the header/hero search real — a city-scoped text search over listings that renders the same card/filters/pagination experience as category pages — and upgrade the mobile filter disclosure from a no-JS `<details>` to a proper bottom-sheet, with a light `ListingCard` visual polish. No changes to booking or domain rules.

**Architecture:** Add one pure parsing helper (`q` on top of existing `parseFilters`), one server query (`searchListings`, city-scoped `ILIKE` over title + description, reusing the existing `ListingFilters`/pagination shape), and one shared availability-map helper (removing duplication already present in `CategoryListing` and the provider page). The mobile filter UI becomes a small Radix-`Sheet` client wrapper (`FiltersSheet`) reused by both catalog and search. The `/search` page composes these with `ListingCard`. Search fields decided: **title + description**. City decided: **current/default city** via `?city=` (falls back to the first active city).

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, Drizzle (pg, `ilike`), Tailwind (tokens), Radix Sheet, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-19-prokat-redesign-design.md` (§ Catalog / § Сквозные требования). Builds on Phase 1 (shell, `/search` placeholder) and Phase 2 (hero search → `/search?q=`).

---

## Design decisions locked for this phase

- **Search scope:** one city per search. The query carries `?city=<slug>`; if absent, resolve to the first active city (same "default city" rule as the homepage). The header/hero searches will pass the current city when known (hero already knows `defaultCity`; wiring the header's city into the query is a follow-up — for this phase the `/search` page resolves the city itself).
- **Search fields:** `ILIKE %q%` over `listings.title` and `listings.description`. Only `status = 'active'` listings, joined to providers of that city.
- **Filters/sort/pagination:** reuse the existing `ListingFilters` GET form and `parseFilters` (`price_min`, `price_max`, `sort`, `page`). `q` and `city` ride alongside in the query string.
- **Mobile filters:** replace the `<details>` disclosure inside `ListingFilters` with a `FiltersSheet` (Radix `Sheet`, side `bottom`). Desktop keeps the inline `aside`. The form itself stays a plain GET form.
- **No new "favorites"/heart, no map** — out of scope.

## File Structure

- `src/lib/catalog/filters.ts` — **modify.** Add `parseQuery(sp)` returning a trimmed `q` string (and keep `parseFilters` unchanged); or extend `CategorySearchParams`/`SearchParams` with `q`/`city`.
- `src/lib/catalog/availability.ts` — **modify.** Add `buildAvailabilityByListing(rows)` → `Map<listingId, AvailabilityMap>` (extracted from the duplicated loop).
- `src/server/catalog.ts` — **modify.** Add `searchListings(cityId, q, filters)` → `{ items: ListingWithProvider[]; total: number }`.
- `src/components/catalog/FiltersSheet.tsx` — **create.** Client Radix-Sheet wrapper: a «Фильтры» button (mobile) opening a bottom sheet that renders its `children` (the filter form).
- `src/components/catalog/ListingFilters.tsx` — **modify.** Swap the mobile `<details>` for `FiltersSheet`; keep the desktop inline form; add an optional `hidden?: Record<string,string>` prop rendered as hidden inputs so extra query params (`q`, `city`) survive a GET submit.
- `src/components/catalog/ListingCard.tsx` — **modify.** Visual polish (rounded-2xl, price emphasis, press feedback, hover) — no prop/behavior change.
- `src/components/catalog/SearchResults.tsx` — **create.** Server component: given `city`, `q`, `searchParams`, runs `searchListings` + availability and renders filters + card grid + pagination + empty state (mirrors `CategoryListing`, minus subcategory chips/stats).
- `src/app/(public)/search/page.tsx` — **modify (rewrite).** Resolve city + `q`, render heading + `SearchResults`.
- Tests under `tests/**` (see below).

**Test conventions:** component tests live under `tests/**`, import via `@/…` (vitest `include` is `tests/**`). DB-backed server queries are not unit-tested here (consistent with `getListingsForCategories`); they are verified via the dev run in Task 7. Pure helpers are TDD'd.

Cross-cutting acceptance every task: 375px **and** desktop; **both** themes; no horizontal body scroll; tap targets ≥ 44px.

---

## Task 1: Parse the `q` (and `city`) search params

**Files:**
- Modify: `src/lib/catalog/filters.ts`
- Test: `tests/catalog/search-params.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseQuery } from "@/lib/catalog/filters";

describe("parseQuery", () => {
  it("trims the query", () => {
    expect(parseQuery({ q: "  дрель  " })).toBe("дрель");
  });
  it("returns empty string when absent or blank", () => {
    expect(parseQuery({})).toBe("");
    expect(parseQuery({ q: "   " })).toBe("");
  });
});
```

- [ ] **Step 2: Run → FAIL** — Run: `pnpm test -- tests/catalog/search-params.test.ts`.

- [ ] **Step 3: Implement** — extend `CategorySearchParams` with `q?: string; city?: string;` and add:

```ts
export function parseQuery(sp: { q?: string }): string {
  return (sp.q ?? "").trim();
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add src/lib/catalog/filters.ts tests/catalog/search-params.test.ts && git commit -m "feat(catalog): parse search query param"`

---

## Task 2: Shared availability-map helper

**Files:**
- Modify: `src/lib/catalog/availability.ts`
- Test: `tests/catalog/availability-by-listing.test.ts`

Extract the repeated "rows → Map<listingId, AvailabilityMap>" loop (currently duplicated in `CategoryListing` and the provider page).

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildAvailabilityByListing } from "@/lib/catalog/availability";

describe("buildAvailabilityByListing", () => {
  it("groups rows by listing and date", () => {
    const map = buildAvailabilityByListing([
      { listingId: "a", date: "2026-07-20", bookedQty: 1, blockedQty: 0 },
      { listingId: "a", date: "2026-07-21", bookedQty: 0, blockedQty: 2 },
      { listingId: "b", date: "2026-07-20", bookedQty: 3, blockedQty: 0 },
    ]);
    expect(map.get("a")!.get("2026-07-21")).toEqual({ bookedQty: 0, blockedQty: 2 });
    expect(map.get("b")!.size).toBe(1);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** `buildAvailabilityByListing(rows: { listingId: string; date: string; bookedQty: number; blockedQty: number }[]): Map<string, AvailabilityMap>` with the same loop body.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Refactor callers** — replace the inline loops in `CategoryListing.tsx` and `[city]/[seg]/page.tsx` (ProviderPage) with the helper. Run `pnpm test && pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "refactor(catalog): shared availability-by-listing helper"`

---

## Task 3: searchListings server query

**Files:**
- Modify: `src/server/catalog.ts`
- Verify: dev run (Task 7)

City-scoped `ILIKE` over title + description, reusing the `ListingFilters` filter/sort/pagination shape from `getListingsForCategories`.

- [ ] **Step 1: Implement** `searchListings(cityId: string, q: string, filters: ListingFilters = {})`:
  - If `q` is empty → return `{ items: [], total: 0 }` (no query = no results; the page shows a prompt).
  - `conds`: `eq(providers.cityId, cityId)`, `eq(listings.status, "active")`, and `or(ilike(listings.title, \`%${q}%\`), ilike(listings.description, \`%${q}%\`))`. Reuse the price/sort/pagination logic from `getListingsForCategories` verbatim, including the stable-sort tiebreaker `.orderBy(order, asc(listings.id))` (the `limit`, `offset`, and the separate `count(*)` query too). Import `ilike`, `or` from `drizzle-orm`.
  - Return `{ items, total }` in the same `ListingWithProvider` shape (select `{ listing: listings, providerName: providers.name, providerSlug: providers.slug }`).
- [ ] **Step 2: Typecheck** — `pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add src/server/catalog.ts && git commit -m "feat(catalog): city-scoped listing text search"`

---

## Task 4: FiltersSheet (mobile bottom-sheet)

**Files:**
- Create: `src/components/catalog/FiltersSheet.tsx`
- Test: `tests/components/catalog/FiltersSheet.test.tsx`

Client wrapper using the existing `Sheet` primitives (`@/components/ui/sheet`). Renders a «Фильтры» trigger button (visible on mobile only where used) and a `SheetContent side="bottom"` containing `children`.

- [ ] **Step 1: Failing test** — render `<FiltersSheet><div>form-here</div></FiltersSheet>`; assert a button named «Фильтры» is present. (Radix Sheet content is lazy; asserting the trigger is enough.)

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FiltersSheet } from "@/components/catalog/FiltersSheet";

describe("FiltersSheet", () => {
  it("shows a Фильтры trigger", () => {
    render(<FiltersSheet><div>form</div></FiltersSheet>);
    expect(screen.getByRole("button", { name: /Фильтры/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `"use client"`; `Sheet` + `SheetTrigger` (a `Button variant="outline"` with a `SlidersHorizontal` icon + «Фильтры») + `SheetContent side="bottom"` with a `SheetTitle` (sr-only «Фильтры») wrapping `{children}` in a scrollable container (`max-h-[80vh] overflow-y-auto`, safe-area padding).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add src/components/catalog/FiltersSheet.tsx tests/components/catalog/FiltersSheet.test.tsx && git commit -m "feat(catalog): mobile filters bottom-sheet"`

---

## Task 5: Wire FiltersSheet into ListingFilters + card polish

**Files:**
- Modify: `src/components/catalog/ListingFilters.tsx`
- Modify: `src/components/catalog/ListingCard.tsx`

- [ ] **Step 1a — carry extra query params through the GET form (REQUIRED, prevents losing `q`/`city`):** A plain `method="GET" action="/search"` form rebuilds the query string from its named fields only and **discards** any existing query string in the action URL — so on `/search?q=дрель&city=…` a filter submit would drop `q` and `city` and reset the search. Fix: add an optional `hidden?: Record<string, string>` prop to `ListingFilters` (thread it into `FormInner`) and render, inside the `<form>`, `{Object.entries(hidden ?? {}).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}`. Category pages pass nothing (unchanged behaviour); `SearchResults` (Task 6) passes `{ q, city }`. Also update the «Сбросить» reset `<Link>` to keep `q` and `city` (reset filters only, not the search): `href` = `basePath` + a query string of just the non-empty `hidden` params.
- [ ] **Step 1b:** In `ListingFilters`, replace the mobile `<details>` block with `<div className="md:hidden"><FiltersSheet>…FormInner + subcategory chips…</FiltersSheet></div>`; keep the desktop inline block as `<div className="hidden md:block">…</div>`. The filter field names (`price_min`, `price_max`, `sort`) stay exactly the same; only the hidden pass-through and the wrapper change.
- [ ] **Step 2:** `ListingCard` polish — no prop change: `rounded-2xl` card + `border-border`; image `rounded-t-2xl`; add `transition-transform active:scale-[0.98] hover:border-primary` to the card; make the price line `text-base font-bold tracking-tight`; keep title `line-clamp-2`, provider link, `MiniCalendar`. Verify legibility in both themes.
- [ ] **Step 3:** Run `pnpm test && pnpm exec tsc --noEmit` → PASS (existing catalog page tests, if any, still green).
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(catalog): mobile filter sheet in ListingFilters + card polish"`

---

## Task 6: SearchResults component

**Files:**
- Create: `src/components/catalog/SearchResults.tsx`
- Test: `tests/components/catalog/SearchResults.test.tsx` (light — see note)

Server component mirroring `CategoryListing` for the search case: runs `searchListings` + availability (`buildAvailabilityByListing`), renders the filter form (via `ListingFilters` with empty `subcategories`) + card grid + pagination + empty/prompt states. `basePath` for the form/pagination is `/search`, and the query string must preserve `q` and `city`.

- [ ] **Step 1: Implement** — accept `{ city: City; q: string; searchParams: CategorySearchParams }`. Render `ListingFilters` with `basePath="/search"`, empty `subcategories={[]}`, `categoryBasePath="/search"` (any placeholder — with no subcategories the chips `nav` never renders), and `hidden={{ q, city: city.slug }}` so the GET form keeps `q`/`city`. Build `pageHref(p)` that keeps `q`, `city`, `price_min`, `price_max`, `sort`, `page`. Empty states: if `q === ""` → prompt «Введите запрос…»; else if no items → «Ничего не найдено по запросу «q»».
- [ ] **Step 2:** Because this is DB-backed, keep the unit test minimal or skip in favor of the dev run. If a test is added, mock `@/server/catalog` (`searchListings`, `getAvailabilityRows`) and assert the empty-prompt renders when `q=""`.
- [ ] **Step 3:** `pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(search): search results renderer"`

---

## Task 7: Real /search page + verification

**Files:**
- Modify: `src/app/(public)/search/page.tsx`

- [ ] **Step 1: Rewrite** the page: `export const dynamic = "force-dynamic"`; read `searchParams` (`q`, `city`, + filter params); resolve city via `getCityBySlug(city)` (when `?city=` present) or fall back to `(await getActiveCities())[0]` (note: `getActiveCities()` is async — must be awaited); if no city at all → simple message. Render `<Breadcrumbs>` (Главная › Поиск), an `<h1>` («Поиск: «q»» or «Поиск»), and `<SearchResults city={city} q={parseQuery(sp)} searchParams={sp} />`.
- [ ] **Step 2: Typecheck** — `pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 3: Dev verification** (DB up, `pnpm dev`):
  - `/search?q=<seeded-title-substring>` returns matching cards; `/search?q=zzz` shows "ничего не найдено"; `/search` (no q) shows the prompt.
  - Filters: on mobile the «Фильтры» button opens the bottom sheet; applying price/sort updates results and preserves `q` in the URL; pagination preserves `q`.
  - Cards link to `/[city]/[provider]/[listing]`.
  - 375px + desktop, light + dark: no horizontal scroll; sheet, cards, filters all legible; green accents AA.
- [ ] **Step 4:** Full suite green: `pnpm test && pnpm exec tsc --noEmit`.
- [ ] **Step 5: Commit** — `git add "src/app/(public)/search/page.tsx" && git commit -m "feat(search): real city-scoped catalog search page"`
- [ ] **Step 6 (DoD):** Phase 3 done when search works end-to-end, mobile filter sheet works, and everything passes in both themes and viewports.

---

## After Phase 3

Next: **Phase 4 — Listing page + booking** (sticky Airbnb-style booking card on desktop / bottom bar + date bottom-sheet on mobile around the existing `BookingWidget`/`AvailabilityCalendar`; contacts revealed after confirmation). Write that plan only once Phase 3 is DoD-green.
