"use client";

// Всплывашки. Отдельным компонентом от провайдера, потому что Toaster обязан
// стоять в дереве один раз, а провайдер держит соединение — смешивать
// ответственности незачем.
//
// Цвета берутся из наших токенов, а не из палитры sonner: библиотека
// стилизуется CSS-переменными на [data-sonner-toaster], и своя тёмная тема у
// неё разъехалась бы с нашей на переключении.

import { Toaster } from "sonner";

export function RealtimeToaster() {
  return (
    <Toaster
      position="top-right"
      // Справа сверху на десктопе, но на мобиле снизу правый угол занят
      // таб-баром — сдвигаем поднятием: offset учитывает --tabbar-h.
      offset={16}
      // Не трогаем richColors: цвета у нас свои, токенами.
      toastOptions={{
        classNames: {
          toast: "surface !bg-card !text-foreground !border-border",
          title: "!font-medium",
          description: "!text-muted-foreground",
          actionButton: "!bg-accent !text-accent-foreground",
        },
      }}
    />
  );
}
