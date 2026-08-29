"use client";

import { ChevronRight } from "lucide-react";
import { Modal, ModalContent, ModalTitle, ModalTrigger } from "@/components/ui/Modal";

// Мобильный выбор категории: кнопка с текущим разделом открывает лист снизу с
// деревом (children). Десктоп показывает дерево в боковой панели и эту обёртку
// не использует. Окно — общий примитив Modal, тот же, что у фильтров и входа.
export function CategorySheet({
  label, children,
}: {
  /** Текущий раздел — он же подпись на кнопке. */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Modal>
      <ModalTrigger asChild>
        <button
          type="button"
          className="surface flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
        >
          <span className="shrink-0 text-muted-foreground">Категория</span>
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate font-medium text-foreground">{label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </span>
        </button>
      </ModalTrigger>
      <ModalContent aria-describedby={undefined}>
        <ModalTitle className="mb-3 text-lg font-bold">Категории</ModalTitle>
        {children}
      </ModalContent>
    </Modal>
  );
}
