// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The injected hooks exist only in this isolated browser context.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.NPC_RENEWAL_TEST_URL || "http://127.0.0.1:4176";
const townSource = await readFile(new URL("../../js/town.js", import.meta.url), "utf8");
const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const townHook = `
window.npcRenewalTownQa = {
  openStorageEquipmentPageTwo() {
    openCommerce("storageWithdraw");
    setStorageCategory("equipment");
    changeStoragePage(1);
  },
  openRenewal: openPendingNpcRenewal,
  openSearch: () => openNpcManagement("search"),
  openRoster: () => openNpcManagement("roster"),
  input: handleTownInput,
  snapshot: () => ({
    mode: town.mode,
    storagePage: town.storagePage,
    storageFocus: town.storageFocus,
    commerceKind: town.commerceKind,
    isStorage: town.commerceOverlay.classList.contains("is-storage"),
    overlayHidden: town.commerceOverlay.hidden,
    tabsHidden: town.storageTabs.hidden,
    descriptionHidden: town.storageDescription.hidden,
    description: town.storageDescription.textContent,
    pagerHidden: town.storagePager.hidden,
    page: town.storagePageEl.textContent,
    quantityHidden: town.commerceQuantityControls.hidden,
    goldHidden: town.commerceGold.parentElement.hidden,
    title: town.commerceTitle.textContent,
    entries: [...town.commerceList.children].map(entry => entry.textContent),
    message: town.messageEl.textContent,
    portraitHidden: town.portrait.hidden,
    commandsHidden: town.commandRoot.hidden
  })
};`;
const mainHook = `window.npcRenewalMainQa = {
  setup() {
    document.querySelector("#titleScreen").hidden = true;
    document.body.classList.remove("title-active");
    saveEnabled = true;
    character = createInitialCharacter({ name: "RENEWAL QA", job: "mage" });
    character.gold = 100000;
    for (const id of ["alec", "rebecca", "erika"]) {
      const registered = registerNpc(character.npcSystem, id);
      character = { ...character, npcSystem: registered.system };
      character = hireNpc(character, id).character;
    }
    this.setWarehouseCount(11);
    openTown({ registrationRequired: false, facilityId: "shop", mode: "facilityMenu" });
    updateCharacterUi();
  },
  setWarehouseCount(count) {
    const seed = character.equipmentInventory.instances[0];
    character = {
      ...character,
      warehouse: {
        ...character.warehouse,
        equipmentInstances: Array.from({ length: count }, (_, index) => ({
          ...seed,
          instanceId: "qa-warehouse-" + index,
          acquiredOrder: index + 1
        }))
      }
    };
  },
  returnWithRenewal() {
    character = beginNpcRenewal(character, "qa-return");
    openTown({ registrationRequired: false, facilityId: "dungeon", mode: "dungeonEntrance" });
    updateCharacterUi();
  },
  showShop() {
    openTown({ registrationRequired: false, facilityId: "shop", mode: "facilityMenu" });
  },
  state: () => structuredClone(character)
};`;

const browser = await chromium.launch({ channel: process.env.NPC_RENEWAL_TEST_CHANNEL || "msedge", headless: true });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/js/town.js", route => route.fulfill({
    contentType: "text/javascript",
    body: `${townSource}\n${townHook}`
  }));
  await page.route("**/js/main.js?*", route => route.fulfill({
    contentType: "text/javascript",
    body: mainSource.replace(
      '  document.documentElement.dataset.ndaMainReady = "true";',
      `${mainHook}\n  document.documentElement.dataset.ndaMainReady = "true";`
    )
  }));
  await page.goto(origin);
  await page.waitForFunction(() => window.npcRenewalMainQa && window.npcRenewalTownQa);
  await page.evaluate(() => npcRenewalMainQa.setup());

  await page.evaluate(() => npcRenewalTownQa.openStorageEquipmentPageTwo());
  const storage = await page.evaluate(() => npcRenewalTownQa.snapshot());
  assert.equal(storage.isStorage, true);
  assert.equal(storage.tabsHidden, false);
  assert.equal(storage.descriptionHidden, false);
  assert.equal(storage.pagerHidden, false);
  assert.equal(storage.page, "2/2");

  await page.evaluate(() => {
    document.querySelector("#townCommerceQuantityControls").hidden = false;
    npcRenewalMainQa.returnWithRenewal();
    npcRenewalTownQa.openRenewal();
  });
  const renewal = await page.evaluate(() => npcRenewalTownQa.snapshot());
  assert.equal(renewal.mode, "npcManagement");
  assert.equal(renewal.title, "雇用更新");
  assert.equal(renewal.entries.length, 3);
  assert.ok(renewal.entries.every(entry => /G$/.test(entry)));
  assert.match(renewal.message, /更新費用：\d+G　所持金：\d+G/);
  assert.equal(renewal.portraitHidden, false);
  assert.equal(renewal.isStorage, false);
  assert.equal(renewal.tabsHidden, true);
  assert.equal(renewal.descriptionHidden, true);
  assert.equal(renewal.description, "");
  assert.equal(renewal.pagerHidden, true);
  assert.equal(renewal.quantityHidden, true);
  assert.equal(renewal.goldHidden, false);
  assert.equal(renewal.storagePage, 0);
  assert.equal(renewal.storageFocus, "list");
  assert.equal(renewal.commerceKind, "");
  assert.equal(renewal.commandsHidden, true);

  await page.evaluate(() => npcRenewalTownQa.input("confirm"));
  assert.equal((await page.evaluate(() => npcRenewalTownQa.snapshot())).entries.length, 2);
  await page.evaluate(() => npcRenewalTownQa.input("cancel"));
  assert.equal((await page.evaluate(() => npcRenewalTownQa.snapshot())).entries.length, 1);
  await page.evaluate(() => npcRenewalTownQa.input("cancel"));
  const returned = await page.evaluate(() => npcRenewalTownQa.snapshot());
  assert.equal(returned.mode, "dungeonEntrance");
  assert.equal(returned.overlayHidden, true);
  assert.equal(returned.commandsHidden, false);
  assert.deepEqual((await page.evaluate(() => npcRenewalMainQa.state())).npcSystem.activeIds, ["alec"]);

  await page.evaluate(() => {
    npcRenewalMainQa.showShop();
    npcRenewalTownQa.openStorageEquipmentPageTwo();
    npcRenewalTownQa.openSearch();
  });
  const search = await page.evaluate(() => npcRenewalTownQa.snapshot());
  assert.equal(search.title, "NPCを探す");
  assert.equal(search.entries.length, 1);
  assert.equal(search.isStorage, false);
  assert.equal(search.descriptionHidden, true);
  assert.equal(search.pagerHidden, true);
  await page.evaluate(() => npcRenewalTownQa.input("cancel"));

  await page.evaluate(() => {
    npcRenewalMainQa.setWarehouseCount(1);
    npcRenewalMainQa.showShop();
    npcRenewalTownQa.openStorageEquipmentPageTwo();
    npcRenewalTownQa.openRoster();
  });
  const roster = await page.evaluate(() => npcRenewalTownQa.snapshot());
  assert.equal(roster.title, "名簿から雇用");
  assert.equal(roster.entries.length, 3);
  assert.equal(roster.isStorage, false);
  assert.equal(roster.tabsHidden, true);
  assert.equal(roster.descriptionHidden, true);
  assert.equal(roster.pagerHidden, true);
  assert.equal(roster.quantityHidden, true);
  assert.equal(roster.goldHidden, false);
  await page.evaluate(() => npcRenewalTownQa.input("cancel"));
  assert.equal((await page.evaluate(() => npcRenewalTownQa.snapshot())).overlayHidden, true);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ storagePage: storage.page, renewalEntries: renewal.entries.length, normalPaths: [search.title, roster.title], errors }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
