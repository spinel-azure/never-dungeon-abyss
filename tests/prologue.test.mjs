import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PROLOGUE_CONFIG, PROLOGUE_PARAGRAPHS } from "../data/prologue.js";

const expectedText = `昔、昔のお話です

猫に囲まれた王国を治める一人の女王がおりました

とても美しく聡明で、国民から深く愛されておりました

その女王は【真実の杖】と呼ばれる不思議な杖で
王国を様々な災いから護っていたのです

人々はこの平和がいつまでも続くものと
信じて疑いませんでした

しかしある闇夜の晩――

人々を災いから護っていた【真実の杖】が
何者かに奪われてしまいました

そして同じ夜、女王もまた忽然と
姿を消してしまったのです

一夜にして【真実の杖】と女王を失った王国の人々は
深い悲しみに包まれました

それからしばらくして――

カッツェンシュタットの町に
人の言葉を話す奇妙な猫が
姿を見せるようになりました

そしてちょうどその頃、この町を訪れた
一人の放浪者がおりました

それが――

――あなたです

ここから物語が始まります`;

test("プロローグ本文は指定文を変更せず保持する", () => {
  assert.equal(PROLOGUE_PARAGRAPHS.map(item => item.text).join("\n\n"), expectedText);
});

test("プロローグ画像と演出時間は一箇所に集約される", () => {
  assert.equal(PROLOGUE_CONFIG.queenImage, "images/npc/NPC_01b.avif");
  assert.equal(PROLOGUE_CONFIG.catImage, "images/screenshots/mikan_silhouette.avif");
  assert.equal(PROLOGUE_CONFIG.flashDurationMs, 120);
  assert.ok(PROLOGUE_CONFIG.scrollPixelsPerSecond > 0);
});

test("NEW GAMEはプロローグから案内画面へ接続する", async () => {
  const source = await readFile(new URL("../js/title-screen.js", import.meta.url), "utf8");
  assert.match(source, /action === "new-game"[\s\S]*openPrologue\(event\)/);
  assert.match(source, /onComplete: \(\) => openGreeting\(\)/);
  assert.match(source, /greetingOpen[\s\S]*nda:new-game/);
});

test("プロローグは二段階スキップとゲームパッド入力に対応する", async () => {
  const [controller, title, main] = await Promise.all([
    readFile(new URL("../js/prologue.js", import.meta.url), "utf8"),
    readFile(new URL("../js/title-screen.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8")
  ]);
  assert.match(controller, /skipArmed/);
  assert.match(controller, /SKIP？/);
  assert.match(title, /nda:title-input/);
  assert.match(title, /action === "up" \|\| action === "down"/);
  assert.match(main, /nda:title-input/);
});

test("プロローグ画面はディザ端処理とモバイル調整を持つ", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../css/title-screen.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="prologueScreen"/);
  assert.equal((html.match(/class="prologue-dither/g) || []).length, 2);
  assert.match(css, /repeating-conic-gradient/);
  assert.match(css, /@media\(max-width:420px\)/);
  assert.match(css, /"PixelFont",monospace/);
});
