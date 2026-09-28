// Browser integration QA. Start tools/dev-server.cjs before running this file.
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.DEFEAT_RECOVERY_TEST_URL || "http://127.0.0.1:4173";
const main = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const battle = await readFile(new URL("../../js/battle.js", import.meta.url), "utf8");
const hook = `window.defeatRecoveryQa={async setup(){
document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');
closeTown();worldLocation='dungeon';firstDungeonTutorialActive=false;deckTutorialActive=false;
character=normalizeCharacter({...createInitialCharacter({name:'転生テスト',job:'priest'}),level:90});
character.hp=7;character.sp=37;character.statuses=[{id:'poison',statusId:'poison',active:true},{id:'guardian_prayer',statusId:'guardian_prayer',active:true}];
setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
const {createEnemyCombatant,getEnemyById}=await import('/data/enemies.js');
const enemy=createEnemyCombatant(getEnemyById('abyss_rat'));enemy.hp=enemy.maxHp=999999;
enemy.actions=[{weight:1,action:{id:'qa',name:'致命攻撃',actionType:'physicalAttack',unavoidable:true,powerPerHit:1000,hitCount:1,speedModifier:999}}];
startBattle(enemy,{playStartSe:false});}};`;

await mkdir("artifacts/defeat-recovery", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/js/main.js?*", route => route.fulfill({
    contentType: "text/javascript",
    body: main.replace('  document.documentElement.dataset.ndaMainReady = "true";', `${hook}\n  document.documentElement.dataset.ndaMainReady = "true";`)
  }));
  await page.route("**/js/battle.js", route => route.fulfill({
    contentType: "text/javascript",
    body: `${battle}\nwindow.defeatRecoveryBattle={use:executeCommand,idle:()=>!battleUi.presenting,state:()=>battleUi.battle};`
  }));
  await page.goto(origin);
  await page.waitForFunction(() => window.defeatRecoveryQa);
  await page.evaluate(() => defeatRecoveryQa.setup());
  await page.evaluate(() => { void defeatRecoveryBattle.use({ type: "wait" }); });
  await page.waitForFunction(() => document.querySelector("#battleDefeatRecoveryFlash")?.classList.contains("is-active"));
  assert.equal(await page.locator("#message").textContent(), "リィンカーネーションが発動した！");
  await page.screenshot({ path: "artifacts/defeat-recovery/reincarnation-whiteout.png" });
  await page.waitForFunction(() => defeatRecoveryBattle.idle());
  const state = await page.evaluate(() => defeatRecoveryBattle.state().player);
  assert.equal(state.hp, Math.floor(state.maxHp * 0.5));
  assert.equal(state.sp, 37);
  assert.equal(state.adventureDefeatRecoveryUsed, true);
  assert.deepEqual(state.statuses.map(status => status.id), ["guardian_prayer"]);
  assert.deepEqual(errors, []);
  console.log("passed: whiteout, message, HP/SP recovery, status cure and use-state persistence");
} finally {
  await browser.close();
}
