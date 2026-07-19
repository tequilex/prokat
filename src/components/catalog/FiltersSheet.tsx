"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetTrigger, SheetContent, SheetTitle,
} from "@/components/ui/sheet";

// Мобильная «шторка» фильтров: кнопка «Фильтры» открывает bottom-sheet с формой
// (children). Десктоп рендерит фильтры инлайн и эту обёртку не использует.
export function FiltersSheet({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
          Фильтры
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetTitle className="sr-only">Фильтры</SheetTitle>
        <div className="max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
