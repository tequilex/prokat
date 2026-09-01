// «Печатает…». Включить его до появления канала реального времени нечем —
// проп `typing` в ThreadView всегда false. Компонент сделан заранее сознательно,
// чтобы к задаче о вебсокетах не возвращаться в вёрстку; проп прокинут насквозь
// и покрыт тестом, иначе компонент к тому моменту разойдётся с реальностью.

import { content } from "@theme/content";

export function TypingIndicator({ name }: { name: string | null }) {
  return (
    <li className="flex items-center gap-2" role="status">
      <span className="flex items-center gap-1 rounded-pill bg-muted px-3 py-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-[5px] w-[5px] rounded-pill bg-muted-foreground motion-safe:animate-chat-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">
        {name ? `${name} ${content.chat.typing}` : content.chat.typing}
      </span>
    </li>
  );
}
