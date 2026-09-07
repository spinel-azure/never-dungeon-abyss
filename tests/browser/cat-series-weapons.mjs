// Browser integration QA. Start tools/dev-server.cjs on port 4179 before running.
// The injected hooks exist only in isolated browser contexts and never touch a player's save.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.CAT_WEAPON_TEST_URL || "http://127.0.0.1:4179";
const output = process.env.CAT_WEAPON_TEST_OUTPUT || path.join(os.tmpdir(), "nda-cat-weapons-qa");
const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const battleSource = await readFile(new URL("../../js/battle.js", import.meta.url), "utf8");
const instrumentedBattleSource = battleSource.replace(
  'function showBattleNumber(targetSide, amount, kind, hitIndex = null, hitCount = 1, targetIndex = null) {',
  `function showBattleNumber(targetSide, amount, kind, hitIndex = null, hitCount = 1, targetIndex = null) {
  window.catWeaponDisplayedNumbers ||= [];
  window.catWeaponDisplayedNumbers.push({ targetSide, amount, kind, hitIndex, hitCount, targetIndex });`
);
const hook = `
window.catWeaponQa = {
  async baseCharacter(job) {
    character = createInitialCharacter({ name: 'CAT QA', job });
    character.level = 100;
    character = normalizeCharacter(character);
    character.eventFlags.black_chests_unlocked = true;
    character.lootBagTutorialSeen = true;
    saveEnabled = false;
    setBgmOptions({ enabled: false }); setSeOptions({ enabled: false });
    document.querySelector('#titleScreen').hidden = true;
    document.body.classList.remove('title-active');
    closeCampMenu('test'); closeTown();
    return character;
  },
  async showGoldChest() {
    await this.baseCharacter('mage');
    currentDepth = 90; worldLocation = 'dungeon';
    buildBoundaryWallMap(90, () => 0, { blackChestsUnlocked: true, goldWeaponEligible: true });
    const types = cells.flat().map(cell => cell.treasure).filter(Boolean);
    document.documentElement.dataset.catGoldOpening = 'pending';
    await playTreasureOpening('gold', () => {
      document.documentElement.dataset.catGoldOpening = 'complete';
    });
    return { types, canvasVisibility: getComputedStyle(treasureCanvas).visibility };
  },
  awardAndIdentify() {
    hideTreasure();
    const reward = awardTreasureLoot('gold');
    const bag = structuredClone(character.lootBag);
    const settled = settleLootBag(character);
    character = normalizeCharacter(settled.character);
    showLootIdentification(bag, settled, { playBgm: false });
    return {
      reward,
      bag: structuredClone(bag),
      eligible: isGoldChestWeaponEligible(character, currentDepth)
    };
  },
  identifyNow() {
    completeLootIdentification(pendingLootIdentification);
  },
  closeIdentification() {
    handleLootIdentifyInput('confirm');
  },
  openInventory() {
    openItemInventory();
  },
  state() {
    return structuredClone(character);
  },
  lootRows() {
    return [...document.querySelectorAll('#lootIdentifyList .loot-identify-entry')].map(row => ({
      text: row.textContent, className: row.className
    }));
  },
  inventoryText() {
    return {
      description: document.querySelector('[data-inventory-description]')?.textContent || '',
      comparison: document.querySelector('[data-inventory-compare]')?.textContent || '',
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    };
  },
  persist() {
    saveEnabled = true;
    return saveGame();
  },
  restoreSavedGoldFloor() {
    const saved = loadGame('auto');
    if (!saved) throw new Error('cat weapon QA floor save was not restored');
    character = normalizeCharacter(saved.character);
    const restored = restoreGame(saved);
    saveEnabled = false;
    document.querySelector('#titleScreen').hidden = true;
    document.body.classList.remove('title-active');
    return {
      restored,
      depth: currentDepth,
      treasures: cells.flat().map(cell => cell.treasure).filter(Boolean)
    };
  },
  restoreSavedCat() {
    const saved = loadGame('auto');
    if (!saved) throw new Error('cat weapon QA save was not restored');
    character = normalizeCharacter(saved.character);
    currentDepth = Math.max(1, Number(saved.dungeon?.depth) || 1);
    const instance = character.equipmentInventory.instances.find(entry => entry.equipmentId === 'katzenstab');
    return {
      equipmentId: instance?.equipmentId || null,
      enhancement: instance?.enhancement ?? null,
      eligible: isGoldChestWeaponEligible(character, currentDepth),
      duplicateRollReason: rollGoldChestLoot(character, currentDepth).reason || ''
    };
  },
  async setupBattle(job, weaponId, { multiple = false } = {}) {
    await this.baseCharacter(job);
    const equipmentApi = await import('/data/equipment-inventory.js');
    const granted = equipmentApi.grantEquipmentInstance(character, weaponId, 'rightArmId');
    if (!granted.accepted) throw new Error('grant failed: ' + weaponId);
    const equipped = equipmentApi.equipInstance(granted.character, 'rightArmId', granted.instance.instanceId);
    if (!equipped.accepted) throw new Error('equip failed: ' + weaponId);
    character = normalizeCharacter(equipped.character);
    character.hp = job === 'warrior' ? Math.floor(character.maxHp * .5)
      : job === 'priest' ? character.maxHp - 100 : character.maxHp;
    character.sp = job === 'priest' ? character.maxSp - 20 : character.maxSp;
    currentDepth = 90; worldLocation = 'dungeon';
    // 0.25 keeps attacks deterministic without triggering the warrior/thief
    // instant-death passives, while still exercising the 30% cat recast.
    Math.random = () => 0.25;
    const makeEnemy = index => {
      const enemy = createEnemyCombatant(getEnemyById('schleipnir'));
      enemy.id = 'cat_qa_' + index;
      enemy.name = 'CAT QA DUMMY ' + index;
      enemy.hp = enemy.maxHp = 999999;
      enemy.actions = [{ weight: 1, action: {
        id: 'cat_qa_wait', name: '待機', actionType: 'wait', speedModifier: -999,
        waitMessage: 'ダミーは待機している。'
      } }];
      return enemy;
    };
    const enemies = multiple ? [makeEnemy(0), makeEnemy(1)] : null;
    const enemy = enemies?.[0] || makeEnemy(0);
    const before = { hp: character.hp, sp: character.sp, maxHp: character.maxHp, maxSp: character.maxSp };
    const started = startBattle(enemy, { playStartSe: false, enemies });
    return { started, before };
  },
  input(action) {
    return handleBattleInput(action);
  },
  async battleState() {
    this.battleModule ||= await import('./battle.js');
    return this.battleModule.getCatWeaponBrowserState();
  }
};`;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CAT_WEAPON_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

async function openQaPage(context, layout) {
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(`${layout}: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(`${layout}: ${message.text()}`);
  });
  await page.route("**/js/battle.js", route => route.fulfill({
    contentType: "text/javascript",
    body: `${instrumentedBattleSource}\nexport function getCatWeaponBrowserState() {\n  const battle = battleUi.battle;\n  return structuredClone({ active: battleUi.active, presenting: battleUi.presenting, turn: battle?.turn || 0, outcome: battle?.outcome || null, player: battle?.player || null, log: battle?.log || [], presentationEvents: battle?.presentationEvents || [] });\n}`
  }));
  await page.route("**/js/main.js?*", route => route.fulfill({
    contentType: "text/javascript",
    body: mainSource.replace(
      '  document.documentElement.dataset.ndaMainReady = "true";',
      `${hook}\n  document.documentElement.dataset.ndaMainReady = "true";`
    )
  }));
  await page.goto(origin);
  await page.waitForFunction(() => window.catWeaponQa);
  return page;
}

async function observeBattleNumbers(page) {
  await page.evaluate(() => {
    window.catWeaponDisplayedNumbers = [];
    window.catWeaponSkillEffectCycles = 0;
    window.catWeaponObservedNumbers = [];
    window.catWeaponNumberObserver?.disconnect();
    window.catWeaponNumberObserver = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && node.matches('.battle-number')) {
          window.catWeaponObservedNumbers.push({ text: node.textContent, className: node.className });
        }
      }
    });
    window.catWeaponNumberObserver.observe(document.querySelector('#battleScreen'), { childList: true, subtree: true });
    window.catWeaponSkillEffectObserver?.disconnect();
    const effectCanvas = document.querySelector('#battleSkillEffectCanvas');
    window.catWeaponSkillEffectObserver = new MutationObserver(() => {
      if (!effectCanvas.hidden) window.catWeaponSkillEffectCycles += 1;
    });
    window.catWeaponSkillEffectObserver.observe(effectCanvas, { attributes: true, attributeFilter: ['hidden'] });
  });
}

async function waitForRound(page, definition) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const snapshot = await page.evaluate(async () => ({
      state: await catWeaponQa.battleState(),
      damagePopups: window.catWeaponDisplayedNumbers
        ?.filter(entry => entry.kind === 'damage').length || 0,
      skillEffectCycles: window.catWeaponSkillEffectCycles || 0
    }));
    const presentationCount = definition.weapon === 'katzenstab'
      ? snapshot.skillEffectCycles : snapshot.damagePopups;
    if (presentationCount >= definition.attackEvents
      && !snapshot.state.presenting && snapshot.state.turn > 1) return snapshot.state;
    await page.waitForTimeout(100);
  }
  throw new Error('battle round presentation timeout');
}

async function runBattleCase(page, definition, layout) {
  await page.reload();
  await page.waitForFunction(() => window.catWeaponQa);
  const setup = await page.evaluate(testCase => catWeaponQa.setupBattle(
    testCase.job, testCase.weapon, { multiple: Boolean(testCase.skill) }
  ), definition);
  assert.equal(setup.started, true, `${layout} ${definition.weapon} starts`);
  await page.waitForFunction(() => !document.querySelector('#battleScreen').hidden);
  await observeBattleNumbers(page);
  if (definition.skill) {
    await page.evaluate(() => { catWeaponQa.input('right'); catWeaponQa.input('confirm'); });
    await page.locator('#skillOverlay').waitFor({ state: 'visible' });
    await page.locator(`#skillOverlay [data-skill-id="${definition.skill}"]`).click();
  } else {
    await page.evaluate(() => catWeaponQa.input('confirm'));
  }
  let battle;
  try {
    battle = await waitForRound(page, definition);
  } catch (error) {
    const diagnostic = await page.evaluate(async () => ({
      message: document.querySelector('#battleMessage')?.textContent || '',
      state: await catWeaponQa.battleState(),
      displayedNumbers: window.catWeaponDisplayedNumbers || []
    }));
    throw new Error(`${layout} ${definition.weapon} did not complete its round: ${JSON.stringify(diagnostic)}`, { cause: error });
  }
  assert.match(battle.log.join('\n'), definition.log, `${layout} ${definition.weapon} log`);
  const numbers = await page.evaluate(() => window.catWeaponObservedNumbers);
  const displayedNumbers = await page.evaluate(() => window.catWeaponDisplayedNumbers);
  const skillEffectCycles = await page.evaluate(() => window.catWeaponSkillEffectCycles);
  const damagePopups = displayedNumbers.filter(entry => entry.kind === 'damage').length;
  if (definition.weapon === 'katzenstab') {
    assert.equal(skillEffectCycles, definition.attackEvents,
      `${layout} ${definition.weapon} plays the damage-bearing spell effect for every hit`);
  } else {
    assert.equal(damagePopups, definition.attackEvents,
      `${layout} ${definition.weapon} shows every damage popup`);
  }
  if (definition.weapon === 'katzenkolben') {
    assert.ok(displayedNumbers.some(entry => entry.kind === 'healing'), `${layout} priest HP popup`);
    assert.ok(displayedNumbers.some(entry => entry.kind === 'sp-healing'), `${layout} priest SP popup`);
    assert.equal(battle.player.hp, setup.before.hp + Math.ceil(setup.before.maxHp * .1));
    assert.equal(battle.player.sp, setup.before.sp + 10);
  }
  if (definition.weapon === 'katzenstab') {
    assert.equal(setup.before.sp - battle.player.sp, 6, `${layout} reduced SP is paid once`);
  }
  assert.ok(await page.locator('#battleScreen').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= -1 && bounds.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth;
  }), `${layout} ${definition.weapon} battle layout`);
  await page.screenshot({ path: path.join(output, `${layout}-${definition.weapon}.png`) });
  results.push({ layout, weapon: definition.weapon, damagePopups, skillEffectCycles, observedNumbers: numbers.length });
}

try {
  for (const [layout, width, height] of [["pc", 1280, 900], ["mobile", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    let page = await openQaPage(context, layout);
    const chest = await page.evaluate(() => catWeaponQa.showGoldChest());
    assert.deepEqual(chest.types, ['gold'], `${layout} B90 has one gold replacement`);
    assert.equal(chest.canvasVisibility, 'visible');
    await page.waitForFunction(() => document.documentElement.dataset.catGoldOpening === 'complete', null, { timeout: 10000 });
    await page.screenshot({ path: path.join(output, `${layout}-gold-chest.png`) });
    assert.equal(await page.evaluate(() => catWeaponQa.persist()), true, `${layout} unopened gold floor autosave succeeds`);
    await page.reload();
    await page.waitForFunction(() => window.catWeaponQa);
    const restoredFloor = await page.evaluate(() => catWeaponQa.restoreSavedGoldFloor());
    assert.deepEqual(restoredFloor, { restored: true, depth: 90, treasures: ['gold'] },
      `${layout} loading the saved floor does not reroll the gold chest`);

    const awarded = await page.evaluate(() => catWeaponQa.awardAndIdentify());
    assert.match(awarded.reward.message, /？両手杖/);
    assert.equal(awarded.bag.equipmentInstances[0].equipmentId, 'katzenstab');
    assert.equal(awarded.bag.equipmentInstances[0].enhancement, 0);
    assert.equal(awarded.eligible, false);
    let rows = await page.evaluate(() => catWeaponQa.lootRows());
    assert.match(rows[0].text, /？両手杖/);
    assert.match(rows[0].className, /is-special-unique/);
    await page.screenshot({ path: path.join(output, `${layout}-loot-orange.png`) });
    await page.evaluate(() => catWeaponQa.identifyNow());
    rows = await page.evaluate(() => catWeaponQa.lootRows());
    assert.match(rows[0].text, /カッツェンシュタープ/);
    await page.evaluate(() => { catWeaponQa.closeIdentification(); catWeaponQa.openInventory(); });
    await page.locator('[data-inventory-tab="equipment"]').click();
    await page.getByRole('button', { name: /カッツェンシュタープ/ }).click();
    const inventory = await page.evaluate(() => catWeaponQa.inventoryText());
    assert.match(inventory.description, /武器種：両手杖/);
    assert.match(inventory.description, /ATK \+1/);
    assert.match(inventory.description, /INT \+15/);
    assert.match(inventory.description, /MAXSP \+150/);
    assert.match(inventory.description, /攻撃呪文威力 \+35%/);
    assert.match(inventory.description, /消費SP－25%/);
    assert.match(inventory.description, /30％で再詠唱/);
    assert.match(inventory.comparison, /SPELL 0% → 35%/);
    assert.match(inventory.comparison, /SP CUT 0% → 25%/);
    assert.ok(inventory.pageWidth <= inventory.viewportWidth, `${layout} inventory fits viewport`);
    await page.screenshot({ path: path.join(output, `${layout}-equipment-detail.png`) });
    assert.equal(await page.evaluate(() => catWeaponQa.persist()), true, `${layout} autosave succeeds`);
    await page.reload();
    await page.waitForFunction(() => window.catWeaponQa);
    const restored = await page.evaluate(() => catWeaponQa.restoreSavedCat());
    assert.deepEqual(restored, {
      equipmentId: 'katzenstab', enhancement: 0, eligible: false, duplicateRollReason: 'alreadyOwned'
    }, `${layout} save reload preserves the weapon and duplicate prevention`);
    await page.close();

    for (const battleCase of [
      { job: 'warrior', weapon: 'katzbalger', attackEvents: 2, log: /猛猫の追撃/ },
      { job: 'thief', weapon: 'katzendolch', attackEvents: 4, log: /合計/ },
      { job: 'priest', weapon: 'katzenkolben', attackEvents: 1, log: /肉球の祝福/ },
      { job: 'mage', weapon: 'katzenstab', skill: 'flame_sweep', attackEvents: 4, log: /猫の気まぐれでもう一度詠唱/ }
    ]) {
      page = await openQaPage(context, layout);
      await runBattleCase(page, battleCase, layout);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, pageErrors, consoleErrors, screenshots: output }, null, 2));
