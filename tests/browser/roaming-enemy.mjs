// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The production roaming-enemy registry stays empty; this injects a test-only definition.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.ROAMING_ENEMY_TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  channel: process.env.ROAMING_ENEMY_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

try {
  for (const layout of [
    { name: "pc", width: 1280, height: 900, touch: false },
    { name: "mobile", width: 390, height: 844, touch: true }
  ]) {
    const context = await browser.newContext({
      viewport: { width: layout.width, height: layout.height },
      deviceScaleFactor: layout.touch ? 2 : 1,
      hasTouch: layout.touch
    });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`${layout.name}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`${layout.name}: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: "// Isolated roaming-enemy browser QA."
    }));
    await page.addInitScript(() => {
      let frameId = 0;
      window.requestAnimationFrame = () => ++frameId;
      window.cancelAnimationFrame = () => {};
      window.qaRoamingDraws = [];
      window.qaRoamingMarkers = 0;
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
        const source = String(image?.currentSrc || image?.src || "");
        if (/images\/enemies\/enemy_01\.avif$/.test(source) && args.length >= 4) {
          window.qaRoamingDraws.push({ source, bounds: args.slice(-4).map(Number) });
        }
        return drawImage.call(this, image, ...args);
      };
      const fill = CanvasRenderingContext2D.prototype.fill;
      CanvasRenderingContext2D.prototype.fill = function (...args) {
        if (this.fillStyle === "#ff3434") window.qaRoamingMarkers += 1;
        return fill.apply(this, args);
      };
    });
    await page.goto(origin);
    await page.evaluate(async ({ layout }) => {
      const dungeon = await import("/js/dungeon.js");
      const player = await import("/js/player.js");
      const renderer = await import("/js/renderer.js");
      const minimap = await import("/js/minimap.js");
      const input = await import("/js/input.js");
      const roaming = await import("/js/roaming-enemies.js");
      const battle = await import("/js/battle.js");
      const enemies = await import("/data/enemies.js");
      const classes = await import("/data/classes.js");
      const config = await import("/js/config.js");

      document.body.className = layout.touch ? "layout-mobile input-touch" : "layout-pc input-pointer";
      document.querySelector("#titleScreen").hidden = true;
      document.body.classList.remove("title-active");
      const controls = document.querySelector(".controls");
      controls.style.display = "block";
      controls.style.visibility = "visible";
      const pad = document.querySelector(".pad");
      pad.style.display = "grid";
      pad.style.position = "fixed";
      pad.style.left = "8px";
      pad.style.bottom = "8px";
      pad.style.zIndex = "100";
      const forwardButton = document.querySelector("#forward");
      forwardButton.style.display = "block";
      forwardButton.style.width = "48px";
      forwardButton.style.height = "48px";
      const canvas = document.querySelector("#screen");
      const overlay = document.querySelector("#eventOverlay");
      const message = document.querySelector("#message");
      const definition = {
        id: "browser_verfolger",
        enemyId: "cave_slime",
        imageId: "browser_verfolger",
        image: "images/enemies/enemy_01.avif",
        floors: [12],
        escapeRate: 1,
        renderScale: 1
      };
      let character = classes.createInitialCharacter({ name: "ROAM QA", job: "warrior" });
      let escapedBattle = null;

      dungeon.setStartPosition(1, 1);
      dungeon.resetAllWalls();
      for (let x = 1; x < 4; x += 1) dungeon.setWall(x, 1, "E", false);
      player.resetPlayer(config.DIRS.findIndex(direction => direction.key === "E"));
      player.setPlayerInputEnabled(true);
      dungeon.explored[1][1] = true;
      roaming.restoreRoamingEnemyState({
        instanceId: "browser-instance-1",
        definitionId: definition.id,
        x: 3,
        y: 1,
        mode: "patrol",
        lastSeen: null,
        previous: null,
        status: "active",
        rewardGranted: false
      }, { grid: dungeon.cells, definitions: [definition], moveDuration: config.STEP_MS });

      const beginEncounter = instanceId => {
        if (!roaming.beginRoamingEnemyBattle(instanceId)) return false;
        const enemy = enemies.createEnemyCombatant(enemies.getEnemyById(definition.enemyId));
        enemy.escapeRate = definition.escapeRate;
        return battle.startBattle(enemy, { playStartSe: false, roamingEnemyInstanceId: instanceId });
      };
      battle.configureBattle({
        root: document.querySelector("#battleScreen"),
        commandRoot: document.querySelector("#dungeonCommands"),
        messageEl: message,
        getCharacter: () => character,
        onCharacterChanged: changes => { character = { ...character, ...changes }; },
        onEscape: snapshot => {
          escapedBattle = snapshot;
          roaming.resetRoamingEnemyAfterEscape({
            grid: dungeon.cells,
            player: { x: player.state.gridX, y: player.state.gridY },
            rng: () => 0
          });
          player.setPlayerInputEnabled(true);
        },
        playSe: () => {},
        getFrameRate: () => layout.touch ? 30 : 60,
        isMobileDevice: () => layout.touch
      });
      player.configurePlayer({
        say: text => { message.textContent = text; },
        playSe: () => {},
        cancelAutoReturn: () => {},
        onDungeonStep: () => {},
        onRoamingEnemyPlayerStep: ({ x, y, now }) => {
          const step = roaming.advanceRoamingEnemyForPlayerStep({
            grid: dungeon.cells,
            player: { x, y },
            rng: () => 0,
            now
          });
          if (step.contact) return { handled: beginEncounter(step.instanceId), contact: true };
          if (step.pendingContact) {
            player.setPlayerInputEnabled(false);
            return { handled: true, pendingContact: true };
          }
          return { handled: false };
        },
        updateRoamingEnemyAnimation: now => {
          const completed = roaming.completeRoamingEnemyAnimation(now);
          if (!completed?.contact) return completed || { contact: false };
          return { ...completed, contact: beginEncounter(completed.instanceId) };
        },
        onStateChanged: () => {}
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
        handleBattleInput: battle.handleBattleInput,
        handleMenuInput: () => false,
        handleTownInput: () => false,
        handleOverlayInput: () => false,
        handleItemInput: () => false,
        handleSkillInput: () => false,
        handleDoorInput: () => false
      });
      renderer.configureRenderer({
        canvas,
        ctx: canvas.getContext("2d"),
        eventOverlayCanvas: overlay,
        eventOverlayCtx: overlay.getContext("2d"),
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
          W: canvas.width,
          H: canvas.height,
          MAP_W: config.MAP_W,
          MAP_H: config.MAP_H,
          cells: dungeon.cells,
          explored: dungeon.explored,
          roamingEnemy: roaming.serializeRoamingEnemyState(),
          state: player.state
        }),
        getRoamingEnemyRenderState: roaming.getRoamingEnemyRenderState,
        getMinimapBounds: minimap.getMinimapBounds,
        isMobileDevice: () => layout.touch
      });

      window.qa = {
        async initialDisplay() {
          dungeon.explored[1][3] = false;
          window.qaRoamingMarkers = 0;
          renderer.drawScene(performance.now());
          const hiddenMarkerCount = window.qaRoamingMarkers;
          dungeon.explored[1][3] = true;
          window.qaRoamingMarkers = 0;
          window.qaRoamingDraws.length = 0;
          for (let attempt = 0; attempt < 50 && !window.qaRoamingDraws.length; attempt += 1) {
            renderer.drawScene(performance.now() + attempt * 34);
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          return {
            hiddenMarkerCount,
            visibleMarkerCount: window.qaRoamingMarkers,
            spriteDraw: window.qaRoamingDraws.at(-1) || null
          };
        },
        finishPlayerStep() {
          const end = player.state.anim.start + player.state.anim.duration + 1;
          player.updateAnimation(end);
          const enemy = roaming.getActiveRoamingEnemy();
          return {
            player: { x: player.state.gridX, y: player.state.gridY },
            enemy: { x: enemy.x, y: enemy.y },
            pendingContact: Boolean(enemy.transition?.pendingContact),
            battleActive: battle.isBattleActive(),
            animationEnd: end + enemy.moveDuration + 1
          };
        },
        finishEnemyStep(animationEnd) {
          player.updateAnimation(animationEnd);
          return {
            battleActive: battle.isBattleActive(),
            enemyInBattle: roaming.getActiveRoamingEnemy()?.inBattle,
            enemyName: document.querySelector("#battleEnemyName")?.textContent || ""
          };
        },
        escape() {
          battle.handleBattleInput("down");
          battle.handleBattleInput("right");
          battle.handleBattleInput("right");
          battle.handleBattleInput("confirm");
          battle.handleBattleInput("confirm");
          const enemy = roaming.getActiveRoamingEnemy();
          return {
            battleActive: battle.isBattleActive(),
            instanceId: escapedBattle?.roamingEnemyInstanceId,
            enemy: enemy ? {
              x: enemy.x,
              y: enemy.y,
              mode: enemy.mode,
              inBattle: enemy.inBattle,
              status: enemy.status
            } : null
          };
        }
      };
    }, { layout });

    const initial = await page.evaluate(() => window.qa.initialDisplay());
    assert.equal(initial.hiddenMarkerCount, 0, `${layout.name}: unexplored marker hidden`);
    assert.ok(initial.visibleMarkerCount > 0, `${layout.name}: explored red diamond visible`);
    assert.match(initial.spriteDraw?.source || "", /enemy_01\.avif$/);

    const forward = page.locator("#forward");
    if (layout.touch) await forward.tap({ force: true });
    else await forward.click({ force: true });
    const approached = await page.evaluate(() => window.qa.finishPlayerStep());
    assert.deepEqual(approached.player, { x: 2, y: 1 });
    assert.deepEqual(approached.enemy, { x: 2, y: 1 });
    assert.equal(approached.pendingContact, true);
    assert.equal(approached.battleActive, false);

    const contacted = await page.evaluate(end => window.qa.finishEnemyStep(end), approached.animationEnd);
    assert.equal(contacted.battleActive, true);
    assert.equal(contacted.enemyInBattle, true);
    assert.match(contacted.enemyName, /洞窟スライム/);

    const escaped = await page.evaluate(() => window.qa.escape());
    assert.equal(escaped.battleActive, false);
    assert.equal(escaped.instanceId, "browser-instance-1");
    assert.deepEqual(escaped.enemy, {
      x: 4,
      y: 1,
      mode: "patrol",
      inBattle: false,
      status: "active"
    });
    results.push({ layout: layout.name, initial, approached, contacted, escaped });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, pageErrors, consoleErrors }, null, 2));
