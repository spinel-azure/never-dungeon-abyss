import test from "node:test";
import assert from "node:assert/strict";
import {
  configurePlayer,
  handleOverlayEventInput,
  startBattleTreasureEvent,
  state
} from "../js/player.js";

test("a declined battle chest disappears without awarding loot", () => {
  let hidden = 0;
  let awarded = 0;
  configurePlayer({
    say: () => {},
    showTreasure: () => {},
    hideTreasure: () => { hidden += 1; },
    awardTreasure: () => { awarded += 1; return { message: "loot" }; },
    cancelAutoReturn: () => {},
    onStateChanged: () => {}
  });
  state.overlayEvent = null;
  startBattleTreasureEvent("red", "falling_stones", "victory");
  assert.equal(state.overlayEvent.transientAfterBattle, true);
  assert.match(state.overlayEvent.message, /宝箱はなくなります/);
  handleOverlayEventInput("cancel");
  assert.equal(state.overlayEvent, null);
  assert.equal(hidden, 1);
  assert.equal(awarded, 0);
});

test("an opened battle chest uses the normal trap and loot hooks", () => {
  let resolvedTrap = "";
  let awarded = 0;
  configurePlayer({
    say: () => {},
    showTreasure: () => {},
    hideTreasure: () => {},
    playSe: () => {},
    playTreasureOpening: (_type, complete) => complete(),
    resolveTreasureTrap: (_type, trapId) => { resolvedTrap = trapId; return { message: "" }; },
    awardTreasure: () => { awarded += 1; return { message: "loot" }; },
    cancelAutoReturn: () => {},
    onStateChanged: () => {}
  });
  state.overlayEvent = null;
  startBattleTreasureEvent("red", "poison_needle");
  handleOverlayEventInput("confirm");
  assert.equal(state.overlayEvent, null);
  assert.equal(resolvedTrap, "poison_needle");
  assert.equal(awarded, 1);
});
