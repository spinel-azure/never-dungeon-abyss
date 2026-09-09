import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  INN_MEDICINE_DELIVERY_TRANSITION_FLAG,
  getStableInnKeeperId
} from "../js/town.js";

const root = new URL("../", import.meta.url);
const [townSource, townCss, mainSource, menuSource] = await Promise.all([
  readFile(new URL("js/town.js", root), "utf8"),
  readFile(new URL("css/town.css", root), "utf8"),
  readFile(new URL("js/main.js", root), "utf8"),
  readFile(new URL("js/menu.js", root), "utf8")
]);

test("an inn keeper stays fixed across redraws and may change only on a new visit or explicit story transition", () => {
  assert.equal(getStableInnKeeperId({
    currentKeeperId: "anna_happy",
    requestedKeeperId: "johanna",
    newVisit: false
  }), "anna_happy");
  assert.equal(getStableInnKeeperId({
    currentKeeperId: "anna_happy",
    requestedKeeperId: "johanna",
    newVisit: true
  }), "johanna");
  assert.equal(getStableInnKeeperId({
    currentKeeperId: "anna_sad",
    requestedKeeperId: "anna_happy",
    newVisit: false,
    forceKeeperChange: true
  }), "anna_happy");
  assert.equal(getStableInnKeeperId(), "johanna");
});

test("the selected inn keeper is saved, restored, and resolved with a new-visit boundary", () => {
  assert.match(townSource, /openTown\(\{[\s\S]*innKeeperId = null/);
  assert.match(townSource, /innKeeperId: currentFacility\(\)\.id === "inn" \? town\.innKeeperId \|\| null : null/);
  assert.match(townSource, /onEnterInn\(\{[\s\S]*newVisit,[\s\S]*innKeeperId: town\.innKeeperId \|\| null/);
  assert.match(townSource, /function activateFacility[\s\S]*facility\.id === "inn"[\s\S]*innVisitPending = true/);
  assert.match(townSource, /function resolveInnProfile[\s\S]*town\.innVisitPending = false/);
});

test("inn profiles can supply portraits, dialogue, stay messages, and one-shot voice cues", () => {
  for (const field of [
    "keeper", "image", "portraitAlt", "message", "dialogue", "completionFlag",
    "stayConfirmMessage", "stayAcceptedMessage", "stayCancelledMessage",
    "stayConfirmVoice", "stayAcceptedVoice", "stayCancelledVoice"
  ]) {
    assert.match(townSource, new RegExp(field));
  }
  assert.match(townSource, /onTalk\(facility\?\.id,[\s\S]*innKeeperId: town\.innKeeperId/);
  assert.match(townSource, /town\.onStay\(buildInnStayContext\(fee, false\)\)/);
  assert.match(townSource, /town\.onStay\(buildInnStayContext\(getInnStayFee\(town\.getCharacter\(\)\), true\)\)/);
  assert.match(townSource, /function setInnMessage[\s\S]*unchanged && !forceVoice[\s\S]*playPendingFacilityVoice/);
});

test("medicine delivery locks input, swaps the portrait while black, and resumes a returned dialogue", () => {
  assert.equal(INN_MEDICINE_DELIVERY_TRANSITION_FLAG, "quest_031_medicine_delivery_transition");
  assert.match(townSource, /facilityTalkCompletionFlag === INN_MEDICINE_DELIVERY_TRANSITION_FLAG[\s\S]*beginInnMedicineDeliveryTransition/);
  assert.match(townSource, /function beginInnMedicineDeliveryTransition[\s\S]*town\.transitioning = true[\s\S]*classList\.add\("is-inn-medicine-blackout"\)[\s\S]*onCompleteFacilityTalk\(INN_MEDICINE_DELIVERY_TRANSITION_FLAG[\s\S]*applyInnTransitionResult/);
  assert.match(townSource, /function applyInnTransitionResult[\s\S]*applyInnPortrait[\s\S]*facilityTalkCompletionFlag = town\.innProfile\.completionFlag/);
  assert.match(townSource, /function applyInnTransitionResult[\s\S]*setInnMessage\(dialogue\[0\], town\.innProfile, "talkVoice"/);
  assert.match(mainSource, /flag === INN_MEDICINE_DELIVERY_TRANSITION_FLAG[\s\S]*keeperId: "anna_happy"[\s\S]*voice: "inn"[\s\S]*stayConfirmMessage:/);
  assert.match(townSource, /function handleFacilityTalkInput\(action\) \{\s*if \(town\.transitioning\) return true/);
  assert.match(townCss, /\.town-screen\.is-inn-medicine-blackout::after\{opacity:1\}/);
});

test("sad Anna keeps a subdued wake-up line and quest history respects custom headings", () => {
  assert.match(mainSource, /keeperId === "anna_sad"[\s\S]*宿屋の娘アンナ：…おはようございます…。/);
  assert.match(mainSource, /flag === "johanna_cat_return_transition"[\s\S]*return enterInn\(\{ newVisit: false, innKeeperId: "johanna" \}\)/);
  assert.match(townSource, /completeDuringBlackout && completionFlag[\s\S]*applyInnTransitionResult\(transitionResult\)/);
  assert.match(menuSource, /const objectiveHeading = quest\.objectiveHeading \|\| "目的"/);
  assert.match(menuSource, /\$\{objectiveHeading\}：\$\{quest\.objectiveLabel/);
});
