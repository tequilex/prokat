// Коды отказов из server actions → текст для человека.
//
// Живёт отдельным модулем, потому что нужен с обеих сторон границы: страницы
// показывают им причину «писать нельзя», а клиентская лента — ошибку отправки.
// Раньше словарь был только на страницах, и в ленту падали коды латиницей.

import { ruPlural } from "@/lib/plural";

const TEXTS: Record<string, string> = {
  auth_required: "Войдите, чтобы написать.",
  banned: "Ваш аккаунт заблокирован, писать нельзя.",
  not_participant: "Вы не участник этой переписки.",
  own_listing: "Это ваше объявление — переписка с самим собой не заводится.",
  listing_not_found: "Объявление не найдено.",
  listing_not_active: "Объявление снято с публикации — история осталась, писать нельзя.",
  counterpart_banned: "Аккаунт собеседника заблокирован — история осталась, писать нельзя.",
  invalid_input: "Проверьте текст сообщения.",
};

const FALLBACK = "Не удалось отправить. Попробуйте ещё раз.";

function retryIn(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} ${ruPlural(minutes, "минуту", "минуты", "минут")}`;
  }
  return `${seconds} ${ruPlural(seconds, "секунду", "секунды", "секунд")}`;
}

export function chatErrorText(error: string): string {
  const known = TEXTS[error];
  if (known) return known;

  if (error.startsWith("rate_limited:")) {
    const seconds = Number.parseInt(error.slice("rate_limited:".length), 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return `Слишком часто. Повторите через ${retryIn(seconds)}.`;
    }
    return "Слишком часто. Попробуйте позже.";
  }

  // Сообщения валидации приходят из zod уже по-русски — отдаём как есть.
  // Всё прочее — служебный код, показывать его человеку незачем.
  return /[а-яё]/i.test(error) ? error : FALLBACK;
}
