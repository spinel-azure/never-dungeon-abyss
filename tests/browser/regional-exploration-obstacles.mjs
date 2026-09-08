// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// Main bootstrap is skipped so this test never reads or writes a player's save.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.OBSTACLE_TEST_URL || "http://127.0.0.1:4173";
const output = process.env.OBSTACLE_TEST_OUTPUT || path.join(os.tmpdir(), "nda-regional-obstacle-qa");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.OBSTACLE_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const errors = [];
const results = [];

try {
  const layouts = [
    { name: "pc", width: 1280, height: 900, input: "click", branch: "mage" },
    { name: "mobile", width: 390, height: 844, input: "touch", branch: "johan" },
    { name: "tablet", width: 820, height: 1180, input: "touch", branch: "oil" }
  ];
  for (const layout of layouts) {
    const context = await browser.newContext({
      viewport: { width: layout.width, height: layout.height },
      deviceScaleFactor: 2,
      hasTouch: layout.input === "touch"
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${layout.name} pageerror: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") errors.push(`${layout.name} console: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: "// isolated regional obstacle browser QA"
    }));
    await page.addInitScript(() => {
      window.qaObstacleDraws = [];
      window.qaObstacleSoundEffects = [];
      window.qaMinimapMarkers = [];
      let frameId = 0;
      window.requestAnimationFrame = () => ++frameId;
      window.cancelAnimationFrame = () => {};
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
        const source = String(image?.currentSrc || image?.src || "");
        if (/NPC_event_(21|22)\.avif/.test(source) && args.length >= 4) {
          const values = args.slice(-4).map(Number);
          window.qaObstacleDraws.push({ source, x: values[0], y: values[1], width: values[2], height: values[3] });
        }
        return drawImage.call(this, image, ...args);
      };
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (value, ...args) {
        if (value === "▲") {
          window.qaMinimapMarkers.push({ value, color: this.fillStyle, x: Number(args[0]), y: Number(args[1]) });
        }
        return fillText.call(this, value, ...args);
      };
    });
    await page.goto(origin);
    await page.evaluate(async ({ layout }) => {
      const dungeon = await import("/js/dungeon.js");
      const player = await import("/js/player.js");
      const renderer = await import("/js/renderer.js");
      const minimap = await import("/js/minimap.js");
      const input = await import("/js/input.js");
      const audio = await import("/js/audio.js");
      const obstacles = await import("/data/exploration-obstacles.js");
      const inventory = await import("/data/inventory.js");
      const classes = await import("/data/classes.js");
      const config = await import("/js/config.js");

      document.body.className = `layout-${layout.name} orientation-portrait input-${layout.input === "touch" ? "touch" : "pointer"}`;
      document.querySelector("#titleScreen").hidden = true;
      document.querySelector("#townScreen").hidden = true;
      document.querySelector("#menuScreen").hidden = true;
      const canvas = document.querySelector("#screen");
      const overlay = document.querySelector("#eventOverlay");
      const message = document.querySelector("#message");
      const direction = config.DIRS.findIndex(entry => entry.key === "E");
      let character = null;

      dungeon.setStartPosition(1, 1);
      dungeon.resetAllWalls();
      dungeon.resetExplored();
      dungeon.setWall(1, 1, "E", false);
      player.resetPlayer(direction);
      player.setPlayerInputEnabled(true);
      dungeon.explored[1][1] = true;
      dungeon.explored[1][2] = true;

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
          state: player.state
        }),
        getMinimapBounds: minimap.getMinimapBounds,
        isMobileDevice: () => layout.input === "touch"
      });
      player.configurePlayer({
        say: text => { message.textContent = text; },
        playSe: key => { window.qaObstacleSoundEffects.push(key); },
        cancelAutoReturn: () => {},
        getExplorationObstacleRemovalOptions: id => obstacles.getExplorationObstacleRemovalOptions(character, id),
        resolveExplorationObstacleRemoval: ({ obstacleId, x, y, method }) => {
          const result = obstacles.resolveExplorationObstacleRemoval(character, obstacleId, method);
          if (!result.accepted || !dungeon.removeExplorationObstacleAt(x, y)) return { accepted: false };
          character = result.character;
          return result;
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
        manualMove: amount => {
          window.qaMoveCalls = (window.qaMoveCalls || 0) + 1;
          player.manualMove(amount);
        },
        manualTurn: player.manualTurn,
        startAutoReturn: () => {},
        generateRandomDungeon: () => {},
        buttonA: document.querySelector("#buttonA"),
        buttonB: document.querySelector("#buttonB"),
        commandRoot: document.querySelector("#dungeonCommands"),
        handleOverlayInput: player.handleOverlayEventInput,
        handleItemInput: () => false,
        handleSkillInput: () => false,
        handleBattleInput: () => false,
        handleTownInput: () => false,
        handleMenuInput: () => false,
        handleDoorInput: () => false
      });

      async function inspectAsset(src) {
        const image = new Image();
        image.src = src;
        await image.decode();
        const sample = document.createElement("canvas");
        sample.width = image.naturalWidth;
        sample.height = image.naturalHeight;
        const context = sample.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const alpha = context.getImageData(0, 0, sample.width, sample.height).data;
        let transparent = 0;
        let opaque = 0;
        let minX = image.naturalWidth;
        let minY = image.naturalHeight;
        let maxX = -1;
        let maxY = -1;
        for (let index = 3; index < alpha.length; index += 4) {
          if (alpha[index] === 0) {
            transparent += 1;
            continue;
          }
          opaque += 1;
          const pixelIndex = (index - 3) / 4;
          const x = pixelIndex % image.naturalWidth;
          const y = Math.floor(pixelIndex / image.naturalWidth);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
        return {
          width: image.naturalWidth,
          height: image.naturalHeight,
          transparent,
          opaque,
          contentBounds: { minX, minY, maxX, maxY }
        };
      }

      window.qa = {
        async show(obstacleId, view = "near") {
          const obstacle = obstacles.getExplorationObstacleById(obstacleId);
          dungeon.setStartPosition(view === "reverse" ? 3 : 1, 1);
          dungeon.resetAllWalls();
          dungeon.resetExplored();
          const obstacleX = view === "far" ? 3 : 2;
          const facing = view === "reverse"
            ? config.DIRS.findIndex(entry => entry.key === "W")
            : direction;
          dungeon.setWall(view === "reverse" ? 3 : 1, 1, view === "reverse" ? "W" : "E", false);
          if (view === "far") dungeon.setWall(2, 1, "E", false);
          dungeon.cells[1][obstacleX].explorationObstacleId = obstacleId;
          dungeon.explored[1][obstacleX] = true;
          player.resetPlayer(facing);
          player.setPlayerInputEnabled(true);
          renderer.setWallColor(obstacleId === "fire_pillar" ? "red" : "blue");
          renderer.setFloorColor(obstacleId === "fire_pillar" ? "red" : "blue");
          window.qaObstacleDraws.length = 0;
          for (let attempt = 0; attempt < 50 && !window.qaObstacleDraws.length; attempt += 1) {
            renderer.drawScene(performance.now() + attempt * 34);
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          return {
            draw: window.qaObstacleDraws.at(-1),
            asset: await inspectAsset(`/${obstacle.image}`),
            canvas: { width: canvas.width, height: canvas.height }
          };
        },
        effectFrames() {
          return {
            fireStart: renderer.resolveExplorationObstacleEffectFrame("fire-waver", 0, false),
            fireLater: renderer.resolveExplorationObstacleEffectFrame("fire-waver", 500, false),
            iceStart: renderer.resolveExplorationObstacleEffectFrame("ice-sparkle", 0, false),
            iceLater: renderer.resolveExplorationObstacleEffectFrame("ice-sparkle", 500, false),
            reducedFire: renderer.resolveExplorationObstacleEffectFrame("fire-waver", 500, true),
            reducedIce: renderer.resolveExplorationObstacleEffectFrame("ice-sparkle", 500, true),
            audioFile: audio.SE.explorationObstacleOil
          };
        },
        contactMarker(obstacleId) {
          character = classes.createInitialCharacter({ name: "MAP", job: "warrior" });
          dungeon.setStartPosition(1, 1);
          dungeon.resetAllWalls();
          dungeon.resetExplored();
          dungeon.setWall(1, 1, "E", false);
          dungeon.cells[1][2].explorationObstacleId = obstacleId;
          dungeon.explored[1][1] = true;
          player.resetPlayer(direction);
          player.setPlayerInputEnabled(true);
          message.textContent = "";
          window.qaMinimapMarkers.length = 0;
          renderer.drawScene(performance.now());
          const before = window.qaMinimapMarkers.slice();
          player.manualMove(1);
          window.qaMinimapMarkers.length = 0;
          renderer.drawScene(performance.now() + 34);
          return {
            before,
            after: window.qaMinimapMarkers.slice(),
            discovered: dungeon.cells[1][2].explorationObstacleDiscovered,
            explored: dungeon.explored[1][2],
            message: message.textContent,
            position: [player.state.gridX, player.state.gridY]
          };
        },
        prepareBranch() {
          window.qaObstacleSoundEffects.length = 0;
          character = classes.createInitialCharacter({ name: "QA", job: layout.branch === "oil" ? "warrior" : "mage" });
          character.sp = 20;
          const obstacleId = layout.branch === "oil" ? "giant_ice_block" : "fire_pillar";
          const oilId = obstacleId === "fire_pillar" ? "ice_lizard_oil" : "fire_lizard_oil";
          character.inventory = inventory.grantItem(character.inventory, oilId, 2).inventory;
          if (layout.branch === "johan") {
            character.npcSystem = { registeredIds: ["johan"], activeIds: ["johan"], records: {} };
          }
          dungeon.setStartPosition(1, 1);
          dungeon.resetAllWalls();
          dungeon.resetExplored();
          dungeon.setWall(1, 1, "E", false);
          dungeon.cells[1][2].explorationObstacleId = obstacleId;
          dungeon.explored[1][1] = true;
          dungeon.explored[1][2] = true;
          player.resetPlayer(direction);
          player.setPlayerInputEnabled(true);
          message.textContent = "";
          return { obstacleId, oilId };
        },
        result() {
          const oilId = layout.branch === "oil" ? "fire_lizard_oil" : "ice_lizard_oil";
          return {
            obstacle: dungeon.getExplorationObstacleAt(2, 1)?.id || null,
            phase: player.state.overlayEvent?.phase || null,
            sp: character.sp,
            oil: inventory.getItemCount(character.inventory, oilId),
            message: message.textContent,
            moveCalls: window.qaMoveCalls || 0,
            position: [player.state.gridX, player.state.gridY],
            direction: player.state.dir,
            soundEffects: window.qaObstacleSoundEffects.slice()
          };
        }
      };
    }, { layout });

    const effectFrames = await page.evaluate(() => window.qa.effectFrames());
    assert.equal(effectFrames.audioFile, "sliding2.mp3");
    assert.notEqual(effectFrames.fireStart.offsetXRatio, effectFrames.fireLater.offsetXRatio);
    assert.notEqual(effectFrames.fireStart.scaleY, effectFrames.fireLater.scaleY);
    assert.equal(effectFrames.iceStart.sparkles.length, 5);
    assert.notDeepEqual(
      effectFrames.iceStart.sparkles.map(entry => entry.alpha),
      effectFrames.iceLater.sparkles.map(entry => entry.alpha)
    );
    assert.equal(effectFrames.reducedFire.offsetXRatio, 0);
    assert.equal(effectFrames.reducedIce.sparkles.length, 2);
    const audioAsset = await page.evaluate(async () => {
      const response = await fetch("/se/sliding2.mp3");
      const encoded = await response.arrayBuffer();
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(encoded.slice(0));
      await context.close();
      return { ok: response.ok, bytes: encoded.byteLength, duration: decoded.duration };
    });
    assert.equal(audioAsset.ok, true);
    assert.ok(audioAsset.bytes > 0);
    assert.ok(audioAsset.duration > 0);

    let nearFireWidth = 0;
    for (const obstacleId of ["fire_pillar", "giant_ice_block"]) {
      const visual = await page.evaluate(id => window.qa.show(id), obstacleId);
      assert.deepEqual({ width: visual.asset.width, height: visual.asset.height }, { width: 800, height: 800 });
      assert.ok(visual.asset.transparent > 0 && visual.asset.opaque > 0, `${layout.name}/${obstacleId}: alpha`);
      assert.ok(visual.draw, `${layout.name}/${obstacleId}: sprite was not drawn`);
      assert.ok(visual.draw.x >= 0 && visual.draw.x + visual.draw.width <= visual.canvas.width);
      assert.ok(visual.draw.y >= 0 && visual.draw.y + visual.draw.height <= visual.canvas.height);
      assert.ok(visual.draw.height >= visual.canvas.height * .74, JSON.stringify(visual.draw));
      assert.ok(visual.draw.height <= visual.canvas.height * .78, JSON.stringify(visual.draw));
      assert.ok(
        Math.abs(visual.draw.y + visual.draw.height - visual.canvas.height * 0.94) < 1,
        JSON.stringify(visual.draw)
      );
      if (obstacleId === "fire_pillar") nearFireWidth = visual.draw.width;
      await page.locator(".game").screenshot({ path: path.join(output, `${layout.name}-${obstacleId}.png`) });
    }
    const distant = await page.evaluate(() => window.qa.show("fire_pillar", "far"));
    assert.ok(distant.draw && distant.draw.width < nearFireWidth, `${layout.name}: distant scale`);
    assert.ok(Math.abs(distant.draw.y + distant.draw.height - distant.canvas.height * 0.75) < 1);
    const reverse = await page.evaluate(() => window.qa.show("giant_ice_block", "reverse"));
    assert.ok(reverse.draw, `${layout.name}: reverse approach`);
    assert.ok(Math.abs(reverse.draw.y + reverse.draw.height - reverse.canvas.height * 0.94) < 1);

    for (const [obstacleId, color] of [["fire_pillar", "#ff554f"], ["giant_ice_block", "#7fe3ff"]]) {
      const marker = await page.evaluate(id => window.qa.contactMarker(id), obstacleId);
      assert.deepEqual(marker.before, [], `${layout.name}/${obstacleId}: hidden before contact`);
      assert.equal(marker.discovered, true);
      assert.equal(marker.explored, false, `${layout.name}/${obstacleId}: contact must not reveal terrain`);
      assert.deepEqual(marker.position, [1, 1]);
      assert.equal(marker.after.at(-1)?.value, "▲");
      assert.equal(marker.after.at(-1)?.color, color);
      assert.match(marker.message, /迂回するしかなさそうだ。$/);
      await page.locator(".game").screenshot({ path: path.join(output, `${layout.name}-${obstacleId}-minimap-contact.png`) });
    }

    await page.evaluate(() => window.qa.prepareBranch());
    if (layout.input === "click") {
      await page.locator("#forward").evaluate(element => element.click());
      let current = await page.evaluate(() => window.qa.result());
      assert.equal(current.phase, "methodChoice", JSON.stringify(current));
      await page.locator("#buttonB").evaluate(element => element.click());
      assert.equal((await page.evaluate(() => window.qa.result())).phase, "confirm");
      await page.locator("#buttonA").evaluate(element => element.click());
    } else {
      await page.dispatchEvent("#forward", "touchend", { bubbles: true, cancelable: true });
      if (layout.branch === "oil") {
        assert.equal((await page.evaluate(() => window.qa.result())).phase, "confirm");
      } else {
        assert.equal((await page.evaluate(() => window.qa.result())).phase, "johanIntro");
      }
      await page.dispatchEvent("#buttonA", "touchend", { bubbles: true, cancelable: true });
    }
    const result = await page.evaluate(() => window.qa.result());
    assert.equal(result.obstacle, null);
    if (layout.branch === "mage") {
      assert.equal(result.sp, 20);
      assert.equal(result.oil, 1);
      assert.equal(result.soundEffects.filter(key => key === "explorationObstacleOil").length, 1);
    } else if (layout.branch === "johan") {
      assert.equal(result.sp, 20);
      assert.equal(result.oil, 2);
      assert.equal(result.soundEffects.includes("explorationObstacleOil"), false);
    } else {
      assert.equal(result.sp, 20);
      assert.equal(result.oil, 1);
      assert.equal(result.soundEffects.filter(key => key === "explorationObstacleOil").length, 1);
    }
    results.push({
      layout: layout.name,
      viewport: `${layout.width}x${layout.height}`,
      input: layout.input,
      removalBranch: layout.branch,
      assets: "800x800 AVIF with alpha",
      screenshots: [
        path.join(output, `${layout.name}-fire_pillar.png`),
        path.join(output, `${layout.name}-giant_ice_block.png`),
        path.join(output, `${layout.name}-fire_pillar-minimap-contact.png`),
        path.join(output, `${layout.name}-giant_ice_block-minimap-contact.png`)
      ]
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, errors, screenshots: output }, null, 2));
} finally {
  await browser.close();
}
