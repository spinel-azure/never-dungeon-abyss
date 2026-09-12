import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMichaelaDialoguePages, formatMichaelaDialoguePage,
  MICHAELA_RESTORATION_DIALOGUE } from "../js/michaela-restoration.js";
import { getKeyItem, grantKeyItem } from "../data/key-items.js";
import { createInitialCharacter } from "../data/classes.js";
import { createBossCombatant, getBossById } from "../data/bosses.js";
import { createBattleState } from "../combat/battle-engine.js";
import { createBattleCompletionSnapshot } from "../js/battle.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the truth staff is a unique unsellable key item", () => {
  const item = getKeyItem("truth_staff");
  assert.equal(item.name, "真実の杖");
  assert.equal(item.sellable, false);
  assert.equal(item.consumable, false);
  const first = grantKeyItem(null, item.id);
  const duplicate = grantKeyItem(first.keyItems, item.id);
  assert.equal(first.gained, true);
  assert.equal(duplicate.gained, false);
  assert.equal(duplicate.reason, "alreadyOwned");
});

test("Michaela restoration preserves all six requested dialogue pages", () => {
  assert.equal(MICHAELA_RESTORATION_DIALOGUE.length, 6);
  assert.deepEqual(MICHAELA_RESTORATION_DIALOGUE, [
    "わたくしはミカエラ。このカッツェンラントの女王です。\nよくぞアマイェナクから真実の杖を取り戻してくれましたね。深く感謝いたします。",
    "この世の全ての叡智を欲していたアマイェナクはその源泉である\nアカシックレコードに触れたがっておりました。その為に真実の杖を必要としていたのです。",
    "アカシックレコードへのアクセスに必要な真実の杖は王家の血統とリンクしています。\n杖が所有者と認めた者が死ねば、アクセスキーとしての機能を失うのです。",
    "だからアマイェナクは、わたくしを殺すことができなかったのでしょう。けれど、自由にしておくわけにもいかなかった。\nそこで……わたくしから真実の杖を奪った上に、無力な猫の姿へと変えたのです。",
    "アマイェナクが、なぜそこまで全ての叡智を渇望したのか……。わたくしにも分かりません。\nけれど、その為に平和の象徴たる真実の杖を奪うことは、決して許されることではありません。\nあなたは、それを阻止してくださいました。",
    "さぁ、戻りましょう。皆が待つカッツェンシュタットへ！"
  ]);
});

test("Michaela dialogue measures the message box, splits naturally, and always shows the A prompt", () => {
  const messageElement = {
    clientHeight: 60,
    value: "",
    set textContent(value) { this.value = String(value); },
    get textContent() { return this.value; },
    get scrollHeight() {
      return this.value.split("\n").reduce((height, line) => height + Math.max(1, Math.ceil(line.length / 18)), 0) * 10;
    }
  };
  const pages = createMichaelaDialoguePages(messageElement);
  assert.ok(pages.length > MICHAELA_RESTORATION_DIALOGUE.length);
  for (const page of pages) {
    messageElement.textContent = formatMichaelaDialoguePage(page);
    assert.ok(messageElement.scrollHeight <= messageElement.clientHeight + 1);
    assert.match(messageElement.textContent, /＊Aボタンで次へ$/);
  }
  assert.equal(
    pages.join("").replaceAll("\n", ""),
    MICHAELA_RESTORATION_DIALOGUE.join("").replaceAll("\n", "")
  );
});

test("Amayenak victory persists recovery flags and returns to the B100F entrance", () => {
  const main = read("js/main.js");
  assert.match(main, /defeatedEnemyId === "amayenak_b100f"[\s\S]*?!character\?\.eventFlags\?\.ending_story_completed/);
  assert.match(main, /truth_staff_obtained: true/);
  assert.match(main, /michaela_restored: true/);
  assert.match(main, /cells\.flat\(\)\.find\(cell => cell\.fixedReturnPoint\)/);
  assert.match(main, /applyFixedFloorWarp\(\{ to: \{ x: returnPoint\.x, y: returnPoint\.y \}, facing: "W" \}\)/);
  assert.match(main, /boss_amayenak_b100f_defeated[\s\S]*?resumeMichaelaRestoration/);
});

test("the real battle completion snapshot reaches the restoration bridge with Amayenak's ID", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const enemy = createBossCombatant(getBossById("amayenak_b100f"));
  const battle = createBattleState({ character, enemy });
  battle.encounterBossId = enemy.id;
  battle.enemy.hp = 0;
  battle.enemy.alive = false;
  battle.outcome = "victory";
  const snapshot = createBattleCompletionSnapshot(battle);
  assert.equal(snapshot.outcome, "victory");
  assert.equal(snapshot.enemy.id, "amayenak_b100f");
  assert.equal(snapshot.defeatedEnemyId, "amayenak_b100f");
  const main = read("js/main.js");
  assert.match(main, /defeatedEnemyId === "amayenak_b100f"/);
  assert.match(main, /void runMichaelaRestoration\(\);\s*return;/);
});

test("restoration overlay uses the cat and both Michaela portraits", () => {
  const html = read("index.html");
  const css = read("css/scene-transition.css");
  assert.match(html, /mikan_silhouette\.avif/);
  assert.match(html, /NPC_01c\.avif/);
  assert.match(html, /NPC_01d\.avif/);
  assert.match(read("js/michaela-restoration.js"), /女王ミカエラ/);
  assert.match(css, /michaela-cat-rising/);
  assert.match(css, /michaela-human-reveal/);
  assert.match(css, /is-crossfade/);
  assert.match(css, /\.michaela-restoration-queen\{top:50%;width:100%;height:100%;object-position:center bottom/);
  assert.match(css, /\.michaela-restoration\{position:absolute;inset:0/);
  assert.doesNotMatch(css, /\.michaela-restoration\{position:fixed/);
  assert.match(html, /<div class="viewport">[\s\S]*?<section id="michaelaRestoration"/);
  assert.doesNotMatch(html, /michaelaRestorationDialogue/);
  assert.match(read("js/main.js"), /onMessage: say/);
  assert.match(read("js/main.js"), /messageElement: msgEl/);
  assert.doesNotMatch(read("js/michaela-restoration.js"), /dialogueTimer/);
  assert.match(read("js/michaela-restoration.js"), /classList\.remove\("michaela-message-active", "michaela-restoration-active"\);\s*onMessage\?\.\(""\)/);
  assert.match(read("css/style.css"), /body\.michaela-message-active \.message/);
});

test("restoration returns silently without an unrelated floor transition message", () => {
  const main = read("js/main.js");
  assert.doesNotMatch(main, /say\("第100層\\n↓\\n奈落入口"\)/);
});

test("main.js keeps the current top-level cache buster without versioned module imports", () => {
  const html = read("index.html");
  assert.match(html, /js\/main\.js\?v=20260912-2/);
  assert.doesNotMatch(read("js/main.js"), /from\s+["'][^"']+\?v=/);
});
