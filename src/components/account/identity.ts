// Кто стоит в шапке личной зоны. Собирает getCabinetIdentity (src/server/me.ts),
// потребляют герой кабинета, мобильный хаб и AccountShell. Живёт отдельным
// модулем, чтобы серверные layout'ы не импортировали клиентский AccountShell
// ради одного типа.

export interface AccountIdentity {
  name: string | null;
  email: string;
  image: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  activeListings: number;
  deals: number;
  /** Подтверждённые брони на мои вещи, которые ещё не закончились. */
  upcomingBookings: number;
  /** Мои заявки как арендатора, ждущие ответа владельца. */
  pendingMine: number;
}
