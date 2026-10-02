// Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  amountInWords, money, isValidEdrpou, isValidRnokpp, parseTenderId, normalizeContact, isValidIbanUa,
  isoDay, longDate, kyivDateTime,
} from "../format.js";

test("сума прописом", () => {
  assert.equal(amountInWords(3499), "Три тисячі чотириста дев’яносто дев’ять гривень 00 копійок");
  assert.equal(amountInWords(1), "Одна гривня 00 копійок");
  assert.equal(amountInWords(22.5), "Двадцять дві гривні 50 копійок");
  assert.equal(amountInWords(11000), "Одинадцять тисяч гривень 00 копійок");
  assert.equal(amountInWords(2001001.01), "Два мільйони одна тисяча одна гривня 01 копійка");
});

test("гроші", () => {
  assert.equal(money(3499), "3 499,00");
});

test("контрольні цифри", () => {
  assert.ok(isValidEdrpou("14360570"));   // ПриватБанк
  assert.ok(!isValidEdrpou("14360571"));
  assert.ok(isValidRnokpp("2817712530"));
  assert.ok(!isValidRnokpp("2817712531"));
});

test("ID закупівлі: повний формат і реальна дата", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  assert.equal(parseTenderId("https://prozorro.gov.ua/tender/UA-2026-09-07-014600-a", now), "UA-2026-09-07-014600-a");
  assert.equal(parseTenderId("ua-2026-09-07-014600-A", now), "UA-2026-09-07-014600-a");
  assert.equal(parseTenderId("UA-2026-09-07-014600", now), "");          // без суфікса
  assert.equal(parseTenderId("UA-2026-99-99-000001-a", now), "");        // неможлива дата
  assert.equal(parseTenderId("UA-2026-02-30-000001-a", now), "");        // 30 лютого
  assert.equal(parseTenderId("UA-2014-01-10-000001-a", now), "");        // до запуску Prozorro
  assert.equal(parseTenderId("UA-2028-01-10-000001-a", now), "");        // надто далеке майбутнє
  assert.equal(parseTenderId("XUA-2026-09-07-014600-a", now), "");
  assert.equal(parseTenderId("abc", now), "");
});

test("контакт для уточнень", () => {
  assert.deepEqual(normalizeContact(""), { kind: "", value: "" });
  assert.deepEqual(normalizeContact("+380 67 123 45 67"), { kind: "phone", value: "+380 67 123 45 67" });
  assert.deepEqual(normalizeContact("@ivan_test"), { kind: "telegram", value: "@ivan_test" });
  assert.deepEqual(normalizeContact("https://t.me/ivan_test"), { kind: "telegram", value: "@ivan_test" });
  assert.equal(normalizeContact("12345"), null);
  assert.equal(normalizeContact("<script>"), null);
});

test("IBAN", () => {
  assert.ok(isValidIbanUa("UA74 3052 9900 0002 6007 2335 6600 1"));
  assert.ok(!isValidIbanUa("UA753052990000026007233566001"));
  assert.ok(!isValidIbanUa("UA74305299"));
});

test("дати за Києвом", () => {
  // 22:30 UTC 26.09 = 01:30 27.09 за Києвом
  const d = new Date("2026-09-26T22:30:00Z");
  assert.equal(isoDay(d), "2026-09-27");
  assert.equal(longDate(d), "27 вересня 2026 р.");
  assert.equal(kyivDateTime(d), "27 вересня 2026 р., 01:30");
});
