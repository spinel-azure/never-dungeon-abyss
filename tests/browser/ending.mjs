// Isolated browser contexts only. Test hooks are injected into the served module;
// no debug API or player save is added to the shipped game.
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.ENDING_TEST_URL || "http://127.0.0.1:4175";
const output = process.env.ENDING_TEST_OUTPUT || path.join(os.tmpdir(), "nda-ending-qa");
await mkdir(output, { recursive: true });
const source = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const hook = `window.endingQa = {
  setup() {
    document.querySelector('#titleScreen').hidden = true;
    document.body.classList.remove('title-active');
    saveEnabled = true; character = createInitialCharacter({ name: 'ENDING QA', job: 'warrior' });
    character.maxHp = character.hp = 9999;
    character.eventFlags.boss_b99f_defeated = true;
    for (const id of ['queen_tiara','queen_earring','queen_necklace']) character.keyItems = grantKeyItem(character.keyItems,id).keyItems;
    currentDepth = 100; worldLocation = 'dungeon'; closeTown(); resetDungeon('',null,true);
    setBgmOptions({ enabled: false }); setSeOptions({ enabled: false });
  },
  victory: finishBattleVictory, snapshot: makeSaveSnapshot, load: continueGame,
  status: openStatusMenu, action: dispatchGamepadAction,
  beginBossBattle, beginRandomBattle, runMainEnding,
  restoration: michaelaRestorationController, ending: endingController,
  state: () => ({ phase: endingController.getPhase(), locked: endingSequenceActive,
    playerEnabled: isPlayerInputEnabled(), location: worldLocation, x: state.gridX, y: state.gridY,
    character: structuredClone(character), town: getTownState() })
};`;
const browser = await chromium.launch({ channel: process.env.ENDING_TEST_CHANNEL || "msedge", headless: true });
const errors = [], warnings = [], results = [];
async function advance(page, ms) { await page.clock.fastForward(ms); await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0))); }
try {
  for (const [layout, width, height, reduced] of [["pc",1280,900,false],["mobile",390,844,false],["tablet",820,1180,true]]) {
    const context = await browser.newContext({ viewport: { width,height }, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(`${layout}: ${e.message}`));
    page.on("console", m => { if (["warning","error"].includes(m.type())) warnings.push(`${layout}: ${m.text()}`); });
    await page.route("**/js/main.js?*", route => route.fulfill({ contentType: "text/javascript", body: source.replace('  document.documentElement.dataset.ndaMainReady = "true";', hook + '\n  document.documentElement.dataset.ndaMainReady = "true";') }));
    const installRafProbe = () => page.evaluate(() => {
      const pending = window.endingRafs = { ending: new Set(), town: new Set(), draws: 0 };
      const request = requestAnimationFrame, cancel = cancelAnimationFrame;
      window.requestAnimationFrame = fn => {
        const text = String(fn), type = text.includes('phase === "arrival"') ? 'ending' : text.includes('isTownPasserbyVisible') ? 'town' : null;
        const id = request(time => { if (type) { pending[type].delete(id); if (type === 'ending') pending.draws++; } fn(time); });
        if (type) pending[type].add(id); return id;
      };
      window.cancelAnimationFrame = id => { pending.ending.delete(id); pending.town.delete(id); cancel(id); };
    });
    await page.goto(origin);
    await page.waitForFunction(() => window.endingQa);
    await page.clock.install();
    await installRafProbe();
    await page.evaluate(async () => {
      endingQa.setup();
      const { createBattleState } = await import("/combat/battle-engine.js");
      const { createBossCombatant } = await import("/data/bosses.js");
      const { createBattleCompletionSnapshot } = await import("/js/battle.js");
      const enemy = createBossCombatant("amayenak_b100f");
      const battle = createBattleState({ character: endingQa.state().character, enemy });
      battle.encounterBossId = enemy.id;
      battle.enemy.hp = 0; battle.enemy.alive = false; battle.outcome = "victory";
      endingQa.victory(createBattleCompletionSnapshot(battle));
    });
    await advance(page, 3600);
    assert.equal(await page.evaluate(() => endingQa.restoration.getPhase()), "transform");
    const before = await page.evaluate(() => endingQa.state());
    await page.evaluate(() => { endingQa.action("up"); endingQa.action("items"); endingQa.beginBossBattle("wicker_man_b39f"); endingQa.beginRandomBattle(); });
    await page.evaluate(() => document.querySelector('[data-command="status"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
    assert.equal(await page.locator('[data-menu-view="status"]').isVisible(), false);
    const after = await page.evaluate(() => endingQa.state());
    assert.equal(before.x, after.x); assert.equal(before.y, after.y); assert.equal(after.playerEnabled, false);
    for (const ms of [2500,200,250,3500,3100,1900]) await advance(page, ms);
    assert.equal(await page.evaluate(() => endingQa.restoration.getPhase()), "dialogue");
    for (let i=0;i<6;i++) await advance(page, 16000);
    assert.equal(await page.evaluate(() => endingQa.state().location), "dungeon");
    assert.equal(await page.evaluate(() => endingQa.state().playerEnabled), false);
    await advance(page, 1600);
    assert.equal(await page.evaluate(() => endingQa.ending.getPhase()), "arrival");
    assert.equal(await page.locator(".ending-arrival-image").count(), 1);
    assert.equal(await page.evaluate(() => endingRafs.town.size), 0);
    assert.equal(await page.evaluate(() => endingRafs.ending.size), 1);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#townPassersby")).visibility), "hidden");
    await page.screenshot({ path: path.join(output, `${layout}-arrival.png`) });
    await advance(page, 5100);
    assert.equal(await page.evaluate(() => endingQa.ending.getPhase()), "credits");
    await page.evaluate(() => {
      window.rollPaints = 0;
      window.rollObserver = new MutationObserver(records => { window.rollPaints += records.length; });
      rollObserver.observe(document.querySelector('.ending-roll'), { attributes:true, attributeFilter:['style'] });
    });
    await page.clock.runFor(1000);
    const paints = await page.evaluate(() => { rollObserver.disconnect(); return rollPaints; });
    assert.ok(paints >= 20 && paints <= (layout === 'pc' ? 62 : 32), 'roll frame cap: ' + paints);
    const pending = await page.evaluate(async () => (await import("/js/save-data.js")).loadGame());
    assert.equal(pending.world.location, "town");
    assert.equal(pending.character.eventFlags.ending_story_completed, true);
    assert.equal(pending.character.eventFlags.ending_credits_pending, true);
    assert.ok(pending.character.keyItems.owned.royal_cat_medal);
    assert.equal(pending.character.keyItems.owned.queen_tiara, undefined);
    assert.equal(await page.getByText("テストプレイ", { exact: true }).count(), 0);
    await advance(page, 15000);
    await page.screenshot({ path: path.join(output, `${layout}-epilogue.png`) });
    await advance(page, 15000);
    assert.equal(await page.locator('#endingScreen').getAttribute('data-stage'), 'medal');
    assert.equal(await page.locator('.ending-medal img').evaluate(img => img.naturalWidth > 0 && img.width === 128), true);
    await page.screenshot({ path: path.join(output, `${layout}-medal.png`) });
    if (layout === "mobile") {
      // Reload an actual persisted pending save: no restoration, entrance, or confetti.
      await page.reload(); await page.waitForFunction(() => window.endingQa);
      await page.clock.install();
      await installRafProbe();
      await page.evaluate(async () => { (await import('/js/audio.js')).setBgmOptions({ enabled:false }); document.querySelector('#titleScreen').hidden = true; document.body.classList.remove('title-active'); endingQa.load(); });
      assert.equal(await page.locator('#endingScreen').getAttribute('data-phase'), 'credits');
      assert.equal(await page.evaluate(() => endingQa.restoration.isActive()), false);
      await page.evaluate(() => endingQa.action('confirm')); await advance(page, 300);
      await page.evaluate(() => endingQa.action('confirm'));
    } else {
      await advance(page, 20000);
      await page.screenshot({ path: path.join(output, `${layout}-credits.png`) });
      await advance(page, 33000);
      assert.equal(await page.locator('#endingScreen').getAttribute('data-stage'), 'end');
      const transform = await page.locator('.ending-end').evaluate(el => el.style.transform);
      await advance(page, 6000);
      assert.equal(await page.locator('.ending-end').evaluate(el => el.style.transform), transform);
      assert.equal(await page.locator('.ending-end img').getAttribute('src'), 'images/screenshots/dasende.avif');
      await page.screenshot({ path: path.join(output, `${layout}-end.png`) });
      await advance(page, 8000);
    }
    assert.equal(await page.locator('#endingScreen').count(), 0);
    const finished = await page.evaluate(() => endingQa.state());
    assert.equal(finished.locked, false); assert.equal(finished.location, 'town');
    assert.equal(finished.character.eventFlags.ending_credits_watched, true);
    assert.equal(finished.character.eventFlags.ending_credits_pending, false);
    assert.equal(await page.evaluate(() => document.querySelector('#townScreen').classList.contains('ending-suspended')), false);
    assert.equal(await page.evaluate(() => endingRafs.ending.size), 0);
    assert.equal(await page.evaluate(() => endingRafs.town.size), 1);
    await advance(page, 3500);
    await page.evaluate(() => endingQa.status());
    assert.equal(await page.locator('#royalMedal').isVisible(), true);
    await page.screenshot({ path: path.join(output, `${layout}-status.png`) });
    // Rewatch via the actual adventure-records entry, then cancel without re-awarding.
    const keyItems = finished.character.keyItems;
    await page.evaluate(async () => (await import('/js/menu.js')).openAdventureRecords());
    await page.locator('[data-adventure-record-id="endingReplay"]').click();
    assert.equal(await page.locator('#endingScreen').getAttribute('data-phase'), 'credits');
    await page.evaluate(() => endingQa.action('confirm')); await advance(page, 300);
    await page.evaluate(() => endingQa.action('confirm'));
    assert.equal(await page.locator('#endingScreen').count(), 0);
    assert.deepEqual(await page.evaluate(() => endingQa.state().character.keyItems), keyItems);
    assert.equal(await page.evaluate(() => endingRafs.ending.size), 0);
    assert.equal(await page.evaluate(() => endingRafs.town.size), 1);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#townPassersby')).visibility), 'visible');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.town-cloud-track')).animationPlayState), 'running');
    // BFCache-style interruption leaves ordinary town UI usable, with no presentation RAF.
    await page.evaluate(() => endingQa.runMainEnding({replay:true}));
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted:true})));
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true})));
    assert.equal(await page.locator('#endingScreen').count(), 0);
    assert.equal(await page.evaluate(() => endingRafs.ending.size), 0);
    assert.equal(await page.evaluate(() => endingRafs.town.size), 1);
    results.push({layout, reduced, paints, flags: finished.character.eventFlags.ending_credits_watched, replay:true, endingRafs:0, townRafs:1});
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({results, errors, warnings, output}, null, 2));
} finally { await browser.close(); }
