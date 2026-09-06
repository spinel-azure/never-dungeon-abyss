// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The shipped page, town quest renderer, dungeon overlay renderer, shared input,
// item overlay, battle UI, and battle engine run with an isolated in-memory save.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.MAERCHENTIERE_TEST_URL || "http://127.0.0.1:4180";
const output = process.env.MAERCHENTIERE_TEST_OUTPUT || path.join(os.tmpdir(), "nda-maerchentiere-qa");
await mkdir(output, { recursive: true });

const townSource = await readFile(new URL("../../js/town.js", import.meta.url), "utf8");
const playerSource = await readFile(new URL("../../js/player.js", import.meta.url), "utf8");
const battleSource = await readFile(new URL("../../js/battle.js", import.meta.url), "utf8");

const townHook = `
window.maerchentiereTownQa = {
  setup(options) {
    configureTown({
      root: document.querySelector("#townScreen"),
      messageEl: document.querySelector("#message"),
      commandRoot: document.querySelector("#dungeonCommands"),
      getCharacter: options.getCharacter,
      onAcceptRequest: options.onAcceptRequest,
      onStateChanged: () => {},
      playSe: key => window.__maerchentiereSe.push(key)
    });
    setTownTypewriterOptions({ enabled: false });
    openTown({ registrationRequired: false, facilityId: "guild", mode: "facilityMenu" });
  },
  showQuest(id) {
    clearTownTypewriter();
    town.questIndex = QUESTS.findIndex(quest => quest.id === id);
    const quest = QUESTS[town.questIndex];
    town.mode = "questAcceptDetail";
    town.guildQuestOverlay.hidden = false;
    renderQuestDetail(quest, getQuestProgress(town.getCharacter(), id));
    town.messageEl.textContent = "ギルドマスター：この依頼でいいか？\\n＊Aボタン：はい　Bボタン：いいえ";
  },
  input: handleTownInput,
  close: closeTown,
  snapshot: () => ({
    active: town.active,
    transitioning: town.transitioning,
    menuOpen: town.isMenuOpen(),
    typewriterActive: townTypewriter.active,
    mode: town.mode,
    title: town.guildQuestTitle.textContent,
    detail: town.guildQuestDetail.textContent,
    message: town.messageEl.textContent
  })
};`;

const playerHook = `window.maerchentierePlayerQa = {
  startSpecialRoomContentEvent,
  state
};`;

const battleHook = `window.maerchentiereBattleQa = {
  attack: () => executeCommand({ type: "attack", targetIndex: battleUi.battle?.targetIndex }),
  setEnemyHp(hp) {
    battleUi.battle.enemy.hp = Math.max(0, Number(hp) || 0);
    battleUi.battle.enemy.alive = battleUi.battle.enemy.hp > 0;
    renderBattle();
  },
  snapshot: () => structuredClone(battleUi.battle)
};`;

async function confirm(page, touch) {
  if (touch) {
    await page.dispatchEvent("#buttonA", "touchend", { bubbles: true, cancelable: true });
  } else {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "x", code: "KeyX", bubbles: true, cancelable: true
    })));
  }
}

const browser = await chromium.launch({
  channel: process.env.MAERCHENTIERE_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const errors = [];
const results = [];

try {
  for (const [layout, width, height, touch] of [["pc", 1280, 900, false], ["mobile", 390, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${layout} pageerror: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") errors.push(`${layout} console: ${message.text()}`);
    });
    await page.addInitScript(() => { window.__maerchentiereSe = []; });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: "// Isolated Maerchentiere browser QA."
    }));
    await page.route("**/js/town.js", route => route.fulfill({
      contentType: "text/javascript",
      body: `${townSource}\n${townHook}`
    }));
    await page.route("**/js/player.js", route => route.fulfill({
      contentType: "text/javascript",
      body: `${playerSource}\n${playerHook}`
    }));
    await page.route("**/js/battle.js", route => route.fulfill({
      contentType: "text/javascript",
      body: `${battleSource}\n${battleHook}`
    }));
    await page.goto(origin);

    await page.evaluate(async ({ layout, touch }) => {
      const classes = await import("/data/classes.js");
      const quests = await import("/data/quests.js");
      const specialRooms = await import("/data/special-rooms.js");
      const rumors = await import("/data/tavern-rumors.js");
      const keyItems = await import("/data/key-items.js");
      const inventory = await import("/data/inventory.js");
      const deck = await import("/data/deck.js");
      const bosses = await import("/data/bosses.js");
      const cards = await import("/data/cards.js");
      const dungeon = await import("/js/dungeon.js");
      const player = await import("/js/player.js");
      await import("/js/town.js");
      const renderer = await import("/js/renderer.js");
      const minimap = await import("/js/minimap.js");
      const input = await import("/js/input.js");
      const items = await import("/js/item-overlay.js");
      const battle = await import("/js/battle.js");
      const config = await import("/js/config.js");

      document.body.className = touch ? `layout-${layout} input-touch` : `layout-${layout} input-pointer`;
      document.querySelector("#titleScreen").hidden = true;
      document.body.classList.remove("title-active");
      let character = classes.createInitialCharacter({ name: "QUEST QA", job: "warrior" });
      character.highestDungeonDepthReached = 80;
      character.eventFlags.jirene_scripted_defeat_seen = true;
      character.quests.completedQuestIds.push(
        "guild_001_abyss_rat",
        "guild_002_cave_slime",
        "guild_003_b1f_survey"
      );
      const callbacks = [];
      const messages = [];
      const popup = document.querySelector("#itemGetEffect");
      const popupItems = document.querySelector("#itemGetItems");
      const messageEl = document.querySelector("#message");
      const canvas = document.querySelector("#screen");
      const eventOverlay = document.querySelector("#eventOverlay");

      window.maerchentiereTownQa.setup({
        getCharacter: () => character,
        onAcceptRequest: id => {
          const accepted = quests.acceptQuest(character, id);
          window.__maerchentiereAcceptResult = { id, accepted: accepted.accepted, reason: accepted.reason || "" };
          if (!accepted.accepted) return accepted;
          character = accepted.character;
          return id === quests.BEESWAX_COLLECTION_QUEST_ID ? {
            ...accepted,
            character,
            clientName: "ギルドマスター",
            clientPortrait: "images/npc/NPC_10.avif",
            clientDialogue: ["ギルドマスター「蜜蝋集めか。蜂の巣を探すのは骨が折れそうだ。酒場で情報でも集めたらどうだ？\n＊Aボタンで次へ"]
          } : { ...accepted, character };
        }
      });

      renderer.configureRenderer({
        canvas,
        ctx: canvas.getContext("2d"),
        eventOverlayCanvas: eventOverlay,
        eventOverlayCtx: eventOverlay.getContext("2d"),
        state: player.state,
        wallOnCell: dungeon.wallOnCell,
        closedDoorOnCell: dungeon.closedDoorOnCell,
        openDoorOnCell: dungeon.openDoorOnCell,
        getDoorState: dungeon.getDoorState,
        getDoorKind: dungeon.getDoorKind,
        inBounds: dungeon.inBounds,
        updateAnimation: player.updateAnimation,
        updateHud: () => {},
        drawMinimap: minimap.drawMinimap,
        getMinimapOptions: () => ({
          W: canvas.width, H: canvas.height, MAP_W: config.MAP_W, MAP_H: config.MAP_H,
          cells: dungeon.cells, explored: dungeon.explored, state: player.state
        }),
        getMinimapBounds: minimap.getMinimapBounds,
        isMobileDevice: () => touch,
        handleOverlayInput: player.handleOverlayEventInput
      });

      player.configurePlayer({
        say: text => { messageEl.textContent = text; messages.push(text); },
        cancelAutoReturn: () => {},
        inspectWaspHive: () => quests.getWaspHiveInteraction(character),
        inspectKirkeHouse: () => quests.getKirkeHouseInteraction(character),
        beginQuestEnemyBattle: (id, count) => { callbacks.push({ type: "waspBattle", id, count }); return true; },
        grantKirkeSpecialBirdlime: () => {
          const granted = quests.grantKirkeSpecialBirdlime(character);
          if (granted.accepted) character = granted.character;
          if (granted.gained) {
            window.__maerchentiereSe.push("importantItem");
            document.querySelector(".viewport").append(popup);
            popupItems.textContent = "キルケ特製とりもち ×1";
            popup.hidden = false;
            popup.classList.add("is-active");
          }
          return granted;
        },
        beginMaerchentiereBattle: origin => { callbacks.push({ type: "captureBattle", origin }); return true; },
        onStateChanged: () => renderer.drawScene(performance.now())
      });

      items.configureItemOverlay({ root: document.querySelector("#itemOverlay"), messageEl, playSe: () => {} });
      battle.configureBattle({
        root: document.querySelector("#battleScreen"),
        commandRoot: document.querySelector("#dungeonCommands"),
        messageEl,
        getCharacter: () => character,
        onCharacterChanged: patch => Object.assign(character, patch),
        onVictory: result => callbacks.push({ type: "victory", outcome: result.outcome }),
        onDefeat: result => callbacks.push({ type: "defeat", outcome: result.outcome }),
        onEscape: result => callbacks.push({ type: "escape", outcome: result.outcome }),
        onSpecialOutcome: result => {
          callbacks.push({ type: "special", outcome: result.outcome });
          character = { ...character, ...battle.createPersistentBattlePlayerChanges(result.player) };
          if (result.outcome === "maerchentiereCaptured") {
            character = quests.completeMaerchentiereCapture(character).character;
          }
          player.startKirkeMaerchentiereResultEvent({
            captured: result.outcome === "maerchentiereCaptured"
          });
          renderer.drawScene(performance.now());
        },
        openItems: ({ character: actor, enemy, enemies, onUse }) => items.openItemOverlay({
          context: "battle", character: actor, enemy, enemies, onUse
        }),
        playSe: key => window.__maerchentiereSe.push(key),
        getFrameRate: () => touch ? 30 : 60,
        isMobileDevice: () => touch
      });

      input.configureInput({
        forwardBtn: document.querySelector("#forward"),
        backBtn: document.querySelector("#back"),
        leftBtn: document.querySelector("#left"),
        rightBtn: document.querySelector("#right"),
        autoReturnBtn: document.querySelector("#autoReturn"),
        randomGenerateBtn: document.querySelector("#randomGenerate"),
        manualMove: player.manualMove,
        manualTurn: player.manualTurn,
        startAutoReturn: () => {},
        generateRandomDungeon: () => {},
        buttonA: document.querySelector("#buttonA"),
        buttonB: document.querySelector("#buttonB"),
        commandRoot: document.querySelector("#dungeonCommands"),
        handleOverlayInput: player.handleOverlayEventInput,
        handleItemInput: items.handleItemOverlayInput,
        handleSkillInput: () => false,
        handleBattleInput: battle.handleBattleInput,
        handleTownInput: window.maerchentiereTownQa.input || (() => false),
        handleMenuInput: () => false,
        handleDoorInput: () => false
      });

      window.maerchentiereQa = {
        showQuest029: () => window.maerchentiereTownQa.showQuest(quests.BEESWAX_COLLECTION_QUEST_ID),
        town: () => window.maerchentiereTownQa.snapshot(),
        townInput: action => window.maerchentiereTownQa.input(action),
        rumor007: () => rumors.TAVERN_RUMORS.find(rumor => rumor.id === "rumor_007"),
        enterDungeon() {
          window.maerchentiereTownQa.close();
          document.querySelector(".viewport").hidden = false;
        },
        startHive() {
          window.maerchentierePlayerQa.startSpecialRoomContentEvent(specialRooms.getSpecialRoomDefinition(8).content, 1, 1);
          renderer.drawScene(performance.now());
        },
        prepare026() {
          character.quests.active = {};
          character.quests.completedQuestIds = [...new Set([
            ...character.quests.completedQuestIds,
            quests.JIRENE_SONG_INVESTIGATION_QUEST_ID,
            quests.BEESWAX_COLLECTION_QUEST_ID
          ])];
          character = quests.acceptQuest(character, quests.MAERCHENTIERE_QUEST_ID).character;
        },
        startHouse() {
          window.maerchentierePlayerQa.startSpecialRoomContentEvent(specialRooms.getSpecialRoomDefinition(58).content, 2, 2);
          renderer.drawScene(performance.now());
        },
        startCaptureBattle(hp) {
          const enemy = bosses.createBossCombatant("maerchentiere_b58f");
          enemy.hp = hp;
          return battle.startBattle(enemy, { playStartSe: false });
        },
        report026() {
          const report = quests.reportQuest(character, quests.MAERCHENTIERE_QUEST_ID);
          if (report.accepted) character = report.character;
          return {
            accepted: report.accepted,
            cardCount: deck.getOwnedCardCount(character.cards, cards.SWIFT_FOOT_CARD_ID),
            potionCount: inventory.getItemCount(character.inventory, "zaubertrank")
          };
        },
        state: () => structuredClone(character),
        overlay: () => structuredClone(window.maerchentierePlayerQa.state.overlayEvent),
        callbacks: () => structuredClone(callbacks),
        acceptResult: () => structuredClone(window.__maerchentiereAcceptResult || null),
        messages: () => [...messages],
        overlayInput: player.handleOverlayEventInput,
        battleInput: battle.handleBattleInput,
        openBattleItems: battle.openBattleItems,
        redraw: () => renderer.drawScene(performance.now()),
        battleSnapshot: () => window.maerchentiereBattleQa.snapshot()
      };
    }, { layout, touch });

    await page.evaluate(() => maerchentiereQa.showQuest029());
    let town = await page.evaluate(() => maerchentiereQa.town());
    assert.equal(town.title, "029:蜜蝋の採取");
    assert.deepEqual(
      { active: town.active, transitioning: town.transitioning, menuOpen: town.menuOpen, typewriterActive: town.typewriterActive },
      { active: true, transitioning: false, menuOpen: false, typewriterActive: false }
    );
    assert.match(town.detail, /目的\s*蜂の巣を見つけて蜜蝋を15個採取する/u);
    assert.doesNotMatch(town.detail, /討伐数|B8F/u);
    await page.screenshot({ path: path.join(output, `${layout}-quest-029.png`) });
    await page.evaluate(() => maerchentiereQa.townInput("confirm"));
    town = await page.evaluate(() => maerchentiereQa.town());
    assert.equal(town.mode, "questClientDialogue", JSON.stringify(await page.evaluate(() => maerchentiereQa.acceptResult())));
    assert.match(town.message, /酒場で情報でも集めたらどうだ？\n＊Aボタンで次へ/u);
    await page.waitForTimeout(1200);
    assert.equal((await page.evaluate(() => maerchentiereQa.town())).mode, "questClientDialogue");
    await page.evaluate(() => maerchentiereQa.townInput("confirm"));
    assert.equal((await page.evaluate(() => maerchentiereQa.town())).mode, "facilityMenu");
    assert.match((await page.evaluate(() => maerchentiereQa.rumor007())).customerLead, /B8F/u);

    await page.evaluate(() => { maerchentiereQa.enterDungeon(); maerchentiereQa.startHive(); });
    assert.match((await page.locator("#message").textContent()), /ワスプの群れ/u);
    await page.screenshot({ path: path.join(output, `${layout}-b8-hive.png`) });
    await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    assert.deepEqual((await page.evaluate(() => maerchentiereQa.callbacks())).at(-1), {
      type: "waspBattle", id: "wasp", count: 3
    }, JSON.stringify(await page.evaluate(() => maerchentiereQa.overlay())));

    await page.evaluate(() => { maerchentiereQa.prepare026(); maerchentiereQa.startHouse(); });
    assert.match((await page.locator("#message").textContent()), /キルケの家がある。入りますか？/u);
    await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    assert.match((await page.locator("#message").textContent()), /キルケの怒鳴り声/u);
    await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    assert.match((await page.locator("#message").textContent()), /3匹の動物が蜂蜜のツボ/u);
    await page.evaluate(() => maerchentiereQa.redraw());
    await page.locator(".viewport").screenshot({ path: path.join(output, `${layout}-kirke-mischief.png`) });
    await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    assert.match((await page.locator("#message").textContent()), /弱らせてから、こいつを使いな/u);
    await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    assert.match((await page.locator("#message").textContent()), /「キルケ特製とりもち」を手に入れた！/u);
    assert.equal((await page.evaluate(() => maerchentiereQa.state())).keyItems.owned.kirke_special_birdlime.count, 1);
    assert.equal(await page.locator("#itemGetEffect").isVisible(), true);
    assert.equal(await page.locator("#itemGetItems").textContent(), "キルケ特製とりもち ×1");
    assert.equal((await page.evaluate(() => window.__maerchentiereSe.filter(id => id === "importantItem").length)), 1);
    await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    assert.equal((await page.evaluate(() => maerchentiereQa.callbacks())).at(-1).type, "captureBattle");

    assert.equal(await page.evaluate(() => maerchentiereQa.startCaptureBattle(4)), true);
    assert.equal(await page.locator("#battleBossHpMeter").evaluate(node => node.classList.contains("is-capture-available")), false);
    assert.equal(await page.evaluate(() => maerchentiereQa.openBattleItems()), true);
    await page.waitForTimeout(100);
    assert.match(await page.locator("#itemOverlay").textContent(), /キルケ特製とりもち/u,
      JSON.stringify(await page.evaluate(() => ({
        hidden: document.querySelector("#itemOverlay").hidden,
        keyItems: maerchentiereQa.battleSnapshot().player.keyItems
      }))));
    await page.locator("#itemOverlay .skill-overlay-item", { hasText: "キルケ特製とりもち" }).click();
    await page.waitForFunction(() => document.querySelector("#message").textContent.includes("まだ元気すぎて拘束できない"));
    assert.equal((await page.evaluate(() => maerchentiereQa.state())).keyItems.owned.kirke_special_birdlime.count, 1);
    await page.evaluate(() => maerchentiereBattleQa.setEnemyHp(1));
    await page.evaluate(() => maerchentiereBattleQa.attack());
    await page.waitForFunction(() => maerchentiereBattleQa.snapshot().outcome === "maerchentiereEscaped");
    assert.match((await page.locator("#message").textContent()), /逃げていった/u);
    await page.evaluate(() => maerchentiereQa.battleInput("confirm"));
    await page.waitForFunction(() => document.querySelector("#battleScreen").hidden);
    assert.equal((await page.evaluate(() => maerchentiereQa.overlay())).pages.length, 2);
    await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    assert.equal(await page.evaluate(() => maerchentiereQa.overlay()), null);

    assert.equal(await page.evaluate(() => maerchentiereQa.startCaptureBattle(3)), true);
    assert.equal(await page.locator("#battleBossHpMeter").evaluate(node => node.classList.contains("is-capture-available")), true);
    assert.equal(await page.evaluate(() => maerchentiereQa.openBattleItems()), true);
    await page.locator("#itemOverlay .skill-overlay-item", { hasText: "キルケ特製とりもち" }).click();
    await page.waitForFunction(() => maerchentiereBattleQa.snapshot().outcome === "maerchentiereCaptured");
    assert.match((await page.locator("#message").textContent()), /捕獲した/u);
    assert.match(await page.locator("#battleEnemyImage").getAttribute("src"), /NPC_event_24\.avif$/u);
    await page.locator(".viewport").screenshot({ path: path.join(output, `${layout}-capture.png`) });
    await page.waitForFunction(() => document.querySelector("#message").textContent.includes("＊Aボタンで次へ"));
    await page.evaluate(() => maerchentiereQa.battleInput("confirm"));
    await page.waitForFunction(() => document.querySelector("#battleScreen").hidden);
    assert.equal((await page.evaluate(() => maerchentiereQa.overlay())).pages.length, 5);
    for (let index = 0; index < 5; index += 1) {
      await page.evaluate(() => maerchentiereQa.overlayInput("confirm"));
    }
    assert.equal(await page.evaluate(() => maerchentiereQa.overlay()), null);
    const report = await page.evaluate(() => maerchentiereQa.report026());
    assert.deepEqual(report, { accepted: true, cardCount: 1, potionCount: 5 });
    assert.equal((await page.evaluate(() => maerchentiereQa.state())).keyItems.owned.kirke_special_birdlime.count, 1);
    assert.deepEqual(errors, []);
    results.push({ layout, reward: report, screenshots: output });
    await context.close();
  }
  console.log(JSON.stringify({ results, errors, output }, null, 2));
} finally {
  await browser.close();
}
