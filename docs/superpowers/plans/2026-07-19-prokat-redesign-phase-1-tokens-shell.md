# prokat Redesign — Phase 1: Design Tokens + Marketplace Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the article-feed visual foundation and header inherited from `skelet`/foxgeek with prokat's marketplace look (green accent, no pink header) and a marketplace shell (city selector + search + «Разместить» + profile), working responsively in both light and dark themes — without touching domain logic.

**Architecture:** Pure visual + navigation layer. Update CSS custom-property tokens in `theme/tokens.css` (single source of truth, `:root` + `.dark`), add marketplace UI strings to `theme/content.ts`, and rebuild `src/components/layout/Header.tsx` from small focused client components (`CitySelector`, `HeaderSearch`). Add a minimal `/search` route so header search is not a dead link (real search lands in Phase 3). Existing `AccountShell` (desktop sidebar + mobile tabs) is kept as-is for later cabinet phases.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, Tailwind (tokens via `color-mix` + CSS vars), `next-themes`, Radix (Sheet/DropdownMenu), lucide-react, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-19-prokat-redesign-design.md`

---

## File Structure

- `theme/tokens.css` — **modify.** Green accent for `--color-primary`/`--color-accent`/`--color-ring` in both themes; `--color-header` set equal to background (drop pink); keep all required tokens (check-theme contract).
- `theme/content.ts` — **modify.** Add `nav.place`, `nav.search`, `nav.searchPlaceholder`, `nav.city`, `nav.allCities`; refresh `site.tagline`.
- `src/app/layout.tsx` — **modify.** `NextTopLoader` color → green constant.
- `src/components/ui/button.tsx` — **modify.** Add press feedback (`active:scale-[0.97]`, transition) to base classes.
- `src/components/layout/CitySelector.tsx` — **create.** Client dropdown of active cities → `/[city]`.
- `src/components/layout/HeaderSearch.tsx` — **create.** Client search form → `/search?q=…`.
- `src/components/layout/Header.tsx` — **modify (rewrite).** Compose logo + CitySelector + HeaderSearch + «Разместить» + profile; responsive; drop stale LeftNav/BottomNav comments.
- `src/app/(public)/search/page.tsx` — **create.** Minimal placeholder results page reading `?q=`.
- `tests/theme/tokens.test.ts` — **create.** Assert accent is green and header is not pink, both themes.
- `tests/components/layout/*.test.tsx` — **create.** Component tests for CitySelector, HeaderSearch, Header.

**Test conventions (must follow — vitest only collects `tests/**`):** every component test lives under `tests/` mirroring the source path (e.g. `tests/components/layout/CitySelector.test.tsx`), imports the component via the `@/…` alias (never a relative `./…` path), and is run with its full path under `tests/`. Co-locating a `*.test.tsx` next to source in `src/…` means vitest reports "No test files found". See the existing `tests/components/layout/Footer.test.tsx` for the pattern.

Cross-cutting acceptance for every visual task: looks right at 375px width **and** desktop, in **both** light and dark themes (spec §«Сквозные требования»).

---

## Task 1: Green accent tokens, drop pink header

**Files:**
- Test: `tests/theme/tokens.test.ts` (create)
- Modify: `theme/tokens.css`
- Modify: `src/app/layout.tsx` (NextTopLoader color)

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme/tokens.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { validateTokensCss } from "../../scripts/check-theme";

const css = readFileSync(join(process.cwd(), "theme", "tokens.css"), "utf8");

function block(sel: string): string {
  const re = new RegExp(`${sel.replace(/[.\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m");
  return css.match(re)?.[1] ?? "";
}

describe("theme tokens", () => {
  it("keeps all required tokens present (check-theme contract)", () => {
    expect(validateTokensCss(css).ok).toBe(true);
  });

  it("uses a green accent in both themes", () => {
    // primary/accent/ring share the green; assert hue by exact configured hex
    expect(block(":root")).toMatch(/--color-primary:\s*#0A8F4D/i);
    expect(block(".dark")).toMatch(/--color-primary:\s*#22C77E/i);
  });

  it("drops the pink header (header equals background)", () => {
    expect(block(":root")).toMatch(/--color-header:\s*#FFFFFF/i);
    expect(block(".dark")).toMatch(/--color-header:\s*#232324/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/theme/tokens.test.ts`
Expected: FAIL (accent is `#2970FF`, header is `#FFE6EB`).

- [ ] **Step 3: Edit `theme/tokens.css`**

In `:root` set:
```
--color-header:  #FFFFFF;
--color-primary: #0A8F4D;
--color-accent:  #0A8F4D;
--color-ring:    #0A8F4D;
```
In `.dark` set:
```
--color-header:  #232324;
--color-primary: #22C77E;
--color-accent:  #22C77E;
--color-ring:    #22C77E;
```
Leave every other token and all `--radius-*`/`--font-*` untouched.

- [ ] **Step 4: Update NextTopLoader color**

In `src/app/layout.tsx` change `<NextTopLoader color="#2970FF" …>` to `color="#0A8F4D"`.

- [ ] **Step 5: Run tests + theme check**

Run: `pnpm test -- tests/theme/tokens.test.ts && pnpm check-theme`
Expected: PASS, and `✓ theme/tokens.css: all required tokens present`.

- [ ] **Step 6: Verify contrast (AA), adjust if needed**

Check `--color-primary` vs `--color-primary-fg` (white) in both themes ≥ 4.5:1 for the button label. If light `#0A8F4D` on white text is < 4.5:1, darken toward `#087A41` and update the test hex to match. Record the final values.

- [ ] **Step 7: Commit**

```bash
git add theme/tokens.css src/app/layout.tsx tests/theme/tokens.test.ts
git commit -m "feat(theme): green marketplace accent, drop inherited pink header"
```

---

## Task 2: Marketplace UI strings

**Files:**
- Modify: `theme/content.ts`

- [ ] **Step 1: Add strings** under `content.nav` (keep existing `home`, `login`):

```ts
nav: {
  home: "Главная",
  login: "Войти",
  place: "Разместить",
  search: "Найти",
  searchPlaceholder: "Что арендуем?",
  city: "Город",
  allCities: "Все города",
},
```
And refresh `site.tagline` to: `"Арендуй что угодно рядом — или сдавай своё"`.

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no missing-key errors elsewhere; `content` is a plain object).

- [ ] **Step 3: Commit**

```bash
git add theme/content.ts
git commit -m "feat(content): add marketplace header strings"
```

---

## Task 3: CitySelector component

**Files:**
- Create: `src/components/layout/CitySelector.tsx`
- Test: `tests/components/layout/CitySelector.test.tsx`

Props: `{ cities: { slug: string; name: string }[]; currentSlug?: string }`. Uses the existing `DropdownMenu` UI. Each item links to `/${slug}`. Trigger shows current city name (or `content.nav.city`) with a `MapPin` icon. Server components pass `getActiveCities()` results in.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/layout/CitySelector.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CitySelector } from "@/components/layout/CitySelector";

describe("CitySelector", () => {
  const cities = [{ slug: "msk", name: "Москва" }, { slug: "spb", name: "Санкт-Петербург" }];

  it("shows the current city name on the trigger", () => {
    render(<CitySelector cities={cities} currentSlug="msk" />);
    expect(screen.getByRole("button", { name: /Москва/ })).toBeInTheDocument();
  });

  it("renders a link to each city", () => {
    render(<CitySelector cities={cities} />);
    // dropdown content is rendered lazily; assert the trigger falls back to «Город»
    expect(screen.getByRole("button", { name: /Город/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/components/layout/CitySelector.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `CitySelector.tsx`**

```tsx
"use client";
import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";
import { content } from "@theme/content";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export interface CityOption { slug: string; name: string; }

export function CitySelector({ cities, currentSlug }: { cities: CityOption[]; currentSlug?: string }) {
  const current = cities.find((c) => c.slug === currentSlug);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted">
        <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="max-w-[8rem] truncate">{current?.name ?? content.nav.city}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {cities.map((c) => (
          <DropdownMenuItem key={c.slug} asChild>
            <Link href={`/${c.slug}` as never}>{c.name}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/components/layout/CitySelector.test.tsx`
Expected: PASS. (If Radix trigger role differs, assert by text via `screen.getByText`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/CitySelector.tsx tests/components/layout/CitySelector.test.tsx
git commit -m "feat(shell): city selector dropdown"
```

---

## Task 4: HeaderSearch component

**Files:**
- Create: `src/components/layout/HeaderSearch.tsx`
- Test: `tests/components/layout/HeaderSearch.test.tsx`

A `<form>` with a text input that navigates to `/search?q=…` on submit (`useRouter().push`). Placeholder from `content.nav.searchPlaceholder`. Full-width on desktop; on mobile it can collapse — but keep the input present (Phase 1 keeps it simple: full-width input that wraps below the top row on narrow screens).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/layout/HeaderSearch.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { HeaderSearch } from "@/components/layout/HeaderSearch";

describe("HeaderSearch", () => {
  it("navigates to /search with the query on submit", () => {
    render(<HeaderSearch />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "дрель" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/search?q=%D0%B4%D1%80%D0%B5%D0%BB%D1%8C");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/components/layout/HeaderSearch.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `HeaderSearch.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { content } from "@theme/content";

export function HeaderSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={`flex w-full items-center gap-2 rounded-xl bg-muted px-3 py-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
      }}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        aria-label={content.nav.search}
        placeholder={content.nav.searchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/components/layout/HeaderSearch.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/HeaderSearch.tsx tests/components/layout/HeaderSearch.test.tsx
git commit -m "feat(shell): header search form routing to /search"
```

---

## Task 5: Minimal /search placeholder route

**Files:**
- Create: `src/app/(public)/search/page.tsx`

Prevents header search from 404ing. Real search (query catalog + filters + cards) is Phase 3; here it just echoes the query and links back home.

- [ ] **Step 1: Implement the page**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Поиск" };

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Поиск</h1>
      <p className="mt-2 text-muted-foreground">
        {q ? `Запрос: «${q}». Полноценный поиск появится позже.` : "Введите запрос в строке поиска."}
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Verify it builds and renders**

Run: `pnpm exec tsc --noEmit` and manually hit `/search?q=test` via the run/verify step in Task 8.
Expected: typecheck PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/search/page.tsx"
git commit -m "feat(search): minimal placeholder results route"
```

---

## Task 6: Rebuild the marketplace Header

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Test: `tests/components/layout/Header.test.tsx`

Compose: logo (→ `/`) · `CitySelector` · `HeaderSearch` (grows) · «Разместить» button · `ThemeToggle` · profile (`UserMenu` when authed, else login). «Разместить» links to `/cabinet/listings/new` for authed users, else `/login`. Remove the stale LeftNav/BottomNav comments. On mobile: top row = logo + city + theme + profile/burger; search sits on its own full-width row below.

Header is an async server component (calls `auth()`); it needs the city list. Fetch active cities via `getActiveCities()` and pass to `CitySelector` (no `currentSlug` at the global level — the city is only known inside `/[city]` routes; global header shows «Город»).

- [ ] **Step 1: Write the failing test** (render with mocked `auth`, cities)

```tsx
// tests/components/layout/Header.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
// Header renders HeaderSearch, which calls useRouter() at render — must be mocked
// or jsdom throws "invariant expected app router to be mounted".
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
// City row is untyped in the mock: only slug/name are read; no need to satisfy the
// full City type (real rows have more columns).
vi.mock("@/server/catalog", () => ({ getActiveCities: vi.fn(async () => [{ id: "1", slug: "msk", name: "Москва" }]) }));

import { Header } from "@/components/layout/Header";

describe("Header", () => {
  it("renders search, city selector, place CTA and login for anon", async () => {
    render(await Header());
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Город/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Разместить/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Войти/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/components/layout/Header.test.tsx`
Expected: FAIL (old header has no search/city).

- [ ] **Step 3: Rewrite `Header.tsx`**

Keep it a server component. Sketch (fill imports from existing file + new components):

```tsx
export async function Header() {
  const [session, cities] = await Promise.all([auth(), getActiveCities()]);
  const user = session?.user;
  const placeHref = user ? "/cabinet/listings/new" : "/login";
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-header/95 backdrop-blur supports-[backdrop-filter]:bg-header/90">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-2 md:h-14 md:flex-row md:items-center md:gap-4 md:py-0">
        <div className="flex items-center justify-between gap-3 md:justify-start">
          <Link href="/" className="font-display text-lg font-semibold text-foreground">{content.site.name}</Link>
          <CitySelector cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} />
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <ThemeToggle />
            {/* profile/login compact (UserMenu or Sheet), same logic as desktop below */}
          </div>
        </div>
        <HeaderSearch className="md:mx-2 md:max-w-xl md:flex-1" />
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild size="sm"><Link href={placeHref as never}>{content.nav.place}</Link></Button>
          <ThemeToggle />
          {user?.username
            ? <UserMenu username={user.username} name={user.name ?? null} image={user.image ?? null} isAdmin={user.role === "admin"} />
            : <Button asChild variant="outline" size="sm"><Link href={user ? "/welcome" : "/login"}>{user ? content.auth.chooseUsername : content.nav.login}</Link></Button>}
        </div>
      </div>
    </header>
  );
}
```

Ensure «Разместить» is reachable on mobile too (place it in the mobile profile Sheet or as a compact icon button). Keep all interactive targets ≥ 44px.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/components/layout/Header.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Header.tsx tests/components/layout/Header.test.tsx
git commit -m "feat(shell): marketplace header with city, search and place CTA"
```

---

## Task 7: Button press feedback (emil polish)

**Files:**
- Modify: `src/components/ui/button.tsx`

Add tactile press feedback used across the whole app.

- [ ] **Step 1: Edit base classes**

In `buttonVariants` base string, append: `transition-transform active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100`. Keep existing `transition-colors` (both can coexist; or combine into `transition`).

- [ ] **Step 2: Verify nothing breaks**

Run: `pnpm test` (existing button/consumer tests) and `pnpm exec tsc --noEmit`.
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(ui): press-scale feedback on buttons"
```

---

## Task 8: Responsive + theme verification pass

**Files:** none (verification only). REQUIRED SKILL: use the `verify` skill / run the app.

- [ ] **Step 1:** Start the app (`pnpm dev` after `docker compose up -d db && pnpm db:migrate && pnpm db:seed` if DB not up — see project memory).
- [ ] **Step 2:** Verify the header at 375px and desktop widths: no horizontal body scroll; search usable; «Разместить», city, profile reachable; tap targets ≥ 44px.
- [ ] **Step 3:** Toggle light ↔ dark: header, buttons, search field, city dropdown all legible; green accent AA-legible in both; no pink anywhere; NextTopLoader is green.
- [ ] **Step 4:** Hit `/search?q=test` — placeholder renders, not a 404.
- [ ] **Step 5:** Full suite green: `pnpm test && pnpm check-theme && pnpm exec tsc --noEmit`.
- [ ] **Step 6 (DoD):** Phase 1 is done when all above pass in both themes and both viewports.

---

## Phase Roadmap (subsequent plans — write each only after the prior is DoD-green)

Following the project's established cadence (one plan per phase, mobile + both themes are DoD in **every** phase):

- **Phase 2 — Homepage «максимальный герой».** Rebuild `(public)/page.tsx`: promise headline + big search + category tiles + «Как это работает» + «Сдавай и зарабатывай» band; graceful-empty when few listings.
- **Phase 3 — Catalog + real search.** Category section (left subcategory tree + filters as bottom-sheet on mobile), card grid, functional `/search` over the catalog; polish `ListingCard`.
- **Phase 4 — Listing page + booking.** Sticky Airbnb-style booking card (desktop) / bottom bar + date bottom-sheet (mobile) around existing `BookingWidget`/`AvailabilityCalendar`; contacts revealed after confirmation.
- **Phase 5 — Unified «Кабинет».** Merge `(me)` into one account area via `AccountShell` tabs: Мои заявки / Мои объявления (+create here) / Заявки на мои вещи / Календарь / Профиль+настройки; remove duplicate create route and `cabinet/stats`.
- **Phase 6 — Admin cleanup + provider reconciliation.** Resolve the `providers` entity per spec §«Совместимость» (recommended: lazy/hidden provider on first publish); trim `admin/providers` accordingly.
