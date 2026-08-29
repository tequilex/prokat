// Фильтры листинга. GET-форма: SSR перечитывает searchParams, клиентский JS
// нужен только слайдеру цены (PriceRange). Чипы и тумблер — обычные radio и
// checkbox с sr-only вводом, поэтому выбор переживает отключённый JS, а
// применяется он кнопкой «Показать N», а не на каждый клик.
//
// На мобиле форма прячется в bottom-sheet (FiltersSheet), выбор раздела — в
// отдельную шторку (CategorySheet).

import Link from "next/link";
import { Banknote, FileText, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiltersSheet } from "@/components/catalog/FiltersSheet";
import { CategorySheet } from "@/components/catalog/CategorySheet";
import { PriceRange } from "@/components/catalog/PriceRange";

export interface FilterState {
  priceMin?: number;
  priceMax?: number;
  deposit?: string;
  verifiedOnly?: boolean;
  sort?: string;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <legend className="mb-2 font-mono text-micro uppercase tracking-mono text-muted-foreground">
      {children}
    </legend>
  );
}

// Чип-переключатель на radio: без JS, состояние рисуется через peer-checked.
function Chip({
  name, value, checked, disabled, icon, children,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs transition-colors
        ${disabled
          ? "cursor-not-allowed border-border bg-background text-muted-foreground opacity-50"
          : "cursor-pointer border-border bg-background text-muted-foreground hover:text-foreground has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent"}`}
    >
      <input
        type="radio" name={name} value={value} defaultChecked={checked} disabled={disabled}
        className="sr-only"
      />
      {icon}
      {children}
    </label>
  );
}

function FormInner({
  basePath, state, hidden, priceBounds,
}: {
  basePath: string;
  state: FilterState;
  hidden?: Record<string, string>;
  priceBounds?: { min: number; max: number };
}) {
  const hiddenEntries = Object.entries(hidden ?? {}).filter(([, v]) => v !== "");
  // «Сбросить» очищает только фильтры этой панели (цена, залог, проверенные).
  // Контекст поиска и состояние верхней панели — вид, даты, сортировка —
  // переносятся скрытыми полями: форма GET, и в адрес попадает ровно то, что
  // она отправила. Без них сабмит фильтров сбрасывал бы список обратно в сетку
  // и терял выбранный диапазон дат.
  const resetQs = new URLSearchParams(hiddenEntries).toString();
  const resetHref = resetQs ? `${basePath}?${resetQs}` : basePath;

  // Ключ по применённым фильтрам — иначе «Сбросить» ничего не сбрасывает.
  // Переход клиентский, React переиспользует ту же форму, а поля тут
  // неуправляемые (defaultChecked/defaultValue) и слайдер держит значения в
  // useState: и то, и другое читается только при монтировании. Смена ключа
  // заставляет форму перемонтироваться и перечитать состояние из адреса.
  const stateKey = [
    state.priceMin, state.priceMax, state.deposit, state.verifiedOnly, state.sort,
  ].join("|");

  return (
    <form key={stateKey} method="GET" action={basePath} className="flex flex-col gap-4">
      {hiddenEntries.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {/* Секции цены нет, когда фильтровать не по чему: в разделе одна цена
        * (минимум равен максимуму) или суточных цен нет вовсе. Такой фильтр
        * может вернуть только «всё» или «ничего». Раньше здесь показывались
        * поля «от/до» — из-за них в проекте было два разных ввода цены,
        * и какой ты увидишь, зависело от содержимого раздела. */}
      {priceBounds && (
        <>
          <fieldset className="border-0 p-0">
            <SectionLabel>Цена в сутки</SectionLabel>
            <PriceRange
              min={priceBounds.min}
              max={priceBounds.max}
              valueMin={state.priceMin}
              valueMax={state.priceMax}
            />
          </fieldset>

          <hr className="border-border" />
        </>
      )}

      <fieldset className="border-0 p-0">
        <SectionLabel>Залог</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Chip name="deposit" value="money" checked={state.deposit === "money"}
            icon={<Banknote className="h-3 w-3 shrink-0" aria-hidden="true" />}>
            Деньги
          </Chip>
          <Chip name="deposit" value="document" checked={state.deposit === "document"}
            icon={<FileText className="h-3 w-3 shrink-0" aria-hidden="true" />}>
            Документы
          </Chip>
          <Chip name="deposit" value="none" checked={state.deposit === "none"}
            icon={<Ban className="h-3 w-3 shrink-0" aria-hidden="true" />}>
            Без залога
          </Chip>
        </div>
      </fieldset>

      <hr className="border-border" />

      {/* Как забрать: разметка есть, отбирать не по чему — в listings нет поля
        * способа получения. Блок намеренно неактивен, чтобы не притворяться
        * рабочим фильтром; причина и цена вопроса — в docs/BACKLOG.md. */}
      <fieldset className="border-0 p-0">
        <SectionLabel>Как забрать</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Chip name="pickup" value="any" checked disabled>Любой</Chip>
          <Chip name="pickup" value="self" checked={false} disabled>Самовывоз</Chip>
          <Chip name="pickup" value="delivery" checked={false} disabled>Доставка</Chip>
        </div>
      </fieldset>

      <hr className="border-border" />

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox" name="verified" value="1"
          defaultChecked={state.verifiedOnly ?? false}
          className="peer sr-only"
        />
        {/* Тумблер на checkbox, без JS. Бегунок двигается через
          * peer-checked:[&>span], а не просто peer-checked: последний
          * разворачивается в селектор СОСЕДА инпута, а бегунок лежит внутри
          * дорожки — правило до него не достаёт. */}
        <span className="relative h-6 w-10 shrink-0 rounded-pill bg-foreground/20 transition-colors peer-checked:bg-accent peer-checked:[&>span]:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-pill bg-card transition-transform" />
        </span>
        <span className="text-sm text-foreground">Только проверенные</span>
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" className="flex-1">Показать</Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={resetHref as never}>Сбросить</Link>
        </Button>
      </div>
    </form>
  );
}

export function ListingFilters({
  basePath, state, hidden, categoryNav, categoryLabel, priceBounds,
}: {
  basePath: string;
  state: FilterState;
  // Доп. GET-параметры (q, city), которые надо сохранить при сабмите формы.
  hidden?: Record<string, string>;
  // Дерево категорий. Каталог его передаёт, /search — нет: там раздел не
  // выбирают, поиск идёт по всему городу.
  categoryNav?: React.ReactNode;
  // Текущий раздел — подпись на мобильной кнопке, открывающей дерево.
  categoryLabel?: string;
  priceBounds?: { min: number; max: number };
}) {
  const form = (
    <FormInner
      basePath={basePath}
      state={state}
      hidden={hidden}
      priceBounds={priceBounds}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: раздел и фильтры — две отдельные шторки. Держать дерево
        * категорий внутри формы фильтров нельзя: выбор раздела это переход по
        * ссылке, а не поле, и он бы терял несохранённый ввод формы. */}
      <div className="flex flex-col gap-3 md:hidden">
        {categoryNav && categoryLabel && (
          <CategorySheet label={categoryLabel}>{categoryNav}</CategorySheet>
        )}
        <FiltersSheet>{form}</FiltersSheet>
      </div>

      {/* Desktop: единая плавающая панель — дерево категорий и фильтры под ним. */}
      <div className="surface hidden flex-col md:flex">
        {categoryNav && (
          <>
            <div className="p-2">{categoryNav}</div>
            <hr className="border-border" />
          </>
        )}
        <div className="p-4">{form}</div>
      </div>
    </div>
  );
}
