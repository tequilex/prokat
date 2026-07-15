const SITE_CONTACT_EMAIL = "test@mail.ru";

export const content = {
  site: {
    name: "Прокат",
    shortName: "Прокат",
    tagline: "Каталог прокатов: инструмент, спорт, платья, фототехника",
    description:
      "Сервис-каталог прокатов. Владельцы размещают позиции, клиенты находят их и оставляют заявки на бронь.",
    contactEmail: SITE_CONTACT_EMAIL,
  },
  nav: {
    home: "Главная",
    login: "Войти",
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
    about: "О проекте",
    rules: "Правила",
    contacts: "Контакты",
    disclaimer: "Используем cookies и Яндекс.Метрика для аналитики.",
    privacyLink: "Политика",
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
    intro: "Этот сайт — каталог прокатов. Ниже описано, какие данные собираем и зачем.",
    section: {
      whoWeAre: "Кто мы",
      whoWeAreBody: `Независимый проект-каталог прокатов. По вопросам обработки персональных данных пишите на ${SITE_CONTACT_EMAIL}.`,
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
  copyright: `© ${new Date().getFullYear()} Прокат`,
} as const;

export type ContentSchema = typeof content;
