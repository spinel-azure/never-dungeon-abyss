import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { CARDS, getCardById } from "../data/cards.js";
import { calculateDeckCost, grantCard, normalizeCardState, setDeckSlot } from "../data/deck.js";
import { equipInstance, grantEquipmentInstance } from "../data/equipment-inventory.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { applyStatus } from "../combat/status-lifecycle.js";
import { applyNpcAfterPlayerAttack } from "../combat/npc-support.js";
import { rollBlackChestLoot, rollRedChestLoot, rollPurpleChestLoot } from "../data/loot.js";
import { grantItem } from "../data/inventory.js";
const SR = "sr_follow_up_plus", C = "common_follow_up";
function equipCards(character, cardIds) {
  character.deckCost = 20;
  cardIds.forEach((cardId, index) => {
    character.cards = grantCard(character.cards, cardId, 1, character.deckCost).cards;
    character.cards = setDeckSlot(character.cards, index, cardId, character.deckCost);
  });
  return character;
}

function makeCharacter(job = "warrior", cardIds = []) {
  const source = createInitialCharacter({ name: "TEST", job });
  source.level = 40;
  const character = normalizeCharacter(source);
  character.baseStats = { ...character.baseStats, str: 30, int: 30, agi: 100, dex: 30, luc: 10 };
  character.hp = character.maxHp = 200;
  character.sp = character.maxSp = 100;
  return equipCards(character, cardIds);
}

function makeEnemy(index = 0, overrides = {}) {
  return {
    id: `magic_purple_test_${index}`,
    name: `DUMMY ${index}`,
    level: 1,
    race: "beast",
    hp: 999,
    maxHp: 999,
    sp: 0,
    maxSp: 0,
    attack: 1,
    def: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 },
    statuses: [],
    statusResistances: {},
    elementMultipliers: {},
    alive: true,
    isBoss: false,
    experienceReward: 10,
    actions: [{ id: "wait", name: "待機", actionType: "wait", weight: 1 }],
    ...overrides
  };
}

function resolve(character, enemy, command = { type: "attack" }, rng = () => 0.5) {
  return resolveBattleRound({ battle: createBattleState({ character, enemy }), playerCommand: command, rng }).battle;
}

function playerHitDamage(battle) {
  return battle.presentationEvents
    .filter(event => event.type === "attackHit" && event.actorSide === "player")
    .reduce((total, event) => total + event.damage, 0);
}

function followUps(battle) {
  return battle.presentationEvents.filter(event => event.type === "followUpDamage");
}


test("Follow-Up Plus definition, shared icon, cost and ownership/deck limits", () => {
  const card = getCardById(SR);
  assert.equal(CARDS.filter(c => c.id === SR).length, 1);
  assert.deepEqual([card.rarity, card.cost, card.maxOwned, card.maxCopies, card.effectId, card.effectValue],
    ["SR", 4, 1, 1, "direct_damage_follow_up", 50]);
  assert.equal(card.iconId, getCardById(C).iconId);
  assert.equal(card.nameJa, "追撃＋");
  assert.equal(card.concept, "直接ダメージ後に固定50ダメージ");
  assert.equal(card.descriptionJa, "通常攻撃・物理スキル・攻撃呪文で\nダメージを与えた敵に、50の固定追加ダメージ。");
  const character = makeCharacter("warrior", [C, SR]);
  assert.equal(calculateDeckCost(character.cards.deckSlots), 5);
  assert.equal(character.cards.deckSlots.filter(Boolean).length, 2);
  assert.equal(grantCard(character.cards, SR, 2, 20).gained, 0);
  assert.equal(setDeckSlot(character.cards, 2, SR, 20).deckSlots[2], null);
  const empty = setDeckSlot(character.cards, 1, null, 20);
  assert.equal(setDeckSlot(empty, 1, SR, 4).deckSlots[1], null);
  assert.deepEqual(normalizeCardState(JSON.parse(JSON.stringify(character.cards)), 20), character.cards);
  const legacy = makeCharacter("warrior", [C]);
  assert.deepEqual(normalizeCardState(legacy.cards, 20), legacy.cards);
  assert.equal(legacy.cards.ownedCardCounts[SR], undefined);
});

for (const [cards, amount] of [[[C], 10], [[SR], 50], [[C, SR], 60]]) {
  for (const [job, command] of [["warrior", {type:"attack"}], ["warrior", {type:"skill",skillId:"wide_swing"}], ["mage", {type:"skill",skillId:"fireball"}]]) {
    test(`Follow-Up ${amount}: ${job} ${command.skillId || "attack"} applies one combined event`, () => {
      const battle = resolve(makeCharacter(job, cards), makeEnemy(), command);
      assert.ok(playerHitDamage(battle) > 0);
      assert.deepEqual(followUps(battle).map(e => e.damage), [amount]);
      assert.equal(battle.log.filter(s => s === `追撃！ ${amount}ダメージ！`).length, 1);
    });
  }
}

test("Five Star's five landed hits add only 50, never 250 or recursive follow-ups", () => {
  let character = makeCharacter("thief", [SR]);
  const grant = grantEquipmentInstance(character, "the_five_star", "rightArmId");
  character = equipInstance(grant.character, "rightArmId", grant.instance.instanceId).character;
  const battle = resolve(character, makeEnemy(0, {hp:99999,maxHp:99999,isBoss:true}));
  const hits = battle.presentationEvents.filter(e => e.type === "attackHit" && e.actorSide === "player");
  assert.equal(hits.length, 5);
  assert.ok(hits.every(e => e.hit));
  assert.deepEqual(followUps(battle).map(e => e.damage), [50]);
  assert.equal(99999 - battle.enemy.hp, playerHitDamage(battle) + 50);
});

test("all-enemy spell applies once to each surviving damaged target", () => {
  const enemies = [0,1,2].map(i => makeEnemy(i));
  const battle = resolveBattleRound({battle:createBattleState({character:makeCharacter("mage",[SR]),enemy:enemies[0],enemies}),playerCommand:{type:"skill",skillId:"flame_sweep"},rng:()=>0.5}).battle;
  assert.deepEqual(followUps(battle).map(e => [e.targetIndex,e.damage]), [[0,50],[1,50],[2,50]]);
});

test("eight random hits deduplicate each affected target, including repeated selections", () => {
  for (const rng of [()=>0.5, (()=>{let n=0;return ()=>[0.2,0.5,0.8][n++%3];})()]) {
    const character=makeCharacter("thief",[SR]);
    character.skillIds.push("acht_streich"); character.sp=character.maxSp=200;
    character.playerCharge={value:100,cooldown:0};
    const enemies=[0,1,2].map(i=>makeEnemy(i,{hp:99999,maxHp:99999,isBoss:true}));
    const battle=resolveBattleRound({battle:createBattleState({character,enemy:enemies[0],enemies}),playerCommand:{type:"skill",skillId:"acht_streich"},rng}).battle;
    const hits=battle.presentationEvents.filter(e=>e.type==="attackHit"&&e.actorSide==="player");
    assert.equal(hits.length,8);
    const targets=[...new Set(hits.filter(e=>e.damage>0).map(e=>e.targetIndex))].sort();
    assert.deepEqual(followUps(battle).map(e=>e.targetIndex).sort(),targets);
    assert.ok(followUps(battle).every(e=>e.damage===50));
  }
});

test("SR excludes all misses, zero damage, direct kills and capture puzzle fights", () => {
  const miss=resolve(makeCharacter("warrior",[SR]),makeEnemy(0,{stats:{str:1,int:1,agi:999,dex:999,luc:1},physicalHitFloor:0,evasionBonus:0.9}),{type:"attack"},()=>0.999999);
  assert.equal(playerHitDamage(miss),0); assert.equal(followUps(miss).length,0);
  const zero=resolve(makeCharacter("mage",[SR]),makeEnemy(0,{elementMultipliers:{fire:0}}),{type:"skill",skillId:"fireball"});
  assert.equal(playerHitDamage(zero),0); assert.equal(followUps(zero).length,0);
  for (const enemy of [makeEnemy(0,{hp:1,maxHp:1}),makeEnemy(0,{capturePuzzle:true})]) {
    assert.equal(followUps(resolve(makeCharacter("warrior",[SR]),enemy)).length,0);
  }
});

test("DOT, item and NPC damage do not trigger SR follow-ups", () => {
  const character=makeCharacter("warrior",[SR]);
  const poisoned=makeEnemy(0,{statuses:applyStatus([],{statusId:"poison",success:true})});
  const battle=resolve(character,poisoned,{type:"wait"});
  assert.ok(battle.presentationEvents.some(e=>e.type==="poisonDamage"));
  assert.equal(followUps(battle).length,0);
  character.inventory=grantItem(character.inventory,"stone",1).inventory;
  const item=resolve(character,makeEnemy(),{type:"item",itemId:"stone"},()=>0);
  assert.equal(item.enemy.hp,990); assert.equal(followUps(item).length,0);
  character.npcSystem={registeredIds:["alec"],activeIds:["alec"],records:{alec:{maxDepth:10,growthStage:1,charge:0,chargeCooldown:0}},renewal:null,expeditionMaxDepth:10};
  const npc=createBattleState({character,enemy:makeEnemy()});
  applyNpcAfterPlayerAttack(npc,()=>0.5);
  assert.ok(npc.presentationEvents.some(e=>e.actorSide==="npc"));
  assert.equal(followUps(npc).length,0);
});

test("DEF, elemental resistance, critical hits and magic focus do not scale fixed damage", () => {
  for (const rng of [()=>0,()=>0.5]) {
    const critical=resolve(makeCharacter("warrior",[SR]),makeEnemy(0,{def:60,isBoss:true}),{type:"attack"},rng);
    assert.deepEqual(followUps(critical).map(e=>e.damage),[50]);
  }
  const mage=makeCharacter("mage",[SR]);
  mage.statuses=applyStatus([],{statusId:"magic_focus",success:true});
  for (const fire of [0.5,1.5]) {
    const battle=resolve(mage,makeEnemy(0,{elementMultipliers:{fire}}),{type:"skill",skillId:"fireball"});
    assert.deepEqual(followUps(battle).map(e=>e.damage),[50]);
  }
});

test("Gemini keeps one follow-up per casting for C, SR and combined cards", () => {
  for(const [cards,amount] of [[[C],10],[[SR],50],[[C,SR],60]]) {
    const battle=resolve(makeCharacter("mage",[...cards,"zodiac_gemini"]),makeEnemy(0,{hp:99999,maxHp:99999}),{type:"skill",skillId:"fireball"});
    assert.deepEqual(followUps(battle).map(e=>e.damage),[amount,amount]);
    assert.equal(battle.geminiDuplicationAvailable,false);
  }
});

test("SR lethal follow-up produces one victory with all enemies defeated", () => {
  const command={type:"skill",skillId:"fireball"};
  const direct=playerHitDamage(resolve(makeCharacter("mage"),makeEnemy(),command));
  const battle=resolve(makeCharacter("mage",[SR]),makeEnemy(0,{hp:direct+40,maxHp:direct+40}),command);
  assert.equal(battle.outcome,"victory");
  assert.equal(battle.enemy.hp,0); assert.equal(battle.enemy.alive,false);
  assert.deepEqual(followUps(battle).map(e=>e.damage),[50]);
});

test("unassigned SR never enters generic chest pools across floors and jobs", () => {
  for(let depth=1;depth<=100;depth++) for(const job of ["warrior","thief","priest","mage"]) for(let i=0;i<=100;i++) {
    const rng=()=>Math.min(i/100,0.999999);
    for(const result of [rollBlackChestLoot(rng,depth,job),rollRedChestLoot(rng,depth),rollPurpleChestLoot(rng,depth)]) assert.notEqual(result.cardId,SR);
  }
});
test("protected auto and manual saves restore the new card and preserve C-only legacy saves", async () => {
  const storage=new Map();
  globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  globalThis.window={dispatchEvent(){}};
  globalThis.CustomEvent=class {constructor(type){this.type=type;}};
  try {
    const {writeGame,loadGame}=await import("../js/save-data.js");
    for(const [slot,cards] of [["auto",[C,SR]],["manual1",[C]]]) {
      const character=makeCharacter("warrior",cards);
      const snapshot={character,player:{gridX:1,gridY:1,dir:0},dungeon:{cells:[[{type:"floor"}]],explored:[[true]]}};
      assert.equal(writeGame(snapshot,slot),true);
      const restored=normalizeCharacter(loadGame(slot).character);
      assert.deepEqual(restored.cards,character.cards);
    }
  } finally {
    delete globalThis.localStorage; delete globalThis.window; delete globalThis.CustomEvent;
  }
});