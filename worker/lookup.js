// Пошук назви клієнта за кодом ЄДРПОУ (юрособа) або РНОКПП/ІПН (ФОП).
// Джерело — Clarity Project API (дані ЄДР). Потрібен секрет CLARITY_API_KEY.
// Якщо ключа немає або сервіс не відповів — повертаємо null, і рахунок
// виписується з кодом без назви (Віталій отримує про це позначку в листі).
import { titleCase } from "./format.js";

export async function lookupCounterparty(code, env) {
  if (!env.CLARITY_API_KEY) return { found: false, reason: "не налаштовано ключ Clarity Project" };
  const base = (env.CLARITY_API_URL || "https://clarity-project.info/api").replace(/\/$/, "");
  const isFop = code.length === 10;
  const url = `${base}/${isFop ? "fop.bycode" : "edr.info"}/${code}?key=${encodeURIComponent(env.CLARITY_API_KEY)}`;

  let data;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(7000) });
    if (!res.ok) return { found: false, reason: `Clarity Project відповів ${res.status}` };
    data = await res.json();
  } catch (e) {
    return { found: false, reason: "Clarity Project недоступний: " + (e && e.message) };
  }
  if (!data || data.error) {
    return { found: false, reason: "Clarity Project: " + ((data && data.error && data.error.text) || "порожня відповідь") };
  }

  if (isFop) {
    const f = data.fop;
    if (!f || !f.name) return { found: false, reason: "ФОП за цим РНОКПП не знайдено" };
    return {
      found: true,
      name: "ФОП " + titleCase(f.name),
      address: f.address || "",
      status: f.statusName || f.status || "",
      active: !f.status || f.status === "registered",
    };
  }

  const e = data.edr_data || {};
  const name = e.name || data.name;
  if (!name) return { found: false, reason: "юрособу за цим кодом ЄДРПОУ не знайдено" };
  return {
    found: true,
    name,
    address: (e.address_parts && e.address_parts.full_address) || e.address || "",
    status: e.statusName || e.status || "",
    active: !e.status || e.status === "registered",
  };
}
