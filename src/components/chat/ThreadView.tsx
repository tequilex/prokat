"use client";

// Лента переписки и композер.
//
// Состояние живёт здесь, а не на сервере с router.refresh(): в задаче «доставка
// по вебсокетам» сюда придёт сокет и будет доливать сообщения в тот же массив.
// Поэтому любое пополнение ленты идёт через upsert() и идемпотентно по id.
// Сборка ленты (группы, разделители) — чистая функция buildFeed, независимая от
// порядка прихода: сокет не обязан присылать сообщения по возрастанию.

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat/validation";
import { chatErrorText } from "@/lib/chat/errors";
import { buildFeed, unreadAnchor } from "@/lib/chat/grouping";
import { fetchOlderMessages, postMessage, startThread, markThreadRead } from "@/server/actions/chat";
import { DateDivider, UnreadDivider } from "@/components/chat/FeedDividers";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { content } from "@theme/content";
import type { ThreadMessage } from "@/server/chat";

const t = content.chat;

export type ComposerMode =
  | { kind: "thread"; threadId: string }
  | { kind: "new"; listingId: string };

/** Сообщение в полёте: ключ свой, потому что одинаковый текст можно отправить
 *  дважды подряд, и по тексту такие пузыри неразличимы. */
type Pending = { key: number; body: string };

export function ThreadView({
  mode, viewerId, initialMessages, initialHasMore, blockedReason,
  viewerCursor = null, counterpartCursor = null, counterpartName = null, typing = false,
}: {
  mode: ComposerMode;
  viewerId: string;
  initialMessages: ThreadMessage[];
  initialHasMore: boolean;
  /** Текст вместо композера, когда писать нельзя (объявление снято, бан). */
  blockedReason?: string;
  /** Мой курсор прочтения на момент открытия — по нему ставится разделитель. */
  viewerCursor?: string | null;
  /** Курсор собеседника — по нему рисуются галочки. Остаётся пропом, а не
   *  уезжает в состояние: иначе замрёт навсегда. До задачи 2 обновляется
   *  только при обновлении страницы. */
  counterpartCursor?: string | null;
  counterpartName?: string | null;
  /** Заготовка под задачу 2: включить индикатор до сокета нечем. */
  typing?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, startTransition] = useTransition();
  const feedRef = useRef<HTMLOListElement>(null);
  const endRef = useRef<HTMLLIElement>(null);
  const nextKey = useRef(0);

  const threadId = mode.kind === "thread" ? mode.threadId : null;

  // Якорь непрочитанного снимается один раз, до markThreadRead: иначе
  // разделитель исчезнет через мгновение после открытия переписки.
  const [anchorId] = useState(() => unreadAnchor(initialMessages, viewerCursor, viewerId));

  const feed = useMemo(
    () => buildFeed(messages, { viewerId, unreadAnchorId: anchorId }),
    [messages, viewerId, anchorId],
  );

  const upsert = useCallback((incoming: ThreadMessage[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()];
    });
  }, []);

  // Лента — свой скроллер: панель ограничена по высоте на обеих ширинах, и
  // двигать надо её scrollTop, а не страницу, иначе уедет вся панель. Запасная
  // ветка на случай, когда высота ленты всё-таки по контенту (короткая
  // переписка): тогда доводим до якоря в конце.
  const scrollToEnd = useCallback(() => {
    const feedEl = feedRef.current;
    if (!feedEl) return;
    if (feedEl.scrollHeight > feedEl.clientHeight) feedEl.scrollTop = feedEl.scrollHeight;
    else endRef.current?.scrollIntoView({ block: "end" });
  }, []);

  useEffect(scrollToEnd, [scrollToEnd]);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    void markThreadRead(threadId).then((res) => {
      if (!cancelled && res.ok) router.refresh();
    });
    return () => { cancelled = true; };
  }, [threadId, router]);

  async function loadOlder() {
    if (!threadId || loadingOlder || messages.length === 0) return;
    const oldest = [...messages].sort((a, b) => (a.id < b.id ? -1 : 1))[0];
    setLoadingOlder(true);
    const res = await fetchOlderMessages(threadId, oldest.id);
    setLoadingOlder(false);
    if (!res.ok) { setError(chatErrorText(res.error)); return; }
    upsert(res.data.messages);
    setHasMore(res.data.hasMore);
  }

  function send() {
    const body = draft.trim();
    if (!body || isSending) return;
    const key = nextKey.current++;
    setDraft("");
    setError(null);
    setPending((prev) => [...prev, { key, body }]);

    const fail = (code: string) => {
      setPending((prev) => prev.filter((p) => p.key !== key));
      setError(chatErrorText(code));
      setDraft((current) => current || body);
    };

    startTransition(async () => {
      if (mode.kind === "new") {
        const res = await startThread({ listingId: mode.listingId, body });
        if (!res.ok) { fail(res.error); return; }
        upsert([res.data.message]);
        setPending([]);
        router.replace(`/chat/${res.data.threadId}` as never);
        return;
      }

      const res = await postMessage({ threadId: mode.threadId, body });
      if (!res.ok) { fail(res.error); return; }
      upsert([res.data.message]);
      setPending((prev) => prev.filter((p) => p.key !== key));
      router.refresh();
    });
  }

  // Быстрые ответы уместны, когда очередь за мной: лента пуста или последним
  // писал собеседник. Последнее берём по максимальному id, а не по хвосту
  // массива: «показать более ранние» дописывает в него СТАРЫЕ сообщения.
  const lastMessage = messages.reduce<ThreadMessage | null>(
    (acc, m) => (!acc || m.id > acc.id ? m : acc),
    null,
  );
  const showQuickReplies = !blockedReason
    && pending.length === 0
    && !draft
    && (messages.length === 0 || lastMessage?.senderUserId !== viewerId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol
        ref={feedRef}
        tabIndex={0}
        aria-label="Сообщения"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 py-4 [overscroll-behavior:contain] md:px-5"
      >
        {/* Распорка прижимает короткую переписку к низу ленты — как в любом
          * мессенджере: пара сообщений висит над полем ввода, а не под шапкой.
          * Именно распоркой, а не justify-end: при justify-end переполненная
          * лента вылезает за верхнюю кромку и доскроллить до начала нельзя.
          * flex-1 растёт только в свободное место, поэтому на длинной переписке
          * распорка схлопывается в ноль и ничего не занимает. */}
        <li aria-hidden="true" className="min-h-0 flex-1" />

        {hasMore && (
          <li className="mb-1 flex justify-center">
            <Button
              variant="outline"
              className="h-9"
              disabled={loadingOlder}
              onClick={() => void loadOlder()}
            >
              {loadingOlder ? t.loadingOlder : t.loadOlder}
            </Button>
          </li>
        )}

        {feed.length === 0 && pending.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">{t.emptyMessages}</li>
        )}

        {feed.map((item) => {
          if (item.kind === "date") return <DateDivider key={item.key} label={item.label} />;
          if (item.kind === "unread") return <UnreadDivider key={item.key} count={item.count} />;
          return (
            <Group
              key={item.key}
              mine={item.mine}
              messages={item.messages}
              counterpartCursor={counterpartCursor}
            />
          );
        })}

        {pending.map((p) => (
          <li key={`pending-${p.key}`} className="flex justify-end">
            <Bubble mine last body={p.body} />
          </li>
        ))}

        {typing && <TypingIndicator name={counterpartName} />}
        <li ref={endRef} aria-hidden="true" />
      </ol>

      {error && <p className="px-4 pb-1 text-sm text-destructive">{error}</p>}

      {blockedReason ? (
        <p className="m-3 rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">
          {blockedReason}
        </p>
      ) : (
        // На мобиле композер прилипает над таб-баром (панель там обычной высоты,
        // см. ChatPanes); на десктопе он просто нижняя полоса панели.
        /* pb с safe-area: на странице переписки --tabbar-h обнулена, а вместе с
         * ней ушёл и учёт домашней полосы айфона, который жил внутри неё. */
        /* Не sticky: панель ограничена по высоте и обрезает содержимое, поэтому
         * композер — просто нижний элемент колонки. Отступ снизу учитывает
         * домашнюю полосу айфона; при открытой клавиатуре её нет, и max() сам
         * отдаёт базовое значение. */
        <div className="shrink-0 border-t border-border bg-card px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-4 md:pb-3">
          {showQuickReplies && <QuickReplies onPick={setDraft} />}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={t.composerPlaceholder}
              aria-label={t.composerLabel}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-muted-foreground md:min-h-[40px]"
            />
            <Button
              onClick={send}
              disabled={!draft.trim() || isSending}
              className="h-11 w-11 shrink-0 rounded-lg p-0 md:h-10 md:w-10"
              aria-label={t.send}
            >
              <SendHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({
  mine, messages, counterpartCursor,
}: {
  mine: boolean;
  messages: ThreadMessage[];
  counterpartCursor: string | null;
}) {
  return (
    <li className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
      {messages.map((m, i) => (
        <Bubble
          key={m.id}
          mine={mine}
          last={i === messages.length - 1}
          body={m.body}
          createdAt={m.createdAt}
          read={mine && Boolean(counterpartCursor && m.id <= counterpartCursor)}
        />
      ))}
    </li>
  );
}

function Bubble({
  mine, last, body, createdAt, read,
}: {
  mine: boolean;
  /** Время и статус печатаются только у последнего пузыря группы. */
  last: boolean;
  body: string;
  createdAt?: Date;
  read?: boolean;
}) {
  // Скошенный хвост у последнего в группе — рисунок формы, а не третий размер
  // шкалы радиусов: контракт токенов такое допускает.
  const tail = !last
    ? "rounded-lg"
    : mine
      ? "rounded-[12px_4px_12px_12px]"
      : "rounded-[12px_12px_12px_4px]";
  const StatusIcon = read ? CheckCheck : Check;

  return (
    <div
      className={`max-w-[80%] px-3 py-2 md:max-w-[72%] ${tail} ${
        mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      } ${createdAt ? "" : "opacity-60"}`}
    >
      <p className="whitespace-pre-wrap break-words text-base leading-body md:text-sm">{body}</p>
      {last && (
        <span
          suppressHydrationWarning
          className={`mt-0.5 flex items-center gap-1 text-2xs ${
            mine ? "justify-end opacity-70" : "text-muted-foreground"
          }`}
        >
          {createdAt
            ? new Date(createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
            : t.sending}
          {mine && createdAt && (
            <>
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">{read ? t.read : t.delivered}</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
