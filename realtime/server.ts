// Пилот: минимальный realtime-процесс. Задача одна — померить память, поэтому
// здесь нет ни аутентификации, ни LISTEN, ни реестра по userId. Всё это придёт
// на шагах 4–6 плана; сейчас важно только, влезает ли второй Node-процесс в
// бюджет на сервере 1 vCPU / 1 GB (docs/DEPLOY.md).
//
// perMessageDeflate выключен намеренно и с самого начала: он включён в ws по
// умолчанию и держит zlib-контекст на каждое соединение — сотни килобайт на
// штуку. С ним замер показал бы не стоимость соединения, а стоимость сжатия.

import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.REALTIME_PORT ?? 3100);

// Тот же http-сервер отдаёт метрики: под healthcheck в проде понадобится
// endpoint, а пилоту он нужен, чтобы снимать память изнутри процесса.
const http = createServer((req, res) => {
  if (req.url !== "/health") {
    res.writeHead(404).end();
    return;
  }
  const m = process.memoryUsage();
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    connections: wss.clients.size,
    rssMb: +(m.rss / 1024 / 1024).toFixed(1),
    heapUsedMb: +(m.heapUsed / 1024 / 1024).toFixed(1),
    externalMb: +(m.external / 1024 / 1024).toFixed(1),
  }));
});

const wss = new WebSocketServer({
  server: http,
  path: "/ws",
  perMessageDeflate: false,
  maxPayload: 16 * 1024,
});

wss.on("connection", (socket) => {
  // Пилот держит соединение и отвечает на heartbeat. Ничего больше: любая
  // логика исказила бы замер.
  socket.on("message", () => socket.send("pong"));
});

http.listen(PORT, () => {
  console.log(`realtime pilot on :${PORT}`);
});
