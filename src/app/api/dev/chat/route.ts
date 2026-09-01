import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import {
  fetchOlderMessages, markThreadRead, postMessage, startThread,
} from "@/server/actions/chat";

// Dev-only обвязка над server actions переписки: даёт гонять флоу curl'ом без
// браузера (у actions нет стабильного HTTP-протокола снаружи). Смысл именно в
// проверке с двух сторон — залогиниться вторым аккаунтом через
// /api/dev/login?role=admin и ответить в тот же тред.
//
// Жёсткий kill-switch по NODE_ENV, как у /api/dev/login и /api/dev/booking.
//
// POST /api/dev/chat
//   { action: "start",  listingId, body }   — первое сообщение по объявлению
//   { action: "post",   threadId,  body }   — ответ в существующий тред
//   { action: "read",   threadId }          — отметить прочитанным
//   { action: "older",  threadId,  before } — страница ранней истории

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (getEnv().NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (body.action === "start") {
    return NextResponse.json(await startThread({ listingId: body.listingId, body: body.body }));
  }
  if (body.action === "post") {
    return NextResponse.json(await postMessage({ threadId: body.threadId, body: body.body }));
  }
  // Значения прокидываются как есть, без проверки типа: смысл ручки в том,
  // чтобы бить по actions ровно тем, что приходит по сети. Разбирать вход —
  // работа самих actions, и именно её здесь и надо иметь возможность проверить.
  if (body.action === "read") {
    return NextResponse.json(await markThreadRead(body.threadId));
  }
  if (body.action === "older") {
    return NextResponse.json(await fetchOlderMessages(body.threadId, body.before));
  }
  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
