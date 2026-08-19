import { Modal, ModalContent, ModalTitle, ModalDescription, Button } from "prokat";

// Единственный примитив всплывающих окон: на мобиле лист снизу, на десктопе
// центрированное окно. Брейкпоинт берётся CSS'ом, а не измерением в JS.
// open={true} — карточка показывает открытое состояние.

export const Booking = () => (
  <Modal open>
    <ModalContent className="md:max-w-md">
      <ModalTitle className="font-display text-xl">Заявка на бронь</ModalTitle>
      <ModalDescription className="mt-1 text-sm text-muted-foreground">
        Перфоратор Bosch: 24 — 26 августа · ≈ 1 350 ₽
      </ModalDescription>
      <div className="mt-5 flex flex-col gap-3">
        <Button className="w-full">Отправить заявку</Button>
        <p className="text-xs text-muted-foreground">
          Оплата и залог — напрямую с владельцем, сервис платежи не проводит.
        </p>
      </div>
    </ModalContent>
  </Modal>
);
