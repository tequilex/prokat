"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Единственный примитив всплывающих окон в проекте: вход, заявка на бронь,
 * подтверждения, фильтры каталога. Раньше их было два — обычный диалог и
 * отдельная шторка, — и они успели разъехаться по виду и анимациям.
 *
 * Поведение: на мобиле лист снизу (туда дотягивается палец), на десктопе
 * центрированное окно. Брейкпоинт берём CSS'ом, а не измерением экрана в JS:
 * при серверном рендере ширины ещё нет, и окно моргало бы из центра вниз после
 * гидрации. Поворот экрана обрабатывается тем же способом сам собой. */

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;
export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;

export const ModalContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
    /** Крестик в углу. Убирается там, где закрывать окно должен только выбор. */
    showClose?: boolean;
  }
>(({ className, children, showClose = true, onOpenAutoFocus, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  // Свой ref нужен, чтобы увести фокус на само окно; наружный тоже сохраняем.
  const setRefs = React.useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [ref]);

  return (
  <Dialog.Portal>
    <Dialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/50",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      )}
    />
    <Dialog.Content
      ref={setRefs}
      tabIndex={-1}
      // Radix по умолчанию фокусирует первый интерактивный элемент — на iOS это
      // мгновенно поднимает клавиатуру поверх листа, ещё до того как человек
      // понял, что открылось. Фокус уводим на само окно: ловушка фокуса и
      // объявление скринридером продолжают работать, клавиатура молчит.
      onOpenAutoFocus={(e) => {
        onOpenAutoFocus?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        contentRef.current?.focus();
      }}
      className={cn(
        // Гасим системное кольцо: фокус сюда ставится программно (см.
        // onOpenAutoFocus), и браузер обводит весь лист — на iOS голубым.
        // Именно :focus, а не :focus-visible — фокус не от клавиатуры.
        // И именно [outline:none]: утилита outline-none разворачивается в
        // «outline: 2px solid transparent» с отступом, и эта прозрачная полоса
        // проступает по краю, пока лист анимируется.
        "fixed z-50 border border-border bg-card shadow-lg duration-200 focus:[outline:none]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        // Мобайл: лист снизу во всю ширину, с запасом под системную полосу
        // жестов. Высота ограничена, длинное содержимое прокручивается внутри.
        "inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-lg",
        "p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        // Величина сдвига обязательна: без неё утилита не генерирует ничего.
        "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full",
        // Десктоп: центрированное окно. Центруем через inset-0 + margin:auto,
        // а НЕ через translate(-50%,-50%): плагин анимаций на время проигрывания
        // подменяет весь transform своим, центрирующий сдвиг пропадает, и окно
        // прилетает в центр из правого нижнего угла.
        // Левый/правый/нижний нули уже заданы для мобилы, добавляем верхний —
        // и margin:auto центрует. md:inset-0 тут не подошёл бы: в собранном CSS
        // он идёт раньше bottom-0 и проиграл бы ему.
        "md:top-0 md:m-auto md:h-fit md:max-h-[85vh] md:w-[calc(100vw-2rem)]",
        "md:rounded-lg md:p-6",
        "md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95",
        "md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:slide-out-to-bottom-0",
        className,
      )}
      {...props}
    >
      {/* Ручка листа — подсказка «это шторка снизу». На десктопе не нужна.
        * TODO: смахивание вниз не реализовано, полоска пока чисто визуальная.
        * В iOS она означает «меня можно тянуть», так что либо доделать жест
        * (перетаскивание + закрытие по рывку, не ломая прокрутку содержимого;
        * проще всего через vaul), либо убрать полоску. */}
      <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-border md:hidden" />
      {children}
      {showClose && (
        <Dialog.Close
          aria-label="Закрыть"
          className="absolute right-3 top-3 rounded-sm p-1.5 text-muted-foreground transition-colors hoverable hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Dialog.Close>
      )}
    </Dialog.Content>
  </Dialog.Portal>
  );
});
ModalContent.displayName = "ModalContent";
