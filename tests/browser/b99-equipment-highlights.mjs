// Browser integration QA. Start tools/dev-server.cjs on port 4179 before running.
// The injected hooks exist only in isolated browser contexts and do not use a player's save.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.B99_EQUIPMENT_TEST_URL || "http://127.0.0.1:4179";
const output = process.env.B99_EQUIPMENT_TEST_OUTPUT || path.join(os.tmpdir(), "nda-b99-equipment-qa");
const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const playerSource = await readFile(new URL("../../js/player.js", import.meta.url), "utf8");

const instrumentedPlayerSource = `${playerSource}
export function showB99RemainsForQa() {
  startBossRemainsEvent("seelenwuerger_b99f");
}`;

const hook = `
window.b99EquipmentQa = {
  async baseCharacter() {
    character = createInitialCharacter({ name: 'B99 QA', job: 'warrior' });
    character.level = 100;
    character = normalizeCharacter(character);
    saveEnabled = false;
    setBgmOptions({ enabled: false });
    setSeOptions({ enabled: false });
    document.querySelector('#titleScreen').hidden = true;
    document.body.classList.remove('title-active');
    closeCampMenu('test');
    closeTown();
    return character;
  },
  async setupEquipmentHighlights() {
    await this.baseCharacter();
    const api = await import('/data/equipment-inventory.js');
    let result = api.grantEquipmentInstance(character, 'frostsilver_longsword', 'rightArmId', { enhancement: 3 });
    if (!result.accepted) throw new Error('plus-three grant failed');
    character = result.character;
    result = api.grantEquipmentInstance(character, 'musashi_blade', 'rightArmId');
    if (!result.accepted) throw new Error('unique grant failed');
    character = normalizeCharacter(result.character);
    worldLocation = 'town';
    openTown({ registrationRequired: false });
    openItemInventory();
    return true;
  },
  async showStatus(equipmentId) {
    const api = await import('/data/equipment-inventory.js');
    closeCampMenu('test');
    const instance = character.equipmentInventory.instances.find(entry => entry.equipmentId === equipmentId);
    const equipped = api.equipInstance(character, 'rightArmId', instance?.instanceId || null);
    if (!equipped.accepted) throw new Error('status equip failed: ' + equipmentId);
    character = normalizeCharacter(equipped.character);
    openStatusMenu();
    const name = document.querySelector('[data-equipment-slot="rightArmId"] .nde-equipment-name');
    return { text: name?.textContent || '', className: name?.className || '', color: name ? getComputedStyle(name).color : '' };
  },
  confirmMenu() {
    return handleMenuInput('confirm');
  },
  async setupB99(lightbringerOwned = false) {
    await this.baseCharacter();
    if (lightbringerOwned) character = { ...character, keyItems: grantKeyItem(character.keyItems, 'lichtbringer').keyItems };
    currentDepth = 99;
    worldLocation = 'dungeon';
    buildBoundaryWallMap(99, () => 0.5, getDungeonProgress());
    setDungeonColors(resolveCurrentFloorTheme());
    applyCurrentFloorMist();
    updateHud();
    const chest = cells.flat().find(cell => cell.eventTreasureId === 'red_rust_key_b99f_chest');
    const playerApi = await import('/js/player.js');
    playerApi.startBossEvent('seelenwuerger_b99f', 2, 2);
    return {
      chest: chest ? { treasure: chest.treasure, eventTreasureId: chest.eventTreasureId } : null,
      overlay: structuredClone(state.overlayEvent),
      message: document.querySelector('#message')?.textContent || ''
    };
  },
  async showKeyChest() {
    await showTreasure('gold');
    return getComputedStyle(treasureCanvas).visibility;
  },
  restoreLegacyB99MissingChest() {
    state.overlayEvent = null;
    for (const cell of cells.flat()) {
      if (cell.eventTreasureId !== 'red_rust_key_b99f_chest') continue;
      cell.treasure = null;
      cell.treasureTrapId = null;
      cell.eventTreasureId = null;
    }
    const playerCell = { x: state.gridX, y: state.gridY };
    const restored = restoreGame(makeSaveSnapshot());
    const chest = cells.flat().find(cell => cell.eventTreasureId === 'red_rust_key_b99f_chest');
    return {
      restored,
      chest: chest ? { x: chest.x, y: chest.y, treasure: chest.treasure } : null,
      playerCell
    };
  },
  awardB99Key() {
    const reward = awardTreasureLoot('gold', 'red_rust_key_b99f_chest');
    return { reward, owned: hasKeyItem(character.keyItems, 'red_rust_key_b99f') };
  },
  async showRemains() {
    const playerApi = await import('/js/player.js');
    playerApi.showB99RemainsForQa();
    return {
      overlay: structuredClone(state.overlayEvent),
      message: document.querySelector('#message')?.textContent || ''
    };
  },
  overlay() {
    return {
      overlay: structuredClone(state.overlayEvent),
      message: document.querySelector('#message')?.textContent || '',
      battleVisible: !document.querySelector('#battleScreen')?.hidden
    };
  }
};`;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.B99_EQUIPMENT_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

for (const layout of [
  { name: "pc", viewport: { width: 1280, height: 900 }, hasTouch: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, hasTouch: true }
]) {
  const context = await browser.newContext({ viewport: layout.viewport, hasTouch: layout.hasTouch });
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(`${layout.name}: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(`${layout.name}: ${message.text()}`);
  });
  await page.route("**/js/player.js", route => route.fulfill({
    contentType: "text/javascript",
    body: instrumentedPlayerSource
  }));
  await page.route("**/js/main.js?*", route => route.fulfill({
    contentType: "text/javascript",
    body: mainSource.replace(
      '  document.documentElement.dataset.ndaMainReady = "true";',
      `${hook}\n  document.documentElement.dataset.ndaMainReady = "true";`
    )
  }));
  await page.goto(origin);
  await page.waitForFunction(() => window.b99EquipmentQa);

  await page.evaluate(() => b99EquipmentQa.setupEquipmentHighlights());
  await page.locator('[data-inventory-tab="equipment"]').click();
  const inventoryColors = await page.evaluate(() => [...document.querySelectorAll('.inventory-entry .equipment-name')].map(name => ({
    text: name.textContent,
    className: name.className,
    color: getComputedStyle(name).color
  })));
  const plusInventory = inventoryColors.find(entry => entry.text === '霜銀の長剣＋3');
  const uniqueInventory = inventoryColors.find(entry => entry.text === 'ムサシブレード');
  assert.match(plusInventory?.className || '', /is-super-rare/);
  assert.equal(plusInventory?.color, 'rgb(255, 228, 92)');
  assert.match(uniqueInventory?.className || '', /is-special-unique/);
  assert.equal(uniqueInventory?.color, 'rgb(255, 157, 46)');

  await page.locator('.inventory-entry', { hasText: '霜銀の長剣＋3' }).click();
  await page.evaluate(() => b99EquipmentQa.confirmMenu());
  await page.waitForFunction(() => document.querySelector('.inventory-panel .menu-title')?.textContent.startsWith('EQUIPMENT'));
  const equipmentSelectionColors = await page.evaluate(() => [...document.querySelectorAll('.inventory-entry .equipment-name')].map(name => ({
    text: name.textContent,
    className: name.className,
    color: getComputedStyle(name).color
  })));
  assert.match(equipmentSelectionColors.find(entry => entry.text === '霜銀の長剣＋3')?.className || '', /is-super-rare/);
  assert.match(equipmentSelectionColors.find(entry => entry.text === 'ムサシブレード')?.className || '', /is-special-unique/);

  const plusStatus = await page.evaluate(() => b99EquipmentQa.showStatus('frostsilver_longsword'));
  assert.match(plusStatus.className, /is-super-rare/);
  assert.equal(plusStatus.color, 'rgb(255, 228, 92)');
  const uniqueStatus = await page.evaluate(() => b99EquipmentQa.showStatus('musashi_blade'));
  assert.match(uniqueStatus.className, /is-special-unique/);
  assert.equal(uniqueStatus.color, 'rgb(255, 157, 46)');

  await page.reload();
  await page.waitForFunction(() => window.b99EquipmentQa);
  const noLight = await page.evaluate(() => b99EquipmentQa.setupB99(false));
  assert.deepEqual(noLight.chest, { treasure: 'gold', eventTreasureId: 'red_rust_key_b99f_chest' });
  assert.equal(noLight.overlay.imageId, 'seelenwuerger_before_b99f');
  assert.match(noLight.message, /この漆黒の中で私に抗う事など出来ぬ/);
  await page.screenshot({ path: path.join(output, `${layout.name}-b99-before.png`), fullPage: true });

  const restoredLegacy = await page.evaluate(() => b99EquipmentQa.restoreLegacyB99MissingChest());
  assert.equal(restoredLegacy.restored, true);
  assert.equal(restoredLegacy.chest?.treasure, 'gold');
  assert.notDeepEqual(
    { x: restoredLegacy.chest?.x, y: restoredLegacy.chest?.y },
    restoredLegacy.playerCell
  );

  const chestVisible = await page.evaluate(() => b99EquipmentQa.showKeyChest());
  assert.equal(chestVisible, 'visible');
  const key = await page.evaluate(() => b99EquipmentQa.awardB99Key());
  assert.equal(key.reward.message, '赤錆びた鍵を手に入れた！');
  assert.equal(key.owned, true);
  await page.reload();
  await page.waitForFunction(() => window.b99EquipmentQa);
  const withLight = await page.evaluate(() => b99EquipmentQa.setupB99(true));
  assert.equal(withLight.overlay.imageId, 'seelenwuerger_before_b99f');
  assert.match(withLight.message, /リヒトブリンガー？…忌々しい…！/);
  await page.locator('#buttonA').dispatchEvent('click');
  await page.waitForFunction(() => !document.querySelector('#battleScreen').hidden);
  const afterConfirm = await page.evaluate(() => b99EquipmentQa.overlay());
  assert.equal(afterConfirm.overlay, null);
  assert.equal(afterConfirm.battleVisible, true);

  await page.reload();
  await page.waitForFunction(() => window.b99EquipmentQa);
  await page.evaluate(() => b99EquipmentQa.setupB99(true));
  const remains = await page.evaluate(() => b99EquipmentQa.showRemains());
  assert.equal(remains.overlay.imageId, 'seelenwuerger_after_b99f');
  assert.match(remains.message, /漆黒の影は消え/);
  await page.screenshot({ path: path.join(output, `${layout.name}-b99-after.png`), fullPage: true });

  results.push({
    layout: layout.name,
    inventory: { plus: plusInventory, unique: uniqueInventory },
    status: { plus: plusStatus, unique: uniqueStatus },
    keyChest: noLight.chest,
    preBattleImages: [noLight.overlay.imageId, remains.overlay.imageId]
  });
  await context.close();
}

await browser.close();
assert.deepEqual(pageErrors, []);
assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ results, pageErrors, consoleErrors, output }, null, 2));
