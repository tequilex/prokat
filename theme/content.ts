const SITE_CONTACT_EMAIL = "test@mail.ru";

export const content = {
  site: {
    name: "inrenta",
    shortName: "inrenta",
    tagline: "Арендуй что угодно рядом — или сдавай своё",
    description:
      "Аренда вещей между людьми. Любой размещает свои вещи и бронирует чужие — сервис сводит людей и ведёт заявки на бронь.",
    contactEmail: SITE_CONTACT_EMAIL,
  },
  nav: {
    home: "Главная",
    login: "Войти",
    place: "Разместить",
    search: "Найти",
    searchPlaceholder: "Что арендуем?",
    city: "Город",
    allCities: "Все города",
  },
  home: {
    heroTitle: "Арендуй, а не покупай",
    heroSubtitle: "Рядом и в удобное для тебя время",
    heroSearchPlaceholder: "Что хотите арендовать?",
    categoriesHeading: "Популярные категории",
    howHeading: "Как это работает",
    howSteps: [
      { title: "Найдите нужное", text: "Ищите вещи рядом с вами по категориям или через поиск." },
      { title: "Отправьте заявку", text: "Выберите даты и отправьте заявку владельцу — ни к чему не обязывает." },
      { title: "Заберите и пользуйтесь", text: "Владелец подтверждает бронь, вы договариваетесь и забираете." },
    ] as { title: string; text: string }[],
    bandTitle: "Есть что сдать в аренду?",
    bandText: "Разместите за пару минут и зарабатывайте на простое вещей.",
    bandCta: "Разместить",
    whyHeading: "Почему это удобно",
    whyItems: [
      { title: "Проверенные люди", text: "Продавцы проходят проверку — значок «Проверен» рядом с профилем." },
      { title: "Рядом с вами", text: "Берите вещи у соседей — забрать проще, чем ехать в магазин." },
      { title: "Дешевле покупки", text: "Аренда в разы дешевле, чем покупать вещь ради пары раз." },
      { title: "Удобное время", text: "Договаривайтесь напрямую и забирайте в удобные вам часы." },
      { title: "Напрямую между людьми", text: "Без лишних посредников — общаетесь с владельцем сами." },
      { title: "Меньше вещей — больше пользы", text: "Одна вещь служит многим. Это разумно и бережёт ресурсы." },
    ] as { title: string; text: string }[],
  },
  auth: {
    loginTitle: "Войти",
    loginSubtitle: "Выберите сервис для входа",
    noProviders: "OAuth-провайдеры не настроены. Заполните CLIENT_ID/SECRET в .env.",
    signOut: "Выйти",
    chooseUsername: "Выбери ник",
    welcomeTitle: "Придумайте username",
    welcomeHint: "3–20 символов: латиница, цифры, _ и -. Это часть адреса вашего профиля.",
    welcomeSubmit: "Сохранить",
    errorFormat: "Неправильный формат username",
    errorReserved: "Этот username зарезервирован",
    errorTaken: "Этот username уже занят",
    backToHome: "На главную",
  },
  footer: {
    about: "Аренда вещей у людей рядом. Берите у соседей вместо того, чтобы покупать.",
    disclaimer: "Используем cookies и Яндекс.Метрика для аналитики.",
    privacyLink: "Политика",
    themeLabel: "Тема",
    // Только существующие разделы: страниц «О проекте», «Правила» и «Контакты»
    // в проекте нет, и ссылки на них вели в 404.
    columns: [
      {
        title: "аренда",
        links: [
          { label: "Найти вещь", href: "/search" },
          { label: "Как это работает", href: "/#how" },
        ],
      },
      {
        title: "владельцам",
        links: [
          { label: "Разместить вещь", href: "/cabinet/listings/new" },
          { label: "Мои вещи", href: "/cabinet/listings" },
          { label: "Входящие заявки", href: "/cabinet/requests" },
        ],
      },
      {
        title: "поддержка",
        links: [
          { label: "Политика", href: "/privacy" },
          { label: "Написать нам", href: `mailto:${SITE_CONTACT_EMAIL}` },
        ],
      },
    ] as { title: string; links: { label: string; href: string }[] }[],
  },
  banned: {
    heading: "Ваша учётная запись заблокирована",
    reasonLabel: "Причина:",
    noReason: "Причина не указана.",
    contact: `Для подробной информации напишите: ${SITE_CONTACT_EMAIL}`,
    logout: "Выйти",
  },
  privacy: {
    title: "Политика конфиденциальности",
    intro: "Этот сайт — сервис аренды вещей между людьми. Ниже описано, какие данные собираем и зачем.",
    section: {
      whoWeAre: "Кто мы",
      whoWeAreBody: `Независимый проект — сервис аренды вещей между людьми. По вопросам обработки персональных данных пишите на ${SITE_CONTACT_EMAIL}.`,
      whatWeCollect: "Какие данные собираем",
      whatWeCollectBody:
        "Email и публичный профиль (имя, никнейм, аватар) при входе через OAuth-провайдеры (Yandex, VK). Данные, которые вы указываете в заявках на бронь (телефон, комментарий). Технические данные через Яндекс.Метрика — IP, User-Agent, путь, реферер, длительность сессии (без webvisor).",
      cookies: "Cookies",
      cookiesBody:
        "Используем cookies для авторизации (next-auth) и Яндекс.Метрика (anonymous-ID, рекламные cookies не ставим).",
      delete: "Как удалить аккаунт",
      deleteBody: `Чтобы удалить аккаунт, напишите на ${SITE_CONTACT_EMAIL} — удалим в течение 7 дней.`,
      contact: "Контакты",
    },
    contact: `По вопросам обработки данных пишите: ${SITE_CONTACT_EMAIL}`,
    updatedAt: "Обновлено: 2026-07-15",
  },
  copyright: `© ${new Date().getFullYear()} inrenta`,
} as const;

export type ContentSchema = typeof content;
