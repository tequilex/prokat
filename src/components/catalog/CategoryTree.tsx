// Навигация по категориям в панели каталога. Серверный компонент: раскрытие
// длинного хвоста сделано на <details>, поэтому дерево работает без клиентского
// JS и целиком попадает в SSR-разметку — как и остальной каталог.
//
// Показываем текущую ветку, а не всё дерево сразу: внутри раздела это его
// подкатегории, на витрине города — список разделов. Иначе панель превращается
// в простыню из всех подкатегорий всех разделов.
//
// Уровня ровно два (корень → подкатегория): третьего сегмента у маршрута
// /{city}/{seg}/{sub} нет, см. buildCategoryTree().

import Link from "next/link";
import { ChevronDown, ChevronLeft } from "lucide-react";
import type { CategoryNode } from "@/server/catalog";

// Сколько подкатегорий показываем до того, как остальные уедут под «Ещё N».
const VISIBLE_CHILDREN = 8;

function Row({
  href, name, count, active, bold,
}: {
  href: string;
  name: string;
  count: number;
  active?: boolean;
  bold?: boolean;
}) {
  return (
    <Link
      href={href as never}
      // Активная ветка помечена охрой: по закону цвета зелёный означает
      // действие, а «где я сейчас» — состояние, а не кнопка.
      className={`flex items-center justify-between gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : bold
            ? "font-semibold text-foreground hover:bg-muted"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="min-w-0 truncate">{name}</span>
      <span className="shrink-0 font-mark text-xs text-muted-foreground">{count}</span>
    </Link>
  );
}

export function CategoryTree({
  tree, citySlug, activeRootSlug, activeSubSlug,
}: {
  tree: CategoryNode[];
  citySlug: string;
  /** Корень текущей страницы. Без него это витрина города — список разделов. */
  activeRootSlug?: string;
  activeSubSlug?: string;
}) {
  const root = activeRootSlug ? tree.find((r) => r.slug === activeRootSlug) : undefined;

  // Витрина города: разделы верхнего уровня, возвращаться некуда.
  if (!root) {
    return (
      <nav aria-label="Категории" className="flex flex-col gap-0.5">
        {tree.map((r) => (
          <Row key={r.id} href={`/${citySlug}/${r.slug}`} name={r.name} count={r.count} bold />
        ))}
      </nav>
    );
  }

  const rootHref = `/${citySlug}/${root.slug}`;
  const visible = root.children.slice(0, VISIBLE_CHILDREN);
  const hidden = root.children.slice(VISIBLE_CHILDREN);

  return (
    <nav aria-label="Категории" className="flex flex-col gap-0.5">
      <Link
        href={`/${citySlug}` as never}
        className="mb-1 inline-flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        Все категории
      </Link>

      <Row
        href={rootHref}
        name={root.name}
        count={root.count}
        bold
        active={!activeSubSlug}
      />

      {root.children.length > 0 && (
        <div className="flex flex-col gap-0.5 pl-3">
          {visible.map((c) => (
            <Row
              key={c.id}
              href={`${rootHref}/${c.slug}`}
              name={c.name}
              count={c.count}
              active={c.slug === activeSubSlug}
            />
          ))}

          {hidden.length > 0 && (
            // <details>, а не состояние в React: раскрытие остаётся рабочим без
            // клиентского JS, а активная подкатегория из хвоста открывает
            // список сама через open.
            <details open={hidden.some((c) => c.slug === activeSubSlug)}>
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-sm px-3 py-1.5 text-sm text-accent transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
                Ещё {hidden.length}
                <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </summary>
              <div className="flex flex-col gap-0.5">
                {hidden.map((c) => (
                  <Row
                    key={c.id}
                    href={`${rootHref}/${c.slug}`}
                    name={c.name}
                    count={c.count}
                    active={c.slug === activeSubSlug}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </nav>
  );
}
