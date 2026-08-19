import { Button } from "prokat";

// Закон цвета: зелёный = действие, охра = предмет и состояние, серый —
// служебное, красный — отмена и спор. Если элемент нельзя нажать, он не зелёный.

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button>Забронировать</Button>
    <Button variant="outline">Отмена</Button>
    <Button variant="ghost">Подробнее</Button>
    <Button variant="destructive">Отклонить</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button size="sm">Показать</Button>
    <Button>Отправить заявку</Button>
  </div>
);

export const Pending = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button pending>Отправляем</Button>
    <Button variant="outline" pending>Проверяем</Button>
  </div>
);

export const Disabled = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button disabled>Выберите даты</Button>
    <Button variant="outline" disabled>Недоступно</Button>
  </div>
);
