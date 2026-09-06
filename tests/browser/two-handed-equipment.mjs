// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The injected hook exists only in this isolated browser context.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.TWO_HANDED_TEST_URL || "http://127.0.0.1:4178";
const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const mainHook = `
window.twoHandedEquipmentQa = {
  setup(job, weaponId) {
    document.querySelector("#titleScreen").hidden = true;
    document.body.classList.remove("title-active");
    saveEnabled = false;
    character = createInitialCharacter({ name: "TWO HAND QA", job });
    const granted = grantEquipmentInstance(character, weaponId, "rightArmId");
    if (!granted.accepted) throw new Error("weapon grant failed: " + weaponId);
    character = normalizeCharacter(granted.character);
    worldLocation = "town";
    openTown({ registrationRequired: false });
    updateCharacterUi();
    openItemInventory();
  },
  input: handleMenuInput,
  snapshot: () => ({
    rightArmId: character.equipment.rightArmId,
    leftArmId: character.equipment.leftArmId,
    equippedLeftInstanceId: character.equippedInstanceIds.leftArmId,
    title: document.querySelector('[data-menu-view="inventory"] .menu-title').textContent,
    description: document.querySelector("[data-inventory-description]").textContent,
    comparison: document.querySelector("[data-inventory-compare]").textContent,
    buttons: [...document.querySelectorAll("[data-inventory-list] .inventory-entry")].map(button => ({
      text: button.textContent,
      unavailable: button.classList.contains("is-unavailable")
    }))
  })
};`;

const cases = [
  { width: 1280, height: 900, job: "warrior", weapon: "musashi_blade", weaponName: "ムサシブレード", leftName: "鉄の小盾" },
  { width: 390, height: 844, job: "priest", weapon: "sylvan_emera", weaponName: "シルワンエメラ", leftName: "木の盾" },
  { width: 820, height: 1180, job: "mage", weapon: "comet_booster", weaponName: "コメットブースター", leftName: "初級魔導書" }
];

const browser = await chromium.launch({ channel: process.env.TWO_HANDED_TEST_CHANNEL || "msedge", headless: true });
const results = [];
try {
  for (const testCase of cases) {
    const errors = [];
    const context = await browser.newContext({ viewport: { width: testCase.width, height: testCase.height } });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: mainSource.replace(
        '  document.documentElement.dataset.ndaMainReady = "true";',
        `${mainHook}\n  document.documentElement.dataset.ndaMainReady = "true";`
      )
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.twoHandedEquipmentQa);
    await page.evaluate(({ job, weapon }) => twoHandedEquipmentQa.setup(job, weapon), testCase);
    await page.locator('[data-inventory-tab="equipment"]').click();

    await page.getByRole("button", { name: new RegExp(testCase.weaponName) }).click();
    await page.evaluate(() => twoHandedEquipmentQa.input("confirm"));
    await page.evaluate(() => twoHandedEquipmentQa.input("confirm"));
    let snapshot = await page.evaluate(() => twoHandedEquipmentQa.snapshot());
    assert.equal(snapshot.rightArmId, testCase.weapon);
    assert.equal(snapshot.leftArmId, null);
    assert.equal(snapshot.equippedLeftInstanceId, null);

    await page.getByRole("button", { name: new RegExp(testCase.leftName) }).click();
    snapshot = await page.evaluate(() => twoHandedEquipmentQa.snapshot());
    assert.equal(snapshot.buttons.find(button => button.text.includes(testCase.leftName))?.unavailable, true);
    assert.match(snapshot.comparison, /両手武器の装備中は左手装備を使用できません。/);

    await page.evaluate(() => twoHandedEquipmentQa.input("confirm"));
    snapshot = await page.evaluate(() => twoHandedEquipmentQa.snapshot());
    assert.equal(snapshot.title, "EQUIPMENT : LEFT ARM");
    assert.deepEqual(snapshot.buttons.map(button => button.text), ["装備なし"]);
    assert.equal(snapshot.leftArmId, null);
    assert.equal(snapshot.equippedLeftInstanceId, null);
    assert.deepEqual(errors, []);
    results.push({ viewport: `${testCase.width}x${testCase.height}`, weapon: testCase.weapon, errors });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
