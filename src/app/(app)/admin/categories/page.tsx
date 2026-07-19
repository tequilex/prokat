import type { Metadata } from "next";
import { adminListCategories } from "@/server/admin";
import { adminDeleteCategory } from "@/server/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Категории — админка", robots: { index: false } };

export default async function AdminCategoriesPage() {
  const rows = await adminListCategories();
  const roots = rows.filter((r) => r.category.parentId === null);
  const byParent = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.category.parentId) continue;
    const list = byParent.get(r.category.parentId) ?? [];
    list.push(r);
    byParent.set(r.category.parentId, list);
  }

  const Row = ({ r, depth }: { r: (typeof rows)[number]; depth: number }) => (
    <li
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
      style={{ marginLeft: depth * 24 }}
    >
      <div>
        <span className="font-medium">{r.category.name}</span>
        <p className="text-sm text-muted-foreground">
          /{r.category.slug}
          {r.category.vertical ? ` · ${r.category.vertical}` : ""}
          {" · "}{r.listingCount} позиций
        </p>
      </div>
      {r.listingCount === 0 && r.childCount === 0 && (
        <ActionButton
          label="Удалить"
          confirmText={`Удалить категорию «${r.category.name}»?`}
          variant="ghost"
          action={adminDeleteCategory.bind(null, r.category.id)}
        />
      )}
    </li>
  );

  return (
    <section aria-label="Категории" className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Добавить категорию</h2>
        <CategoryForm roots={roots.map((r) => ({ id: r.category.id, name: r.category.name }))} />
      </div>

      <ul className="flex flex-col gap-2">
        {roots.flatMap((root) => [
          <Row key={root.category.id} r={root} depth={0} />,
          ...(byParent.get(root.category.id) ?? []).map((child) => (
            <Row key={child.category.id} r={child} depth={1} />
          )),
        ])}
      </ul>
    </section>
  );
}
