import { PasswordInput } from "prokat";

// Поле пароля с глазком. Глазок появляется, только когда в поле что-то есть.
// Классы поля живут в формах (см. ui/field.ts) — здесь тот же набор.

const FIELD =
  "border border-border bg-background text-foreground focus-visible:[outline:none] " +
  "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset " +
  "h-11 w-full rounded-pill px-5";

export const Empty = () => (
  <label className="flex w-80 flex-col gap-1 text-sm">
    Пароль
    <PasswordInput className={FIELD} placeholder="Ваш пароль" />
  </label>
);

export const Filled = () => (
  <label className="flex w-80 flex-col gap-1 text-sm">
    Пароль
    <PasswordInput className={FIELD} defaultValue="sekretnyi-parol" />
  </label>
);

export const InCabinetForm = () => (
  <div className="flex w-80 flex-col gap-3">
    <label className="flex flex-col gap-1 text-sm">
      Текущий пароль
      <PasswordInput
        className={`${FIELD} rounded-md px-3`}
        defaultValue="staryi-parol"
        autoComplete="current-password"
      />
    </label>
    <label className="flex flex-col gap-1 text-sm">
      Новый пароль
      <PasswordInput
        className={`${FIELD} rounded-md px-3`}
        placeholder="Не короче 8 символов"
        autoComplete="new-password"
      />
    </label>
  </div>
);
