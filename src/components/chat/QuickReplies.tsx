// Быстрые ответы. Чип ПОДСТАВЛЯЕТ текст в черновик, а не отправляет: отправка
// в один тап необратима и тратит бакет chat_message.

import { content } from "@theme/content";

export function QuickReplies({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mb-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {content.chat.quickReplies.map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => onPick(text)}
          className="shrink-0 rounded-sm border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
