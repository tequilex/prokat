// Поле «Как вас увидят покупатели» из формы размещения. Разбирается отдельно от
// listingFormSchema: та описывает товар, а это поле правит users.name.
//
// Пустое значение — не ошибка, а «оставить имя как есть»: у большинства оно уже
// заполнено (при регистрации почтой обязательно, у OAuth приходит от провайдера),
// и человек просто не трогал поле.

export const SELLER_NAME_MAX = 100;

export type SellerNameResult =
  | { ok: true; name: string | null }
  | { ok: false; error: string };

export function parseSellerName(input: unknown): SellerNameResult {
  const raw = (input as { sellerName?: unknown } | null)?.sellerName;
  if (typeof raw !== "string") return { ok: true, name: null };

  const name = raw.trim();
  if (name.length === 0) return { ok: true, name: null };
  if (name.length > SELLER_NAME_MAX) {
    return { ok: false, error: `Имя длиннее ${SELLER_NAME_MAX} символов` };
  }
  return { ok: true, name };
}
