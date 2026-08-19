# inrenta UI Kit — как этим пользоваться

Компоненты C2C-сервиса аренды вещей (inrenta). Всё на React + Tailwind, стили — через
utility-классы и CSS-переменные из `styles.css`. Оборачивать в провайдер **не нужно**:
токены живут в `:root`, компоненты читают их сами.

## Тема

Светлая тема — по умолчанию, тёмная включается классом `dark` на любом предке
(обычно `<html class="dark">`). Все токены переопределены в `.dark`, поэтому один
и тот же разметочный код работает в обеих темах. Никогда не хардкодь цвет — бери токен.

## Закон цвета

Это главное правило системы, оно объясняет, почему кнопки разного цвета:

- **зелёный** (`bg-primary`, `text-primary`) — действие, то, что можно нажать;
- **охра** (`text-accent`, `border-accent`, `ring-ring`) — предмет и его состояние:
  занятость дат, фокус поля, служебный знак-скобки;
- **серый** (`text-muted-foreground`, `bg-muted`) — служебное и второстепенное;
- **красный** (`text-destructive`, `bg-destructive`) — отмена, отказ, спор.

Если элемент нельзя нажать — он не зелёный.

## Словарь классов

Цвета: `bg-background` `text-foreground` `bg-card` `text-card-foreground` `bg-primary`
`text-primary-foreground` `text-accent` `bg-muted` `text-muted-foreground` `border-border`
`focus-visible:ring-ring` `text-destructive` `bg-destructive`.

**Важно:** в макеты уезжает только скомпилированный CSS этого приложения — те утилиты,
которые в нём реально используются. Классы из этого словаря и из примеров ниже
гарантированно работают; редкие комбинации, которых в приложении нет, могут не дать
ничего. Сомневаешься — посмотри `styles.css` и `_ds_bundle.css`, там вся правда.

Скругления: `rounded-sm` `rounded-md` `rounded-lg` `rounded-pill` (пилюля — форма кнопок
и полей входа).

Шрифты: `font-display` (заголовки, Manrope) · `font-sans` (текст, Inter) ·
`font-mark` (знак и деньги, Space Grotesk) · `font-mono` (служебные капсы).

Две фирменные утилиты из `styles.css`: `.glass` — парящая полупрозрачная пилюля
шапки; `.surface` — плавающая карточка контента с мягкой двухслойной тенью.

## Поля ввода

Компонента-инпута в ките нет: поля — обычные `<input>`/`<select>`/`<textarea>` с общей
базой классов (охряное кольцо фокуса внутрь, чтобы не обрезалось краем окна):

```jsx
const FIELD = "border border-border bg-background text-foreground h-11 rounded-md px-3 " +
  "focus-visible:[outline:none] focus-visible:border-ring focus-visible:ring-1 " +
  "focus-visible:ring-ring focus-visible:ring-inset";
```

Исключение — `PasswordInput`: поле пароля с глазком, класс отдаётся тем же пропом
`className`.

## Пример

```jsx
<div className="surface flex flex-col gap-4 p-5">
  <h2 className="font-display text-lg font-bold">Заявка на бронь</h2>
  <p className="text-sm text-muted-foreground">Перфоратор Bosch · 24 — 26 августа</p>
  <label className="flex flex-col gap-1 text-sm">
    Телефон
    <input className={FIELD} placeholder="+7 900 000-00-00" />
  </label>
  <Button className="w-full">Отправить заявку</Button>
</div>
```

## Что стоит знать про отдельные компоненты

- **`Button`** — варианты `default | outline | ghost | destructive`, размеры
  `default | sm | icon`. Проп `pending` показывает бегущие скобки и блокирует кнопку;
  `asChild` оборачивает ссылку, но с `pending` не сочетается.
- **`Modal` / `ModalContent`** — единственный примитив окон: на мобиле лист снизу,
  на десктопе центрированное окно, брейкпоинт задан CSS'ом. Составные части:
  `ModalTrigger` `ModalTitle` `ModalDescription` `ModalClose`.
- **`Brackets`** — служебный знак: пустые скобки. `running` включает ожидание (между
  скобками ходит блик). Пустое состояние — `EmptyState`, там знак уже внутри.
- **`Stats`** — метрики кабинета; `accent: true` красит показатель охрой (про предмет).
- **`MiniCalendar` / `FullCalendar` / `BookingCalendar`** — занятость по дням; свободное
  и занятое различаются охрой, а не зелёным.
