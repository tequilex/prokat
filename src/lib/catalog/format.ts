import { ruPlural } from "@/lib/plural";

// 1500 -> "1 500 ₽" (неразрывные пробелы в числе и перед ₽).
export function formatPrice(rub: number): string {
  const grouped = new Intl.NumberFormat("ru-RU").format(rub);
  return `${grouped} ₽`;
}

export function formatDeposit(type: "money" | "document" | "none", amount: number | null): string {
  if (type === "none") return "без залога";
  if (type === "document") return "залог: документ";
  return amount ? `залог ${formatPrice(amount)}` : "залог";
}

// Строка способа получения для «Условий аренды» — готовая фраза, а не значение
// к подписи: она стоит в списке рядом с фразами про оплату и залог.
// Ни одного способа быть не должно (validation.ts этого не пропустит), но
// колонки живут в БД и правятся не только формой, поэтому случай назван вслух,
// а не выдаёт «только самовывоз» за отсутствие данных.
export function formatHandover(pickup: boolean, delivery: boolean): string {
  if (pickup && delivery) return "Самовывоз или доставка — как договоритесь с владельцем.";
  if (pickup) return "Только самовывоз — забираете сами.";
  if (delivery) return "Только доставка — владелец привезёт сам.";
  return "Способ получения — по договорённости с владельцем.";
}

export function listingsCountLabel(n: number): string {
  return `${n} ${ruPlural(n, "позиция", "позиции", "позиций")}`;
}

export function ownersCountLabel(n: number): string {
  return `${n} ${ruPlural(n, "продавец", "продавца", "продавцов")}`;
}
