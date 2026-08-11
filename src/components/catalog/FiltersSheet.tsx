"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalTitle, ModalTrigger } from "@/components/ui/Modal";

// Мобильная «шторка» фильтров: кнопка «Фильтры» открывает лист снизу с формой
// (children). Десктоп рендерит фильтры инлайн и эту обёртку не использует.
// Окно то же самое, что у входа и заявки на бронь, — общий примитив Modal.
export function FiltersSheet({ children }: { children: React.ReactNode }) {
  return (
    <Modal>
      <ModalTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
          Фильтры
        </Button>
      </ModalTrigger>
      <ModalContent aria-describedby={undefined}>
        <ModalTitle className="sr-only">Фильтры</ModalTitle>
        {children}
      </ModalContent>
    </Modal>
  );
}
