// Імітація API Resend для локальних тестів (жодних справжніх листів).
//   POST /emails              — приймає лист; той самий Idempotency-Key повертає той самий ID
//   POST /__mode {mode}        — режим збоїв: ok | down | owner-down | client-down
//   GET  /__sent               — усі прийняті листи (без вкладень, лише назви файлів)
//   POST /__reset              — очистити
import http from "node:http";

const OWNER = process.env.MOCK_OWNER || "vitalii@tenderwin.com.ua";
let mode = "ok";
let seq = 0;
const sent = [];
const byKey = new Map();
const hits = [];

function reply(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.url === "/__mode" && req.method === "POST") { mode = JSON.parse(body).mode; return reply(res, 200, { mode }); }
    if (req.url === "/__sent") return reply(res, 200, { sent, hits });
    if (req.url === "/__reset" && req.method === "POST") { sent.length = 0; hits.length = 0; byKey.clear(); seq = 0; mode = "ok"; return reply(res, 200, {}); }
    if (req.url === "/emails" && req.method === "POST") {
      const j = JSON.parse(body);
      const to = (j.to || [])[0] || "";
      const key = req.headers["idempotency-key"] || "";
      hits.push({ to, key, subject: j.subject, mode });
      if (mode === "down") return reply(res, 503, { message: "temporarily unavailable" });
      if (mode === "owner-down" && to === OWNER) return reply(res, 500, { message: "boom" });
      if (mode === "client-down" && to !== OWNER) return reply(res, 500, { message: "boom" });
      if (/^bounce-/.test(to)) return reply(res, 422, { message: "invalid recipient" });
      if (key && byKey.has(key)) return reply(res, 200, { id: byKey.get(key) });
      const id = "re_" + ++seq;
      if (key) byKey.set(key, id);
      sent.push({ id, key, to, bcc: j.bcc, reply_to: j.reply_to, from: j.from, subject: j.subject, text: j.text, html: j.html,
        attachments: (j.attachments || []).map((a) => ({ filename: a.filename, size: a.content.length, content: a.content })) });
      return reply(res, 200, { id });
    }
    reply(res, 404, {});
  });
}).listen(Number(process.env.MOCK_PORT || 9902), "127.0.0.1", () => console.log("mock-resend ready"));
