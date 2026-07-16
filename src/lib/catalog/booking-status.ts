// Статусная машина заявки на бронь. Единственный источник правды о том,
// какие переходы допустимы и как статус влияет на bookedQty в availability.
//
//   new ──confirm──▶ confirmed ──▶ completed | no_show
//    │                   │
//    ├─▶ declined        └─▶ cancelled (освобождает даты)
//    ├─▶ expired (авто, по expires_at)
//    └─▶ cancelled

export type BookingStatus =
  | "new" | "confirmed" | "declined" | "expired"
  | "completed" | "no_show" | "cancelled";

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  new: ["confirmed", "declined", "expired", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  declined: [],
  expired: [],
  completed: [],
  no_show: [],
  cancelled: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: BookingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

// Только confirmed-заявка держит единицы в availability.
export function holdsAvailability(status: BookingStatus): boolean {
  return status === "confirmed";
}

// Знак изменения bookedQty при переходе: +1 — занять даты, -1 — освободить, 0 — ничего.
// completed/no_show даты не освобождают: диапазон уже прожит, история занятости честная.
export function availabilityDelta(from: BookingStatus, to: BookingStatus): -1 | 0 | 1 {
  if (!canTransition(from, to)) throw new Error(`illegal transition: ${from} -> ${to}`);
  if (!holdsAvailability(from) && holdsAvailability(to)) return 1;
  if (holdsAvailability(from) && to === "cancelled") return -1;
  return 0;
}
