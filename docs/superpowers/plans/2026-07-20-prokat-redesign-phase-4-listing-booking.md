# prokat Redesign — Phase 4: Listing Page + Booking Presentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the listing detail page up to the new visual language — an Airbnb-style booking card and gallery, plus a proper owner/provider block with a «проверен» trust badge — **without changing any booking logic**. The sticky desktop card and the mobile fixed bottom bar already exist inside `BookingWidget`; this phase polishes their presentation and adds the missing owner block.

**Architecture:** Presentation-only. Add one small presentational `OwnerCard` (provider name + `isVerified` badge + link + address/hours) rendered on the listing page. Polish the existing `BookingWidget` card container and the listing page gallery to the new tokens (rounded-2xl, soft shadow, prominent price). No changes to date/quantity selection, URL sync, `LoginDialog`, `BookingFormDialog`, or the booking server flow.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, Tailwind (tokens), lucide-react, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-19-prokat-redesign-design.md` (§ Страница объявления). Builds on Phases 1–3.

**Important — already implemented (do NOT rebuild):** `ListingPage` in `src/app/(public)/[city]/[seg]/[sub]/page.tsx` already has a two-column layout with a sticky `<aside md:sticky md:top-20>` booking card (desktop) and `main` `pb-24 md:pb-6`. `BookingWidget` already renders the price/date/qty form, the in-card book button (hidden on mobile), a **fixed mobile bottom bar** (price + «Забронировать», `fixed inset-x-0 bottom-0 md:hidden`), plus `LoginDialog` and `BookingFormDialog` with a working request submission. Contacts-after-confirmation is part of the already-shipped booking flow (buyer `/requests`); this phase only **verifies** it, it does not build it.

## Design decisions locked for this phase

- **Trust badge** reflects `providers.isVerified` (boolean). Verified → green «✓ Проверен» pill; not verified → no badge (no "unverified" label).
- **Owner block** shows: provider name (link to `/{city}/{provider}`), verified badge, address (if any) and work hours (if any). No avatar image (providers have no image field) — use a neutral icon placeholder.
- **No new booking behavior, no date bottom-sheet rework** — the existing stacked-card + fixed bottom bar already covers mobile. We only restyle.

## File Structure

- `src/components/booking/OwnerCard.tsx` — **create.** Presentational provider/owner block with `isVerified` badge.
- `src/app/(public)/[city]/[seg]/[sub]/page.tsx` — **modify.** Render `OwnerCard` in `ListingPage` (under the title / above the calendar); polish gallery corners to `rounded-2xl`.
- `src/components/booking/BookingWidget.tsx` — **modify.** Card container `rounded-lg` → `rounded-2xl` + soft shadow; make the day price the prominent line; keep everything else (logic, mobile bar) intact.
- `tests/components/booking/OwnerCard.test.tsx` — **create.**

**Test conventions:** tests under `tests/**`, import via `@/…`.

Cross-cutting acceptance every task: 375px **and** desktop; **both** themes; no horizontal body scroll; tap targets ≥ 44px; the mobile fixed bottom bar must not overlap content (the page keeps `pb-24`).

---

## Task 1: OwnerCard component

**Files:**
- Create: `src/components/booking/OwnerCard.tsx`
- Test: `tests/components/booking/OwnerCard.test.tsx`

Props: `{ name: string; href: string; isVerified: boolean; address?: string | null; hoursText?: string | null }`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OwnerCard } from "@/components/booking/OwnerCard";

describe("OwnerCard", () => {
  it("links the provider name and shows the verified badge when verified", () => {
    render(<OwnerCard name="ПрокатМастер" href="/kazan/prokatmaster" isVerified address="ул. Баумана" hoursText={null} />);
    expect(screen.getByRole("link", { name: /ПрокатМастер/ })).toHaveAttribute("href", "/kazan/prokatmaster");
    expect(screen.getByText(/Проверен/)).toBeInTheDocument();
  });

  it("omits the badge when not verified", () => {
    render(<OwnerCard name="Частник" href="/kazan/chastnik" isVerified={false} />);
    expect(screen.queryByText(/Проверен/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL** — `pnpm test -- tests/components/booking/OwnerCard.test.tsx`.

- [ ] **Step 3: Implement** — a `rounded-2xl border border-border bg-card p-4` block: a neutral `Store`/`User` lucide icon in a `rounded-full bg-muted` circle, the name as a `Link` (font-medium), the verified pill (`bg-primary/10 text-primary` with a `BadgeCheck` icon and «Проверен») only when `isVerified`, and muted lines for `address` and `hoursText` when present (each with a `MapPin`/`Clock` icon).

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add src/components/booking/OwnerCard.tsx tests/components/booking/OwnerCard.test.tsx && git commit -m "feat(listing): owner card with verified badge"`

---

## Task 2: Booking card visual polish

**Files:**
- Modify: `src/components/booking/BookingWidget.tsx`

Polish only the card container/price; do not touch state, effects, conflict logic, the mobile bottom bar, or the dialogs.

- [ ] **Step 1:** Change the card wrapper `className="rounded-lg border border-border bg-card p-4"` → `"rounded-2xl border border-border bg-card p-4 shadow-sm"`.
- [ ] **Step 2:** Emphasise the day price: in the price `<dl>`, render the «Сутки» value as `text-xl font-bold tracking-tight` (was `text-lg font-semibold`). Leave week/hour rows as-is.
- [ ] **Step 3:** Verify nothing else changed: `pnpm test && pnpm exec tsc --noEmit` → PASS (no behavioral tests break).
- [ ] **Step 4: Commit** — `git add src/components/booking/BookingWidget.tsx && git commit -m "feat(booking): polish booking card to rounded-2xl with prominent price"`

---

## Task 3: Compose OwnerCard + gallery polish on the listing page

**Files:**
- Modify: `src/app/(public)/[city]/[seg]/[sub]/page.tsx`

- [ ] **Step 1: Compute hours text** — the provider page already derives an `hoursText` from `workHoursJson` (either `{text}` or a `Record<period, hours>`); reuse the same logic (extract a tiny local helper or inline) to pass to `OwnerCard`. Import `OwnerCard`.
- [ ] **Step 2: Render `OwnerCard`** in `ListingPage`'s left column, right under the title/description and above the «Занятость» calendar section:

```tsx
<div className="mt-5">
  <OwnerCard
    name={provider.name}
    href={`/${city.slug}/${provider.slug}`}
    isVerified={provider.isVerified}
    address={provider.address}
    hoursText={hoursText}
  />
</div>
```

- [ ] **Step 3: Gallery polish** — change the gallery placeholder and photo tiles from `rounded-lg` to `rounded-2xl` (the empty-state block and each photo `div`).
- [ ] **Step 4: Typecheck + dev sanity** — `pnpm exec tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** — `git add "src/app/(public)/[city]/[seg]/[sub]/page.tsx" && git commit -m "feat(listing): owner card and rounded-2xl gallery on listing page"`

---

## Task 4: Verification pass (presentation + contacts-after-confirm check)

**Files:** none (verification only). REQUIRED SKILL: use the `verify` / run-the-app step.

- [ ] **Step 1:** DB up, `pnpm dev`; open a listing page (e.g. `/kazan/<provider>/<listing>` — pick a real seeded slug from the catalog).
- [ ] **Step 2:** Owner block renders with the provider name (linked) and, for a seeded verified provider, the «Проверен» badge; gallery and booking card are `rounded-2xl`; the day price is prominent.
- [ ] **Step 3:** Desktop: booking card sticks on scroll. Mobile (375px): the fixed bottom bar shows price + «Забронировать» and does not cover the last content (page has `pb-24`); dates/qty are reachable in the stacked card.
- [ ] **Step 4:** Light + dark: card shadow/border, verified pill, price, and bottom bar are all legible; green accents AA.
- [ ] **Step 5: Contacts-after-confirmation check (verify existing flow, do not build):** confirm the already-shipped flow reveals the counterpart's contacts once a request is `confirmed` (buyer `/requests` and/or the owner cabinet). If it does **not**, stop and report — that is a gap to schedule, not silently fix here.
- [ ] **Step 6:** Full suite green: `pnpm test && pnpm exec tsc --noEmit`.
- [ ] **Step 7 (DoD):** Phase 4 done when the listing page shows the polished card + gallery + owner block with badge, the existing sticky/bottom-bar booking still works, and everything passes in both themes and viewports.

---

## After Phase 4

Next: **Phase 5 — Unified «Кабинет»** (merge `(me)` into one `AccountShell`-tabbed account: Мои заявки / Мои объявления (+create here) / Заявки на мои вещи / Календарь / Профиль+настройки; remove the duplicate create route and `cabinet/stats`). Write that plan only once Phase 4 is DoD-green.
