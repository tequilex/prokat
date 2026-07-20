# prokat Redesign — Phase 5: Unified Account («Кабинет»)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the two separate account zones — `(me)` (buyer: Мои заявки / Профиль) and `cabinet` (owner: Заявки / Календарь / Позиции / Статистика / Настройки) — feel like **one** cabinet with a single, consistent navigation everywhere: personal tabs first («я арендую»), owner tabs second («я сдаю»), the owner tabs appearing only when the user has a прокат. Remove the premature `cabinet/stats`. Relabel for clarity. **No route moves, no profile/settings merge, no touching the provider-onboarding gate** (those were based on wrong assumptions or belong to Phase 6).

**Architecture:** Extract a single source of truth for account navigation — `buildAccountNav({ hasProvider, newRequestsCount })` — returning the ordered tab list with an optional separator between the personal and owner groups. Both the `(me)` layout and the `cabinet` layout call it, so the sidebar/tabs are identical wherever you are. `AccountShell` gains a lightweight separator between groups. `cabinet/stats` (page + nav entry) is deleted.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, Tailwind, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-19-prokat-redesign-design.md` (§ Единый «Кабинет»). Builds on Phases 1–4.

## Corrections to the spec (verified against code — do NOT follow the stale bullets)

- **`/cabinet/new` is NOT a duplicate create route** — it is the provider onboarding form (`getOwnerProvider` gate redirects here). `/cabinet/listings/new` creates a listing. Both stay.
- **Profile ≠ Settings** — `/profile` is user data (name, phone, OAuth accounts, for everyone); `/cabinet/settings` is прокат configuration (owner-only, provider-gated). They are **not** merged; they remain distinct tabs.
- The only real deletion is **`cabinet/stats`**. Softening the provider-onboarding barrier (spec rec A) is **Phase 6**, not here.

## Target navigation (single ordered list)

Personal group (always): **Мои заявки** `/requests` · **Профиль** `/profile`
— separator —
Owner group (only when `hasProvider`): **Заявки на мои вещи** `/cabinet/requests` (badge = new count) · **Мои объявления** `/cabinet/listings` · **Календарь** `/cabinet/calendar` · **Настройки проката** `/cabinet/settings`

Shell title is «Кабинет» in both layouts.

## File Structure

- `src/components/account/accountNav.ts` — **create.** `AccountNavItem` interface (moved here; adds `separatorBefore?: boolean`) + `buildAccountNav({ hasProvider, newRequestsCount })`.
- `src/components/account/AccountShell.tsx` — **modify.** Import `AccountNavItem` from `accountNav`; render a divider before an item with `separatorBefore` (desktop sidebar and mobile tabs).
- `src/app/(app)/(me)/layout.tsx` — **modify.** Fetch provider + new-request count; render `AccountShell` with `buildAccountNav(...)`, title «Кабинет».
- `src/app/(app)/cabinet/layout.tsx` — **modify.** Use `buildAccountNav(...)` for the items (provider branch), title «Кабинет».
- `src/app/(app)/cabinet/stats/page.tsx` — **delete.**
- `tests/components/account/accountNav.test.ts` — **create.**
- `tests/components/account/AccountShell.test.tsx` — **create** (separator render).

**Test conventions:** tests under `tests/**`, import via `@/…`.

Cross-cutting acceptance: the identical nav shows on `/requests`, `/profile`, and every `/cabinet/*` page; renter-only user sees just the personal group; 375px shows the mobile tab strip; both themes legible.

---

## Task 1: buildAccountNav (single source of truth)

**Files:**
- Create: `src/components/account/accountNav.ts`
- Test: `tests/components/account/accountNav.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildAccountNav } from "@/components/account/accountNav";

describe("buildAccountNav", () => {
  it("shows only personal tabs when there is no provider", () => {
    const items = buildAccountNav({ hasProvider: false, newRequestsCount: 0 });
    expect(items.map((i) => i.href)).toEqual(["/requests", "/profile"]);
  });

  it("adds owner tabs (with a separator) when a provider exists", () => {
    const items = buildAccountNav({ hasProvider: true, newRequestsCount: 2 });
    expect(items.map((i) => i.href)).toEqual([
      "/requests", "/profile",
      "/cabinet/requests", "/cabinet/listings", "/cabinet/calendar", "/cabinet/settings",
    ]);
    const ownerReq = items.find((i) => i.href === "/cabinet/requests")!;
    expect(ownerReq.badge).toBe(2);
    expect(ownerReq.separatorBefore).toBe(true);
    expect(items.some((i) => i.href === "/cabinet/stats")).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL** — `pnpm test -- tests/components/account/accountNav.test.ts`.

- [ ] **Step 3: Implement**

```ts
export interface AccountNavItem {
  href: string;
  label: string;
  badge?: number;
  separatorBefore?: boolean;
}

export function buildAccountNav(
  { hasProvider, newRequestsCount }: { hasProvider: boolean; newRequestsCount: number },
): AccountNavItem[] {
  const items: AccountNavItem[] = [
    { href: "/requests", label: "Мои заявки" },
    { href: "/profile", label: "Профиль" },
  ];
  if (hasProvider) {
    items.push(
      { href: "/cabinet/requests", label: "Заявки на мои вещи", badge: newRequestsCount, separatorBefore: true },
      { href: "/cabinet/listings", label: "Мои объявления" },
      { href: "/cabinet/calendar", label: "Календарь" },
      { href: "/cabinet/settings", label: "Настройки проката" },
    );
  }
  return items;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add src/components/account/accountNav.ts tests/components/account/accountNav.test.ts && git commit -m "feat(account): single source of truth for cabinet navigation"`

---

## Task 2: AccountShell — import type + render separator

**Files:**
- Modify: `src/components/account/AccountShell.tsx`
- Test: `tests/components/account/AccountShell.test.tsx`

- [ ] **Step 1:** Remove the local `AccountNavItem` interface from `AccountShell.tsx`; import it from `@/components/account/accountNav` instead (keep `AccountShell` a client component). Re-export it if other files import it from AccountShell (grep first: `grep -rn "AccountNavItem" src`).

- [ ] **Step 2: Failing test** — assert that with two items where the second has `separatorBefore`, a separator (`role="separator"` or a `<hr>` / element with `data-separator`) renders before it.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/requests" }));
import { AccountShell } from "@/components/account/AccountShell";

describe("AccountShell", () => {
  it("renders a separator before a grouped item", () => {
    render(
      <AccountShell title="Кабинет" items={[
        { href: "/requests", label: "Мои заявки" },
        { href: "/cabinet/requests", label: "Заявки на мои вещи", separatorBefore: true },
      ]}>x</AccountShell>,
    );
    expect(screen.getAllByRole("separator").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run → FAIL.**
- [ ] **Step 4: Implement** — in both the desktop sidebar `nav` and the mobile tabs `nav`, before rendering an item with `separatorBefore`, output a divider. Desktop: `<hr role="separator" className="my-2 border-border" />`. Mobile (horizontal): `<span role="separator" aria-orientation="vertical" className="mx-1 w-px self-stretch bg-border" />`. Use a fragment keyed by href.
- [ ] **Step 5: Run → PASS.** Also `pnpm exec tsc --noEmit`.
- [ ] **Step 6: Commit** — `git add src/components/account/AccountShell.tsx src/components/account/accountNav.ts tests/components/account/AccountShell.test.tsx && git commit -m "feat(account): AccountShell renders group separator"`

---

## Task 3: (me) layout uses the unified nav

**Files:**
- Modify: `src/app/(app)/(me)/layout.tsx`

- [ ] **Step 1:** Fetch the provider and new-request count (same helpers the cabinet layout uses): `import { getOwnerProvider, countNewRequests } from "@/server/owner"`. After the auth guard: `const provider = await getOwnerProvider(session.user.id); const newCount = provider ? await countNewRequests(provider.id) : 0;`
- [ ] **Step 2:** Render `<AccountShell title="Кабинет" items={buildAccountNav({ hasProvider: Boolean(provider), newRequestsCount: newCount })}>`.
- [ ] **Step 3:** `pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git add "src/app/(app)/(me)/layout.tsx" && git commit -m "feat(account): unified nav on buyer layout"`

---

## Task 4: cabinet layout uses the unified nav; drop stats entry

**Files:**
- Modify: `src/app/(app)/cabinet/layout.tsx`

- [ ] **Step 1:** In the provider branch, replace the hard-coded `items` array with `buildAccountNav({ hasProvider: true, newRequestsCount: newCount })` and set `title="Кабинет"`. Keep the no-provider branch (bare children for onboarding) unchanged. Import `buildAccountNav`.
- [ ] **Step 2:** `pnpm exec tsc --noEmit` → PASS. (The `stats` entry is now gone from the nav because `buildAccountNav` does not include it.)
- [ ] **Step 3: Commit** — `git add "src/app/(app)/cabinet/layout.tsx" && git commit -m "feat(account): unified nav on owner layout, drop stats tab"`

---

## Task 5: Delete cabinet/stats

**Files:**
- Delete: `src/app/(app)/cabinet/stats/page.tsx`

- [ ] **Step 1:** Grep for any link to `/cabinet/stats` (`grep -rn "cabinet/stats" src`) — if `cabinet/page.tsx` or anything links there, remove/redirect that link too.
- [ ] **Step 2:** Delete the route: `git rm "src/app/(app)/cabinet/stats/page.tsx"` (and the `stats` directory if now empty).
- [ ] **Step 3:** `pnpm exec tsc --noEmit && pnpm test` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "chore(cabinet): remove premature stats page"`

---

## Task 6: Verification pass

**Files:** none (verification only). REQUIRED SKILL: use the `verify` / run-the-app step.

- [ ] **Step 1:** DB up, `pnpm dev`. Log in as a **renter without a прокат** (dev-login). Visit `/requests` and `/profile`: the cabinet nav shows exactly **Мои заявки · Профиль** (no owner tabs, no separator), identical on both pages, title «Кабинет».
- [ ] **Step 2:** As a user **with a прокат** (a seeded owner via dev-login, e.g. `owner1`): `/requests`, `/profile`, `/cabinet/requests`, `/cabinet/listings`, `/cabinet/calendar`, `/cabinet/settings` all show the full unified nav with the separator before «Заявки на мои вещи», the new-requests badge, and **no «Статистика»** tab.
- [ ] **Step 3:** `/cabinet/stats` now 404s; nothing links to it.
- [ ] **Step 4:** 375px: the tab strip scrolls horizontally and includes the separator; desktop sidebar shows the divider. Both light + dark legible.
- [ ] **Step 5:** Full suite green: `pnpm test && pnpm exec tsc --noEmit`.
- [ ] **Step 6 (DoD):** Phase 5 done when the same unified «Кабинет» nav appears across `(me)` and `cabinet`, owner tabs are provider-gated, stats is gone, and everything passes in both themes and viewports.

---

## After Phase 5

Next: **Phase 6 — Admin cleanup + provider reconciliation** (resolve the `providers` entity per spec §«Совместимость» — recommended: lazy/hidden provider on first publish, softening the onboarding barrier; trim `admin/providers` accordingly). Write that plan only once Phase 5 is DoD-green.
