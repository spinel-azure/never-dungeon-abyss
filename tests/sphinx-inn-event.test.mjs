import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainSource = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
const townSource = await readFile(new URL("../js/town.js", import.meta.url), "utf8");
const townCss = await readFile(new URL("../css/town.css", import.meta.url), "utf8");

test("borrowing Johanna's cat waits for the final confirmation before granting and saving it", () => {
  const talkBranch = mainSource.match(/function talkAtFacility\(facilityId\) \{([\s\S]*?)if \(facilityId === "guild"/u)?.[1] || "";
  assert.match(talkBranch, /危ない目には遭わせないでおくれよ？\\n＊Aボタン：次へ/);
  assert.match(talkBranch, /completionFlag: "johanna_cat_borrow_transition"/);
  assert.doesNotMatch(talkBranch, /grantKeyItem|showNamedItemGetEffect|autoCompleteAfterMs/);
  assert.match(mainSource, /flag === "johanna_cat_borrow_transition"[\s\S]*grantKeyItem\(character\.keyItems, "johanna_calico_cat"\)[\s\S]*saveGame\(\)[\s\S]*showNamedItemGetEffect\(\["ヨハンナの愛猫"\], \{ important: true \}\)/);
  assert.doesNotMatch(townSource, /autoCompleteAfterMs/);
});

test("the cat item popup owns the three-second wait and the inn transition timers are disposable", () => {
  assert.match(townSource, /JOHANNA_CAT_BORROW_POPUP_WAIT_MS = 3000/);
  assert.match(townSource, /function beginJohannaCatBorrowTransition\(\)[\s\S]*town\.transitioning = true;[\s\S]*onCompleteFacilityTalk\(JOHANNA_CAT_BORROW_TRANSITION_FLAG\)[\s\S]*runJohannaCatBlackout\(\{ delayMs: JOHANNA_CAT_BORROW_POPUP_WAIT_MS \}\)/);
  assert.match(townSource, /function scheduleJohannaCatTransition[\s\S]*johannaCatTransitionTimers\.add\(timer\)/);
  assert.match(townSource, /function clearJohannaCatTransitionTimers[\s\S]*clearTimeout[\s\S]*classList\.remove\("is-inn-cat-blackout"\)/);
  assert.match(townSource, /export function closeTown\(\)[\s\S]*clearJohannaCatTransitionTimers\(\)/);
  assert.match(townSource, /completingJohannaCatBorrow[\s\S]*if \(!completingJohannaCatBorrow\) town\.playSe\("confirm"\)/);
  assert.match(townCss, /\.town-screen\.is-inn-cat-blackout::after\{opacity:1\}/);
  assert.match(townCss, /johanna-cat-message-expanded \.message\{height:calc\(1\.35em \* 5 \+ 18px\)/);
});

test("returning Johanna's cat waits for her dialogue and removes it during blackout", () => {
  assert.match(mainSource, /危ない目には遭わなかったかい？";[\s\S]*completionFlag: "johanna_cat_return_transition"/);
  assert.match(townSource, /facilityTalkCompletionFlag === JOHANNA_CAT_RETURN_TRANSITION_FLAG[\s\S]*beginJohannaCatBlackout/);
  assert.match(townSource, /function beginJohannaCatBlackout\(completionFlag\)[\s\S]*completeDuringBlackout: true/);
  assert.match(mainSource, /flag === "johanna_cat_return_transition"[\s\S]*consumeKeyItem\(character\.keyItems, "johanna_calico_cat"\)/);
});

test("Anastasia keeps her separate facility blackout path", () => {
  assert.match(townSource, /facilityTalkCompletionFlag === ANASTASIA_OUTFIT_EVENT_FLAG[\s\S]*beginAnastasiaOutfitBlackout\(\)/);
  assert.match(townSource, /function beginAnastasiaOutfitBlackout\(\)[\s\S]*onCompleteFacilityTalk\(ANASTASIA_OUTFIT_EVENT_FLAG\)[\s\S]*renderFacility\(\)/);
});

test("the peaceful Sphinx reward displays its card popup after state settlement", () => {
  assert.match(mainSource, /showCardGetEffect\("legendary_sphinx_wisdom", \{ seId: "itemGet" \}\), 120/);
});

test("battle-earned cards move the popup into the dungeon viewport and Sphinx waits for settlement", () => {
  assert.match(mainSource, /townScreen\?\.hidden && viewport[\s\S]*viewport\.append\(cardGetEffect\)/);
  assert.match(mainSource, /showCardGetEffect\(cardId, \{ seId: "itemGet" \}\), 120/);
  assert.match(mainSource, /showCardGetEffect\(victory\.reward\.cardId, \{ seId: "itemGet" \}\), 120/);
});
