import { ruPlural } from "@/lib/plural";
import { content } from "@theme/content";

// Единый источник навигации кабинета. Разделы сгруппированы по роли, в которой
// человек сейчас находится: «я арендую» и «мои вещи». Отдельной сущности
// «владелец» нет — обе группы доступны любому залогиненному юзеру.

// Иконка передаётся ключом, а не компонентом: навигацию собирает серверный
// layout, а функции через границу RSC не сериализуются. Словарь ключ → иконка
// живёт в AccountShell, на клиенте.
export type AccountNavIcon =
  | "summary" | "messages" | "notifications" | "requests" | "inbox"
  | "listings" | "calendar" | "profile";

export interface AccountNavItem {
  href: string;
  label: string;
  badge?: number;
  /** Спокойная подпись справа в мобильном хабе («3», «2 брони»). Бейдж — про
   *  то, что ждёт ответа; hint — про то, что просто есть. */
  hint?: string;
  icon?: AccountNavIcon;
  /** Совпадение только точное. Нужно там, где адрес — префикс соседних
   *  разделов: /cabinet иначе подсвечивался бы на всех страницах кабинета. */
  exact?: boolean;
}

export interface AccountNavGroup {
  title: string;
  items: AccountNavItem[];
}

export interface AccountNavCounts {
  newRequestsCount: number;
  /** Непрочитанные сообщения по всем переписками, обе роли сразу. */
  unreadMessages?: number;
  /** Непрочитанные уведомления. Считает НЕ то же, что unreadMessages:
   *  сообщения идут по штукам, уведомления схлопнуты по сущности. Рядом
   *  окажутся «Сообщения 7» и «Уведомления 2» — это не ошибка. */
  unreadNotifications?: number;
  /** Ниже — только для подписей мобильного хаба; в сайдбаре их не видно. */
  activeListings?: number;
  upcomingBookings?: number;
  pendingMine?: number;
}

export function buildAccountNav(
  {
    newRequestsCount, unreadMessages, unreadNotifications,
    activeListings, upcomingBookings, pendingMine,
  }: AccountNavCounts,
): AccountNavGroup[] {
  return [
    {
      // Переписка стоит здесь, а не в одной из ролевых групп: она идёт и по
      // своим вещам, и по чужим, делить её между «я арендую» и «мои вещи» нечем.
      title: "сейчас",
      items: [
        { href: "/cabinet", label: "Сводка", icon: "summary", exact: true },
        { href: "/chat", label: "Сообщения", badge: unreadMessages, icon: "messages" },
        // Ключ иконки свой, не "inbox": по нему AccountShell ищет счётчик
        // «ждут ответа» для шапки, и переиспользование увело бы туда уведомления.
        {
          href: "/notifications",
          label: content.notifications.navLabel,
          badge: unreadNotifications,
          icon: "notifications",
        },
      ],
    },
    {
      title: "мои вещи",
      items: [
        { href: "/cabinet/requests", label: "Заявки на мои вещи", badge: newRequestsCount, icon: "inbox" },
        {
          href: "/cabinet/listings",
          label: "Мои объявления",
          hint: activeListings ? String(activeListings) : undefined,
          icon: "listings",
        },
        {
          href: "/cabinet/calendar",
          label: "Календарь занятости",
          hint: upcomingBookings
            ? `${upcomingBookings} ${ruPlural(upcomingBookings, "бронь", "брони", "броней")}`
            : undefined,
          icon: "calendar",
        },
      ],
    },
    {
      title: "я арендую",
      items: [{
        href: "/requests",
        label: "Мои заявки",
        hint: pendingMine ? `${pendingMine} ${ruPlural(pendingMine, "ждёт", "ждут", "ждут")}` : undefined,
        icon: "requests",
      }],
    },
    {
      title: "аккаунт",
      items: [{ href: "/profile", label: "Профиль", icon: "profile" }],
    },
  ];
}
