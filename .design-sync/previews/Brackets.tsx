import { Brackets } from "prokat";

// Служебный знак проекта: пустые скобки. Отличается от логотипа пропорциями —
// толще штрих, шире вылет и зазор, чтобы читаться отдельно от бренда.

export const Sizes = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
    <Brackets size={16} />
    <Brackets size={24} />
    <Brackets size={36} />
    <Brackets size={56} />
  </div>
);

export const Waiting = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
    <Brackets size={36} running />
    <span className="text-sm text-muted-foreground">
      running — между скобками ходит блик, скобка подаётся в сторону
    </span>
  </div>
);

export const OnColor = () => (
  <div style={{ display: "flex", gap: 16 }}>
    <span className="flex h-14 w-24 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <Brackets size={22} className="text-current" />
    </span>
    <span className="flex h-14 w-24 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Brackets size={22} className="text-current" />
    </span>
  </div>
);
