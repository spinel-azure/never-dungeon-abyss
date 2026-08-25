import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FLOOR_ZONES, getFloorZone, getFloorZoneName } from "../data/floor-zone-names.js";

const expected = Object.freeze([
  [1, 9, "Der Beginn", "始まり"],
  [10, 19, "Magie-Zone", "魔術区域"],
  [20, 29, "Folter-Zone", "拷問区域"],
  [30, 39, "Glut-Zone", "灼熱区域"],
  [40, 49, "Frost-Zone", "極寒区域"],
  [50, 59, "Dschungel-Zone", "密林区域"],
  [60, 69, "Wüsten-Zone", "砂漠区域"],
  [70, 79, "Wildwasser-Zone", "激流区域"],
  [80, 89, "Kristall-Zone", "結晶区域"],
  [90, 99, "Finsternis-Zone", "漆黒区域"],
  [100, 100, "Final-Zone", "最終区域"]
]);

test("the named dungeon zones cover B1F through B100F exactly", () => {
  assert.equal(FLOOR_ZONES.length, expected.length);
  expected.forEach(([minimumDepth, maximumDepth, name, japaneseName], index) => {
    assert.deepEqual(FLOOR_ZONES[index], { minimumDepth, maximumDepth, name, japaneseName });
    for (let depth = minimumDepth; depth <= maximumDepth; depth += 1) {
      assert.equal(getFloorZoneName(depth), name, `B${depth}F`);
      assert.equal(getFloorZone(depth)?.japaneseName, japaneseName, `B${depth}F`);
    }
  });
  assert.equal(getFloorZoneName(0), "");
  assert.equal(getFloorZoneName(101), "");
});

test("floor transition overlay renders the zone name beneath the floor number in a smaller font", async () => {
  const [player, renderer] = await Promise.all([
    readFile(new URL("../js/player.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8")
  ]);
  assert.match(player, /overlayMessage: `B\$\{depth\}F`[\s\S]*?overlaySubtitle: getFloorZoneName\(depth\)/);
  assert.match(renderer, /const subtitle = String\(state\.overlayEvent\?\.overlaySubtitle/);
  assert.match(renderer, /Math\.floor\(H \* \.15\)[\s\S]*?Math\.floor\(H \* \.045\)/);
  assert.match(renderer, /ctx\.fillText\(subtitle, W \/ 2, H \* \.59\)/);
});

test("entering through a transfer portal also shows the destination floor and zone", async () => {
  const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  const transferEntry = main.match(/async function enterFloorFromTransfer\(depth = 10\)[\s\S]*?return true;\n  }/)?.[0] || "";

  assert.match(transferEntry, /await runSceneTransition\(/);
  assert.match(transferEntry, /startFloorLapNotice\(destination\);/);
  assert.ok(
    transferEntry.indexOf("startFloorLapNotice(destination);") > transferEntry.indexOf("await runSceneTransition("),
    "the floor notice should begin after the transfer transition completes"
  );
});
