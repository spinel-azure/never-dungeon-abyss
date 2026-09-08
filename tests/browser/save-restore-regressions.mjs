// Browser integration QA. Start tools/dev-server.cjs on port 4173 before running.
// The injected hooks exist only in isolated browser contexts and never touch a player's save.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.SAVE_RESTORE_TEST_URL || "http://127.0.0.1:4173";
const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const hook = `
window.saveRestoreQa = {
  restoreTreasureFloor(depth) {
    character = normalizeCharacter(createInitialCharacter({ name: 'RESTORE QA', job: 'warrior' }));
    character.eventFlags.black_chests_unlocked = true;
    currentDepth = depth;
    buildBoundaryWallMap(depth, () => 0.9, {
      blackChestsUnlocked: true,
      goldWeaponEligible: false,
      maikaeferNestRoll: 1
    });
    const savedCells = structuredClone(cells);
    const redPositions = savedCells.flatMap((row, y) => row.flatMap((cell, x) => (
      cell.treasure === 'red' ? [{ x, y }] : []
    )));
    if (redPositions.length < 2) throw new Error('QA floor did not generate enough red chests');
    const openedPosition = redPositions.shift();
    savedCells[openedPosition.y][openedPosition.x].treasure = null;
    savedCells[openedPosition.y][openedPosition.x].treasureTrapId = null;
    const start = savedCells.flat().find(cell => cell.type === 'stairsUp');
    const save = {
      character: structuredClone(character),
      player: {
        gridX: start.x, gridY: start.y, dir: 0, torchFuel: 100,
        treasureCompassActive: false, npcEncounterCounts: {}, stairsPromptDismissed: false
      },
      world: { location: 'dungeon', town: {} },
      dungeon: {
        depth,
        cells: savedCells,
        explored: savedCells.map(row => row.map(() => false)),
        startPosition: { x: start.x, y: start.y },
        theme: { wall: 'default', floor: 'default' },
        presence: 0,
        presenceSuppressedSteps: 0,
        presenceIncreaseReduction: 0,
        runElapsedMs: 0,
        floorElapsedMs: 0
      }
    };
    buildBoundaryWallMap(1, () => 0.5, { maikaeferNestRoll: 1 });
    const restored = restoreGame(save);
    return {
      restored,
      depth: currentDepth,
      unopened: redPositions.map(({ x, y }) => cells[y][x].treasure),
      opened: cells[openedPosition.y][openedPosition.x].treasure,
      blackCount: cells.flat().filter(cell => cell.treasure === 'black').length
    };
  },
  showDepthProofSettlement() {
    character = createInitialCharacter({ name: 'SETTLEMENT QA', job: 'priest' });
    character.deckCost = 20;
    character.cards = grantCard(character.cards, 'legendary_deep_floor_proof', 1, character.deckCost).cards;
    character.cards.deckSlots[0] = 'legendary_deep_floor_proof';
    character.carriedExperience = 10000;
    character.pendingExperienceSettlement = createDepthReturnSettlement(character, 80);
    character = normalizeCharacter(structuredClone(character));
    showExperienceSettlement(character.pendingExperienceSettlement);
    const result = resolveInnStay(character);
    character = { ...character, ...result.changes };
    return {
      text: experienceSettlementDetail.textContent,
      visible: !experienceSettlementOverlay.hidden,
      gainedExperience: result.gainedExperience,
      experience: character.experience,
      pending: character.pendingExperienceSettlement
    };
  }
};`;

const instrumentedMain = mainSource.replace(
  '  document.documentElement.dataset.ndaMainReady = "true";',
  `${hook}\n  document.documentElement.dataset.ndaMainReady = "true";`
);
assert.notEqual(instrumentedMain, mainSource, "main QA hook was injected");

const browser = await chromium.launch({
  channel: process.env.SAVE_RESTORE_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

try {
  for (const viewport of [
    { name: "pc", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`${viewport.name}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`${viewport.name}: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentedMain
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.saveRestoreQa);

    for (const depth of [3, 10, 40, 80]) {
      const restored = await page.evaluate(value => saveRestoreQa.restoreTreasureFloor(value), depth);
      assert.equal(restored.restored, true, `${viewport.name} B${depth} restore succeeds`);
      assert.equal(restored.depth, depth);
      assert.deepEqual(restored.unopened, ["red", "red"], `${viewport.name} B${depth} unopened red chests survive`);
      assert.equal(restored.opened, null, `${viewport.name} B${depth} opened chest stays absent`);
      if (depth > 4) assert.equal(restored.blackCount, 1, `${viewport.name} B${depth} black chest survives`);
    }

    const settlement = await page.evaluate(() => saveRestoreQa.showDepthProofSettlement());
    assert.equal(settlement.visible, true);
    assert.match(settlement.text, /獲得経験値　　　　10,000/);
    assert.match(settlement.text, /深層帰還ボーナス　＋50％/);
    assert.match(settlement.text, /精算経験値　　　　15,000/);
    assert.equal(settlement.gainedExperience, 15_000);
    assert.equal(settlement.experience, 15_000);
    assert.equal(settlement.pending, null);
    results.push({ viewport: viewport.name, settlement: settlement.gainedExperience });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, pageErrors, consoleErrors }, null, 2));
