import { EmptyState } from "prokat";

// Пустое состояние: знак-скобки и строка объяснения по центру отведённого места.
// Высота задаётся через className там, где блок идёт под шапкой раздела.

export const NothingFound = () => (
  <EmptyState className="min-h-[220px]">Ничего не найдено по запросу «сапборд».</EmptyState>
);

export const NoRequests = () => (
  <EmptyState className="min-h-[220px]">
    Пока нет заявок. Найдите нужную вещь в каталоге и выберите даты.
  </EmptyState>
);

export const Compact = () => (
  <EmptyState className="min-h-[140px]">У продавца пока нет активных объявлений.</EmptyState>
);
