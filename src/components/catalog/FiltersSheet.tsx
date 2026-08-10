"use client";

import { useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetTrigger, SheetContent, SheetTitle,
} from "@/components/ui/sheet";

// Мобильная «шторка» фильтров: кнопка «Фильтры» открывает bottom-sheet с формой
// (children). Десктоп рендерит фильтры инлайн и эту обёртку не использует.
export function FiltersSheet({ children }: { children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
          Фильтры
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        // Radix по умолчанию фокусирует первый интерактивный элемент, а это поле
        // «цена от» — iOS тут же поднимает клавиатуру поверх шторки. Фокус
        // уводим на саму панель: ловушка фокуса продолжает работать.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          panelRef.current?.focus();
        }}
      >
        <SheetTitle className="sr-only">Фильтры</SheetTitle>
        <div
          ref={panelRef}
          tabIndex={-1}
          className="max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] outline-none"
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
