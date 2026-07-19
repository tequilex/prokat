# prokat Redesign — Phase 2: Homepage «максимальный герой»

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal placeholder homepage with the agreed "максимальный герой" marketplace landing — a promise headline, a large hero search, a category tile grid (icon + count), a «Как это работает» block, and a dark «Сдавай и зарабатывай» band — that looks good and reads well even when there are few or zero listings, in both light and dark themes and on mobile.

**Architecture:** Compose the homepage from small, focused presentational components under `src/components/home/`, fed by the existing catalog server functions (`getActiveCities`, `getAllCategories`, `getListingCountsByCategory`, `rollupToRoots`). Category icons map off the stable `Category.vertical` field (not slug). All copy lives in `theme/content.ts` under a new `home` section. The page (`src/app/(public)/page.tsx`) stays an RSC that fetches data and lays out the sections; interactivity is limited to the hero search (client).

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, Tailwind (design tokens), lucide-react, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-19-prokat-redesign-design.md` (§ Главная, § Сквозные требования). Builds on Phase 1 (green tokens, marketplace header, `/search`).

---

## Design decisions locked for this phase

- **Category tiles need a city context** (routes are `/[city]/[seg]`). The homepage resolves a **default city** = the single active city if there is exactly one, otherwise the first active city (list order). Tiles link into that city; switching cities is done via the header `CitySelector`. This keeps Phase 2 simple; a dedicated city-picker landing is out of scope.
- **Category counts** show only when a default city exists (they are per-city). Roots come from `rollupToRoots`.
- **Graceful empty:** the hero, categories, how-it-works and the band all render from seed categories and static copy, so the page is never empty even with zero listings. No "recent listings" feed in this phase (that lands in Phase 3).
- **Icons** map off `Category.vertical` with a fallback, so unknown verticals still render a tile.

## File Structure

- `theme/content.ts` — **modify.** Add a `home` section (hero title/subtitle/searchPlaceholder, sections labels, how-it-works steps, band copy/cta).
- `src/components/home/categoryIcon.ts` — **create.** `verticalIcon(vertical: string)` → lucide icon component, with fallback.
- `src/components/home/HeroSearch.tsx` — **create.** Large client search → `/search?q=…` (bigger sibling of the header search).
- `src/components/home/Hero.tsx` — **create.** Headline + subtitle + `HeroSearch` + quick category chips.
- `src/components/home/CategoryTiles.tsx` — **create.** Grid of root-category tiles (icon + name + optional count), each links to `/[city]/[slug]`.
- `src/components/home/HowItWorks.tsx` — **create.** Static 3-step block.
- `src/components/home/ListYourItemBand.tsx` — **create.** Dark CTA band linking to a passed `href`.
- `src/app/(public)/page.tsx` — **modify (rewrite).** Fetch data, resolve default city, compose the sections.
- `tests/components/home/*.test.tsx` — **create.** Tests for `categoryIcon`, `HeroSearch`, `Hero`, `CategoryTiles`, `HowItWorks`, `ListYourItemBand`.

**Test conventions (from Phase 1):** component tests live under `tests/**`, import via the `@/…` alias, never a relative `./…` path (vitest `include` is `tests/**`).

Cross-cutting acceptance for every task: looks right at 375px **and** desktop, in **both** light and dark themes; no horizontal body scroll; tap targets ≥ 44px.

---

## Task 1: Home content strings

**Files:**
- Modify: `theme/content.ts`

- [ ] **Step 1: Add a `home` section** to the `content` object (place after `nav`):

```ts
home: {
  heroTitle: "Арендуй что угодно рядом. Или сдавай своё.",
  heroSubtitle: "Инструмент, техника, авто, снаряжение — на день, неделю или час. Без покупки.",
  heroSearchPlaceholder: "Дрель, палатка, велосипед…",
  categoriesHeading: "Категории",
  howHeading: "Как это работает",
  howSteps: [
    { title: "Найдите нужное", text: "Ищите вещи рядом с вами по категориям или через поиск." },
    { title: "Отправьте заявку", text: "Выберите даты и отправьте заявку владельцу — ни к чему не обязывает." },
    { title: "Заберите и пользуйтесь", text: "Владелец подтверждает бронь, вы договариваетесь и забираете." },
  ] as { title: string; text: string }[],
  bandTitle: "Есть что сдать в аренду?",
  bandText: "Разместите за пару минут и зарабатывайте на простое вещей.",
  bandCta: "Разместить",
},
```

- [ ] **Step 2: Typecheck** — Run: `pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 3: Commit**

```bash
git add theme/content.ts
git commit -m "feat(content): homepage hero copy and how-it-works steps"
```

---

## Task 2: Category icon map (by vertical)

**Files:**
- Create: `src/components/home/categoryIcon.ts`
- Test: `tests/components/home/categoryIcon.test.tsx`

Maps the stable `Category.vertical` to a lucide icon. Seed verticals today: `tools`, `sport`, `dresses`. Fallback `Package` for anything else.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { Wrench, Package } from "lucide-react";
import { verticalIcon } from "@/components/home/categoryIcon";

describe("verticalIcon", () => {
  it("maps a known vertical to its icon", () => {
    expect(verticalIcon("tools")).toBe(Wrench);
  });
  it("falls back to Package for unknown verticals", () => {
    expect(verticalIcon("something-new")).toBe(Package);
  });
});
```

- [ ] **Step 2: Run → FAIL** — Run: `pnpm test -- tests/components/home/categoryIcon.test.tsx` (module not found).

- [ ] **Step 3: Implement**

```ts
import { Wrench, Bike, Shirt, Package, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  tools: Wrench,
  sport: Bike,
  dresses: Shirt,
};

export function verticalIcon(vertical: string): LucideIcon {
  return MAP[vertical] ?? Package;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add src/components/home/categoryIcon.ts tests/components/home/categoryIcon.test.tsx
git commit -m "feat(home): category icon map by vertical"
```

---

## Task 3: HeroSearch component

**Files:**
- Create: `src/components/home/HeroSearch.tsx`
- Test: `tests/components/home/HeroSearch.test.tsx`

A large search input + button that navigates to `/search?q=…`. Same routing contract as the header search, bigger styling.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { HeroSearch } from "@/components/home/HeroSearch";

describe("HeroSearch", () => {
  it("navigates to /search with the query on submit", () => {
    render(<HeroSearch />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "палатка" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/search?q=%D0%BF%D0%B0%D0%BB%D0%B0%D1%82%D0%BA%D0%B0");
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { content } from "@theme/content";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
      }}
    >
      <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        aria-label={content.nav.search}
        placeholder={content.home.heroSearchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-10 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="h-10 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
      >
        {content.nav.search}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add src/components/home/HeroSearch.tsx tests/components/home/HeroSearch.test.tsx
git commit -m "feat(home): large hero search"
```

---

## Task 4: Hero component

**Files:**
- Create: `src/components/home/Hero.tsx`
- Test: `tests/components/home/Hero.test.tsx`

Headline + subtitle + `HeroSearch` + quick category chips. Chips are passed in as `{ slug, name }[]` and link to `/[city]/[slug]`; if no city, chips are omitted (search still present).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { Hero } from "@/components/home/Hero";
import { content } from "@theme/content";

describe("Hero", () => {
  it("shows the headline and a working search", () => {
    render(<Hero citySlug="kazan" chips={[{ slug: "instrument", name: "Инструмент" }]} />);
    expect(screen.getByText(content.home.heroTitle)).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Инструмент" })).toHaveAttribute("href", "/kazan/instrument");
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** (`Hero.tsx`)

```tsx
import Link from "next/link";
import { content } from "@theme/content";
import { HeroSearch } from "./HeroSearch";

export interface HeroChip { slug: string; name: string; }

export function Hero({ citySlug, chips = [] }: { citySlug?: string; chips?: HeroChip[] }) {
  return (
    <section className="bg-gradient-to-b from-muted/60 to-background px-4 py-12 text-center md:py-16">
      <h1 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight md:text-4xl">
        {content.home.heroTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{content.home.heroSubtitle}</p>
      <div className="mt-6"><HeroSearch /></div>
      {citySlug && chips.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <Link
              key={c.slug}
              href={`/${citySlug}/${c.slug}` as never}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-foreground transition-transform active:scale-[0.97] hover:border-primary"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add src/components/home/Hero.tsx tests/components/home/Hero.test.tsx
git commit -m "feat(home): hero section with headline, search and category chips"
```

---

## Task 5: CategoryTiles component

**Files:**
- Create: `src/components/home/CategoryTiles.tsx`
- Test: `tests/components/home/CategoryTiles.test.tsx`

Grid of root-category tiles: icon (from `verticalIcon`), name, optional count. Each links to `/[city]/[slug]`. Props: `{ citySlug: string; categories: { slug: string; name: string; vertical: string; count?: number }[] }`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CategoryTiles } from "@/components/home/CategoryTiles";

describe("CategoryTiles", () => {
  const cats = [
    { slug: "instrument", name: "Инструмент", vertical: "tools", count: 3 },
    { slug: "sport", name: "Спорт", vertical: "sport" },
  ];
  it("links each tile into the city and shows counts when present", () => {
    render(<CategoryTiles citySlug="kazan" categories={cats} />);
    expect(screen.getByRole("link", { name: /Инструмент/ })).toHaveAttribute("href", "/kazan/instrument");
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** (use `verticalIcon`, `listingsCountLabel` from `@/lib/catalog/format` for the count text). Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3`. Tile: bordered rounded-2xl card, icon top-left, name, count in muted text.

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add src/components/home/CategoryTiles.tsx tests/components/home/CategoryTiles.test.tsx
git commit -m "feat(home): category tiles grid"
```

---

## Task 6: HowItWorks component

**Files:**
- Create: `src/components/home/HowItWorks.tsx`
- Test: `tests/components/home/HowItWorks.test.tsx`

Static 3-step block from `content.home.howSteps` (numbered badges + title + text). Responsive: 1 col mobile, 3 cols desktop.

- [ ] **Step 1: Failing test** — assert `content.home.howHeading` renders and all three step titles appear.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — map `content.home.howSteps` with an index badge (`i + 1`).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add src/components/home/HowItWorks.tsx tests/components/home/HowItWorks.test.tsx
git commit -m "feat(home): how-it-works block"
```

---

## Task 7: ListYourItemBand component

**Files:**
- Create: `src/components/home/ListYourItemBand.tsx`
- Test: `tests/components/home/ListYourItemBand.test.tsx`

Dark CTA band. Props: `{ href: string }` (page passes the same place-href logic as the header: `/cabinet/listings/new` when authed-with-username, `/welcome` when authed-no-username, `/login` when anon). Copy from `content.home.band*`.

- [ ] **Step 1: Failing test** — assert band title renders and the CTA link points to the passed `href`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — full-width rounded-2xl band `bg-foreground text-background` (legible in both themes since foreground/background invert), title + text + a `Link` styled as a light button with `active:scale-[0.97]`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add src/components/home/ListYourItemBand.tsx tests/components/home/ListYourItemBand.test.tsx
git commit -m "feat(home): list-your-item CTA band"
```

---

## Task 8: Compose the homepage

**Files:**
- Modify: `src/app/(public)/page.tsx`

Rewrite to fetch data, resolve the default city, and lay out: `Hero` → `CategoryTiles` → `HowItWorks` → `ListYourItemBand`. Reuse the existing fetch pattern already in the file (`getActiveCities`, `getAllCategories`, `getListingCountsByCategory`, `rollupToRoots`) plus `auth()` for the band href.

- [ ] **Step 1: Implement** the page:
  - `const [session, cities, cats] = await Promise.all([auth(), getActiveCities(), getAllCategories()])`.
  - `const defaultCity = cities[0] ?? null;` (single-city → that city; multi → first).
  - `const roots = cats.filter((c) => c.parentId === null)`.
  - counts: `const counts = defaultCity ? rollupToRoots(cats, await getListingCountsByCategory(defaultCity.id)) : null;`
  - chips: first 5 roots `{ slug, name }`.
  - tiles: roots mapped to `{ slug, name, vertical, count: counts?.get(id) }`.
  - band href: `const user = session?.user; const placeHref = !user ? "/login" : user.username ? "/cabinet/listings/new" : "/welcome";`
  - Render sections inside `<main>`; wrap category/how/band in a `mx-auto max-w-[1200px] px-4` container with vertical spacing (`space-y-12 py-12`). Keep `export const dynamic = "force-dynamic"` and metadata.
  - Pass `citySlug={defaultCity?.slug}` to `Hero` and `CategoryTiles` (guard `CategoryTiles` render on `defaultCity`).

- [ ] **Step 2: Typecheck** — Run: `pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/page.tsx"
git commit -m "feat(home): compose max-hero marketplace homepage"
```

---

## Task 9: Responsive + theme + empty-state verification

**Files:** none (verification only). REQUIRED SKILL: use the `verify` / run-the-app step.

- [ ] **Step 1:** Ensure DB is up (`docker compose up -d db`), then `pnpm dev`.
- [ ] **Step 2:** Load `/` — hero, category tiles (with icons + counts), how-it-works, and the dark band all render; hero search submits to `/search`; category tiles/chips link into the default city.
- [ ] **Step 3:** 375px and desktop: no horizontal body scroll; tiles reflow (2→3→6 cols); band and steps stack; tap targets ≥ 44px.
- [ ] **Step 4:** Toggle light ↔ dark: gradient, tiles, muted text, and the inverted band are all legible; green accents AA-legible.
- [ ] **Step 5:** Empty-state sanity: even with zero listings the page is full and coherent (counts simply absent/zero). If practical, spot-check by viewing a category with no listings.
- [ ] **Step 6:** Full suite green: `pnpm test && pnpm exec tsc --noEmit`.
- [ ] **Step 7 (DoD):** Phase 2 done when all pass in both themes and both viewports.

---

## After Phase 2

Next: **Phase 3 — Catalog + real search** (subcategory tree + filters as mobile bottom-sheet, card grid, functional `/search` over the catalog, `ListingCard` polish). Write that plan only once Phase 2 is DoD-green.
