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

export function listingsCountLabel(n: number): string {
  return `${n} ${ruPlural(n, "позиция", "позиции", "позиций")}`;
}

export function ownersCountLabel(n: number): string {
  return `${n} ${ruPlural(n, "продавец", "продавца", "продавцов")}`;
}
