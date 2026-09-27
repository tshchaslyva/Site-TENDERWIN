// Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  amountInWords, money, isValidEdrpou, isValidRnokpp, extractTenderId, titleCase, isoDay, longDate,
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

test("ID закупівлі з посилання", () => {
  assert.equal(extractTenderId("https://prozorro.gov.ua/tender/UA-2026-09-07-014600-a"), "UA-2026-09-07-014600-a");
  assert.equal(extractTenderId("ua-2026-09-07-014600-A"), "UA-2026-09-07-014600-a");
  assert.equal(extractTenderId("abc"), "");
});

test("ПІБ з реєстру", () => {
  assert.equal(titleCase("ГАРАГУЦ ЯРОСЛАВ ВАЛЕРІЙОВИЧ"), "Гарагуц Ярослав Валерійович");
  assert.equal(titleCase("П’ЯТНИЦЬКА-КОВАЛЬ ОЛЕНА"), "П’ятницька-Коваль Олена");
});

test("дати за Києвом", () => {
  // 22:30 UTC 26.09 = 01:30 27.09 за Києвом
  const d = new Date("2026-09-26T22:30:00Z");
  assert.equal(isoDay(d), "2026-09-27");
  assert.equal(longDate(d), "27 вересня 2026 р.");
});
