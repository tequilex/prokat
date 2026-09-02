import { describe, it, expect } from "vitest";
import {
  chatMessageNotify, parseNotify, requestNotify, toClientFrame,
} from "@/lib/realtime/events";

// Контракт события живёт между двумя процессами: app пишет payload в pg_notify,
// realtime его читает. Живого Postgres тесты не требуют, поэтому это
// единственное место, где контракт вообще проверяется.

describe("сборка события", () => {
  it("сообщение уходит обоим участникам — отправителю тоже", () => {
    const p = chatMessageNotify({
      threadId: "t1", messageId: "m1", senderId: "u1", recipientId: "u2", inserted: true,
    });
    // Эхо собственного сообщения нужно второй вкладке отправителя; на нём же
    // построена дедупликация по id.
    expect(p.recipients).toEqual(["u1", "u2"]);
    expect(p.countFor).toBe("u2");
  });

  it("счётчик поднимается только получателю и только при настоящей вставке", () => {
    const collapsed = chatMessageNotify({
      threadId: "t1", messageId: "m2", senderId: "u1", recipientId: "u2", inserted: false,
    });
    // Уведомление схлопнулось с уже непрочитанным — доставить сообщение надо,
    // а счётчик поднимать нечего.
    expect(collapsed.recipients).toEqual(["u1", "u2"]);
    expect(collapsed.countFor).toBeNull();
  });

  it("уведомления без получателя не бывает", () => {
    const p = chatMessageNotify({
      threadId: "t1", messageId: "m1", senderId: "u1", recipientId: null, inserted: false,
    });
    expect(p.recipients).toEqual(["u1"]);
    expect(p.countFor).toBeNull();
  });

  it("событие по заявке уходит только получателю: у деятеля своя перерисовка", () => {
    const p = requestNotify({ kind: "request_confirmed", requestId: "r1", recipientId: "u2" });
    expect(p.recipients).toEqual(["u2"]);
    expect(p.countFor).toBe("u2");
  });
});

describe("разбор события", () => {
  it("проходит собственный сериализованный payload", () => {
    const p = chatMessageNotify({
      threadId: "t1", messageId: "m1", senderId: "u1", recipientId: "u2", inserted: true,
    });
    expect(parseNotify(JSON.stringify(p))).toEqual(p);
  });

  // Битый payload обязан вернуть null, а не бросить: исключение в обработчике
  // notification роняет процесс, а restart перезапускает его в цикл.
  it("на мусоре возвращает null, а не бросает", () => {
    for (const raw of ["", "{", "null", "[]", '"строка"', "42"]) {
      expect(parseNotify(raw)).toBeNull();
    }
  });

  it("неизвестный вид отвергается", () => {
    expect(parseNotify(JSON.stringify({
      kind: "request_teleported", requestId: "r1", recipients: ["u1"], countFor: null,
    }))).toBeNull();
  });

  it("недостающие поля отвергаются", () => {
    expect(parseNotify(JSON.stringify({
      kind: "chat_message", threadId: "t1", recipients: ["u1"], countFor: null,
    }))).toBeNull();
  });

  it("лишние поля отбрасываются, а не ломают разбор", () => {
    const parsed = parseNotify(JSON.stringify({
      kind: "request_declined", requestId: "r1", recipients: ["u2"], countFor: "u2",
      secret: "не должно доехать",
    }));
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("secret");
  });
});

describe("кадр в браузер", () => {
  it("список получателей наружу не уходит", () => {
    const p = chatMessageNotify({
      threadId: "t1", messageId: "m1", senderId: "u1", recipientId: "u2", inserted: true,
    });
    const frame = toClientFrame(p, "u2");
    expect(frame).toEqual({ type: "message", threadId: "t1", messageId: "m1", counters: true });
    expect(frame).not.toHaveProperty("recipients");
  });

  it("тому, кому счётчик не адресован, флаг не ставится", () => {
    const p = chatMessageNotify({
      threadId: "t1", messageId: "m1", senderId: "u1", recipientId: "u2", inserted: true,
    });
    expect(toClientFrame(p, "u1")).toMatchObject({ counters: false });
  });

  it("заявка приезжает кадром без треда", () => {
    const p = requestNotify({ kind: "request_created", requestId: "r1", recipientId: "u2" });
    expect(toClientFrame(p, "u2")).toEqual({
      type: "request", requestId: "r1", kind: "request_created", counters: true,
    });
  });
});

// Прочтение. Отдельный вид события: персистентного уведомления за ним не стоит
// и счётчиков оно не трогает — это чистый сигнал «твои галочки поменялись».
describe("отметка прочтения", () => {
  it("уходит только собеседнику и не трогает счётчик", async () => {
    const { threadReadNotify } = await import("@/lib/realtime/events");
    const p = threadReadNotify({ threadId: "t1", upToId: "m9", recipientId: "u2" });
    // Читателю своё же прочтение ни о чём не говорит.
    expect(p.recipients).toEqual(["u2"]);
    expect(p.countFor).toBeNull();
  });

  it("кадр несёт отметку, до которой прочитано", async () => {
    const { threadReadNotify, toClientFrame } = await import("@/lib/realtime/events");
    const p = threadReadNotify({ threadId: "t1", upToId: "m9", recipientId: "u2" });
    expect(toClientFrame(p, "u2")).toEqual({ type: "read", threadId: "t1", upToId: "m9" });
  });

  it("переживает сериализацию", async () => {
    const { threadReadNotify, parseNotify } = await import("@/lib/realtime/events");
    const p = threadReadNotify({ threadId: "t1", upToId: "m9", recipientId: "u2" });
    expect(parseNotify(JSON.stringify(p))).toEqual(p);
  });
});
