// Статистика відвідувань: перевірка вхідних подій. Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { statInput, refOf, pathOf, deviceOf, statsRange, STAT_BIT } from "../stats.js";

const UA_PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
const UA_PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const meta = (ua = UA_PC) => ({ ua, host: "tenderwin.in.ua", country: "UA" });

test("подія перегляду: сторінка, джерело, пристрій, країна", () => {
  const h = statInput(JSON.stringify({ e: "view", p: "/?utm_source=x#zayavka", r: "https://www.google.com/search?q=тендер", s: "Facebook" }), meta(UA_PHONE));
  assert.deepEqual(h, { event: "view", path: "/", ref: "google.com", src: "facebook", device: "телефон", country: "UA" });
});

test("джерело — лише назва сайту; свій сайт і прямий захід позначено окремо", () => {
  assert.equal(refOf("", "tenderwin.in.ua"), "(прямий захід або закладка)");
  assert.equal(refOf("https://tenderwin.in.ua/404", "tenderwin.in.ua"), "(переходи всередині сайту)");
  assert.equal(refOf("https://t.me/some/123?x=1", "tenderwin.in.ua"), "t.me");
  assert.equal(refOf("android-app://org.telegram.messenger/", "tenderwin.in.ua"), "застосунок Android");
  assert.equal(refOf("не адреса", "tenderwin.in.ua"), "(невідомо)");
});

test("шлях без параметрів; підозрілий шлях замінюється на /", () => {
  assert.equal(pathOf("/admin/?x=1"), "/admin/");
  assert.equal(pathOf("/<script>"), "/");
  assert.equal(pathOf("https://evil.example/"), "/");
});

test("роботи, порожній User-Agent і невідомі події не рахуються", () => {
  assert.equal(statInput(JSON.stringify({ e: "view" }), meta("Googlebot/2.1 (+http://www.google.com/bot.html)")), null);
  assert.equal(statInput(JSON.stringify({ e: "view" }), meta("TelegramBot (like TwitterBot)")), null);
  assert.equal(statInput(JSON.stringify({ e: "view" }), meta("")), null);
  assert.equal(statInput(JSON.stringify({ e: "hack" }), meta()), null);
  assert.equal(statInput("не json", meta()), null);
  assert.equal(statInput(JSON.stringify([1, 2]), meta()), null);
});

test("пристрій і біти подій", () => {
  assert.equal(deviceOf(UA_PC), "комп’ютер");
  assert.equal(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "планшет");
  assert.equal(new Set(Object.values(STAT_BIT)).size, Object.keys(STAT_BIT).length);
});

test("період за Києвом закінчується сьогоднішнім днем", () => {
  const now = Date.parse("2026-10-04T10:00:00Z");
  const r = statsRange(now, 7);
  assert.equal(r.list.length, 7);
  assert.equal(r.list[6], "2026-10-04");
  assert.equal(r.from, "2026-09-28");
});
