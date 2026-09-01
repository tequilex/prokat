// Каркас переписок: список слева, открытый диалог справа. На мобиле видна
// только одна колонка — какая, решает ChatPanes по открытому сегменту.
//
// Список читается здесь, а не на каждой странице: он общий для /chat и
// /chat/[threadId], и при переходе между диалогами не перезапрашивается.

import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getThreadList } from "@/server/chat";
import { ChatPanes } from "@/components/chat/ChatPanes";
import { ThreadList } from "@/components/chat/ThreadList";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/chat");

  const threads = await getThreadList(session.user.id);

  return (
    <ChatPanes list={<ThreadList threads={threads} />} hasThreads={threads.length > 0}>
      {children}
    </ChatPanes>
  );
}
