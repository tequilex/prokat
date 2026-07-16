import type { Category } from "@/server/catalog";

// Позиция вешается на «лист» дерева категорий: подкатегорию, либо корневую
// без детей. Подпись подкатегории включает родителя («Инструмент → Электро...»).
export function leafCategories(cats: Category[]): Array<{ id: string; name: string }> {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const hasChildren = new Set(cats.filter((c) => c.parentId !== null).map((c) => c.parentId as string));
  return cats
    .filter((c) => !hasChildren.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.parentId ? `${byId.get(c.parentId)?.name ?? ""} → ${c.name}` : c.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
