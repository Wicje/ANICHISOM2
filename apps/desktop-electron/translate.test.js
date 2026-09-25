const { test } = require("node:test");
const assert = require("node:assert/strict");
const T = require("./translate");

test("detectLanguage finds obvious English/French/German", () => {
  assert.equal(
    T.detectLanguage("The quick brown fox jumps over the lazy dog and runs to the river with friends for a swim in summer"),
    "en",
  );
  assert.equal(
    T.detectLanguage("Les enfants jouent dans le jardin avec leurs amis pour fêter la fin de l'école et danser ensemble"),
    "fr",
  );
  assert.equal(
    T.detectLanguage("Der Hund läuft mit dem Ball über die Wiese und ist nicht von der Stelle zu bringen heute"),
    "de",
  );
});

test("detectLanguage is conservative on short/gibberish text", () => {
  assert.equal(T.detectLanguage("hello world"), "unknown");
  assert.equal(T.detectLanguage(""), "unknown");
  assert.equal(T.detectLanguage(null), "unknown");
  assert.equal(T.detectLanguage("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor"), "unknown");
});

test("detectLanguage maps non-Latin scripts", () => {
  assert.equal(T.detectLanguage("这是一个很长的中文句子用于测试语言检测功能是否正常工作今天天气不错"), "zh");
  assert.equal(T.detectLanguage("これは日本語のテスト文です言語検出が正しく動作するか確認しています今日は良い天気です"), "ja");
  assert.equal(T.detectLanguage("Это довольно длинное предложение на русском языке для проверки определения языка системы"), "ru");
});

test("shouldOffer only fires on known-different languages with enough text", () => {
  assert.equal(T.shouldOffer("fr", "en", 500), true);
  assert.equal(T.shouldOffer("en", "en", 500), false);
  assert.equal(T.shouldOffer("unknown", "en", 5000), false);
  assert.equal(T.shouldOffer("fr", "en", 50), false);
  assert.equal(T.shouldOffer("fr", "fr-FR", 500), false);
});

test("validEndpoint accepts http(s) only", () => {
  assert.equal(T.validEndpoint("http://localhost:5000"), true);
  assert.equal(T.validEndpoint("https://translate.example.com/"), true);
  assert.equal(T.validEndpoint(""), false);
  assert.equal(T.validEndpoint("ftp://x"), false);
  assert.equal(T.validEndpoint("not a url"), false);
});

test("buildTranslateRequest shapes a LibreTranslate call or errors", () => {
  const ok = T.buildTranslateRequest("http://localhost:5000/", "Bonjour le monde", "fr", "en");
  assert.equal(ok.url, "http://localhost:5000/translate");
  assert.equal(ok.body.target, "en");
  assert.equal(T.buildTranslateRequest("", "hi", "en", "fr").error, "no-endpoint");
  assert.equal(T.buildTranslateRequest("http://localhost:5000", "   ", "en", "fr").error, "empty");
});
