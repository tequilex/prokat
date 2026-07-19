"use client";

// Универсальная кнопка админ-действия: принимает bound server action
// (fn без аргументов), опциональный confirm/prompt, показывает ошибку.

import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ActionButton({
  label, action, confirmText, promptText, variant = "outline", size = "sm",
}: {
  label: string;
  // bound server action; promptText → значение prompt передаётся аргументом
  action: ((value: string) => Promise<{ ok: boolean; error?: string }>) | (() => Promise<{ ok: boolean; error?: string }>);
  confirmText?: string;
  promptText?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    let value = "";
    if (promptText) {
      const v = window.prompt(promptText);
      if (v === null) return;
      value = v;
    } else if (confirmText && !window.confirm(confirmText)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await (action as (v?: string) => Promise<{ ok: boolean; error?: string }>)(
        promptText ? value : undefined,
      );
      if (!r.ok) setError(r.error ?? "Ошибка");
    });
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant={variant} size={size} pending={pending} onClick={onClick}>{label}</Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
