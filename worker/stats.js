// Статистика відвідувань сайту: перевірка вхідної події та допоміжні функції.
// Без cookie та localStorage; IP-адреса не зберігається; дані форми сюди не потрапляють.
import { isoDay } from "./format.js";

/** Події, які рахуємо (так само в site/app.js) */
export const STAT_EVENTS = ["view", "report", "pdf", "form_start", "call", "tg"];
/** Біт для кожної події: «скільки різних відвідувачів зробили дію» за день */
export const STAT_BIT = Object.fromEntries(STAT_EVENTS.map((e, i) => [e, 1 << i]));

// Пошукові й технічні роботи, перевірки доступності, попередній перегляд посилань у месенджерах
const BOT_RE = /bot|crawl|spider|slurp|archiver|preview|facebookexternalhit|embedly|whatsapp|telegram|viber|skype|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|java\/|go-http|okhttp|axios|node-fetch|postman|insomnia|phantom|selenium|puppeteer|playwright/i;

const DAY = 86400000;

/** Тип пристрою за User-Agent */
export function deviceOf(ua) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "планшет";
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return "телефон";
  return "комп’ютер";
}

/** Джерело переходу — лише назва сайту, без шляху й параметрів */
export function refOf(ref, siteHost) {
  if (typeof ref !== "string" || !ref) return "(прямий захід або закладка)";
  try {
    const u = new URL(ref);
    if (u.protocol === "android-app:") return "застосунок Android";
    if (!/^https?:$/.test(u.protocol)) return "(інше)";
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const site = String(siteHost || "").toLowerCase().replace(/^www\./, "");
    if (host === site || host.endsWith(".tenderwin.in.ua") || host === "tenderwin.in.ua") return "(переходи всередині сайту)";
    return host.slice(0, 80);
  } catch {
    return "(невідомо)";
  }
}

/** Шлях сторінки без параметрів і якорів */
export function pathOf(p) {
  if (typeof p !== "string" || p[0] !== "/") return "/";
  const clean = p.split(/[?#]/)[0].slice(0, 60);
  return /^[\w\-/.%]*$/.test(clean) ? clean : "/";
}

/**
 * Перевірити подію з сайту. Повертає { event, path, ref, src, device, country } або null (не рахувати).
 * text — тіло запиту (JSON { e, p, r, s }); meta — { ua, host, country }.
 */
export function statInput(text, meta) {
  const ua = String(meta.ua || "");
  if (!ua || ua.length > 600 || BOT_RE.test(ua)) return null;
  let d;
  try { d = JSON.parse(text); } catch { return null; }
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  if (typeof d.e !== "string" || !STAT_EVENTS.includes(d.e)) return null;
  const src = typeof d.s === "string" && /^[a-z0-9_.-]{1,40}$/i.test(d.s) ? d.s.toLowerCase() : "";
  const country = typeof meta.country === "string" && /^[A-Z]{2}$/.test(meta.country) ? meta.country : "";
  return { event: d.e, path: pathOf(d.p), ref: refOf(d.r, meta.host), src, device: deviceOf(ua), country };
}

/** Дні періоду за Києвом: від найстарішого до сьогодні */
export function statsRange(now, days) {
  const list = [];
  for (let i = days - 1; i >= 0; i--) list.push(isoDay(new Date(now - i * DAY)));
  // через перехід на літній/зимовий час два сусідні «мінус добу» можуть дати той самий день
  const uniq = [...new Set(list)];
  return { from: uniq[0], list: uniq };
}
