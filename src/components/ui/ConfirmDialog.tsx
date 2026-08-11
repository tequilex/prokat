"use client";

import { useState, useId } from "react";
import { Modal, ModalClose, ModalContent, ModalDescription, ModalTitle, ModalTrigger } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";

type Props = {
  trigger: React.ReactNode;
  title: string;
  description: string;
  typedConfirm?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  trigger, title, description, typedConfirm, confirmLabel, destructive, onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  const canConfirm = typedConfirm ? input === typedConfirm : true;

  const handle = async () => {
    setBusy(true);
    try { await onConfirm(); setOpen(false); setInput(""); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onOpenChange={(v) => { setOpen(v); if (!v) setInput(""); }}>
      <ModalTrigger asChild>{trigger}</ModalTrigger>
      <ModalContent className="md:w-[min(90vw,420px)]">
          <ModalTitle className="font-display text-lg mb-2">{title}</ModalTitle>
          <ModalDescription className="text-sm text-muted-foreground mb-4">
            {description}
          </ModalDescription>
          {typedConfirm && (
            <div className="mb-4">
              <label htmlFor={inputId} className="block text-xs text-muted-foreground mb-1">
                Введи <code>{typedConfirm}</code> для подтверждения
              </label>
              <input
                id={inputId}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="outline" type="button">Отмена</Button>
            </ModalClose>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={!canConfirm}
              pending={busy}
              onClick={handle}
            >
              {confirmLabel}
            </Button>
          </div>
      </ModalContent>
    </Modal>
  );
}
