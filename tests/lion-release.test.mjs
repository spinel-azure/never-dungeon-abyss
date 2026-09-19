import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {CARDS} from '../data/cards.js';
import {getLeoDoorAccess,LEO_EVENT_RELEASED,LION_RUMOR_READ_FLAG} from '../data/loewenkoenigin.js';
import {getUnreadTavernRumors,getPastTavernRumors,markTavernRumorRead,getTavernRumorTypewriterParts} from '../data/tavern-rumors.js';
import {syncTavernRumorNotifications,markTavernRumorNotificationsShown} from '../data/tavern-rumor-notifications.js';
import {createBossCombatant,applyBossVictory} from '../data/bosses.js';
import {getSpecialRoomDefinition} from '../data/special-rooms.js';
const cards=CARDS.filter(c=>c.rarity==='Z'&&c.id!=='zodiac_leo');
function hero(){const c=createInitialCharacter({name:'QA',job:'warrior'});c.cards.ownedCardCounts=Object.fromEntries(cards.map(c=>[c.id,1]));return c;}
const rumor=c=>getUnreadTavernRumors(c).find(r=>r.rumorId==='rumor_016');
const past=c=>getPastTavernRumors(c).find(r=>r.id==='rumor_016');
test('all eleven distinct non-Leo cards unlock rumor but not the door',()=>{
 const c=hero();assert.equal(LEO_EVENT_RELEASED,true);assert.equal(rumor(c).stageId,'base');assert.equal(getLeoDoorAccess(c).blocked,true);
 for(const card of cards){const missing=structuredClone(c);delete missing.cards.ownedCardCounts[card.id];missing.cards.ownedCardCounts.zodiac_leo=99;assert.equal(rumor(missing),undefined);missing.eventFlags[LION_RUMOR_READ_FLAG]=true;assert.equal(getLeoDoorAccess(missing).blocked,true);}
});
test('only completed reading opens the door; notification alone does not',()=>{
 let c=hero();const synced=syncTavernRumorNotifications(c);assert.ok(synced.addedIds.includes('rumor_016:base'));
 c=markTavernRumorNotificationsShown(synced.character,['rumor_016:base']);assert.equal(getLeoDoorAccess(c).blocked,true);
 c=markTavernRumorRead(c,rumor(c));assert.equal(getLeoDoorAccess(c).blocked,false);assert.match(getLeoDoorAccess(c).confirmMessage,/扉を開けますか/);
 assert.equal(rumor(c),undefined);assert.equal(past(c).title,'獅子の咆哮の噂');
});
test('exact customer and Rosa text uses the shared typewriter format',()=>{
 const r=rumor(hero());assert.equal(r.dialogue.length,3);
 assert.deepEqual(r.dialogue.map(m=>getTavernRumorTypewriterParts(m).dialogue),[
 'おい、知ってるか？奈落B1Fから獅子の雄叫びが聞こえるらしいぞ。',
 'ああ。「獅子」の紋様が刻まれた金色の扉の中からだってな。',
 'まぁ…！奈落の入口のすぐ近くでそんな事が…？怖いわ…。']);
});
test('continuation requires both defeat and Leo; reading it moves full dialogue to history',()=>{
 let c=hero();c=markTavernRumorRead(c,rumor(c));
 const onlyCard=structuredClone(c);onlyCard.cards.ownedCardCounts.zodiac_leo=1;assert.equal(rumor(onlyCard),undefined);
 c.eventFlags.boss_loewenkoenigin_b1f_defeated=true;assert.equal(rumor(c),undefined);
 c.cards.ownedCardCounts.zodiac_leo=1;let r=rumor(c);assert.equal(r.stageId,'defeated');assert.equal(r.dialogue.length,4);
 assert.equal(getTavernRumorTypewriterParts(r.dialogue[3]).dialogue,'えっ！獅子の女王がいたですって！？しかも倒した！？あなた本当に何者なの…？');
 assert.ok(syncTavernRumorNotifications(c).addedIds.includes('rumor_016:defeated'));
 c=markTavernRumorRead(c,r);assert.equal(rumor(c),undefined);assert.equal(past(c).description.length,4);assert.equal(getLeoDoorAccess(c).blocked,true);
});
test('legacy saves and JSON normalization preserve new flags without migration',()=>{
 assert.equal(getLeoDoorAccess({}).blocked,true);assert.equal(rumor({}),undefined);
 let c=hero();delete c.eventFlags;c=normalizeCharacter(c);assert.equal(getLeoDoorAccess(c).blocked,true);
 c=markTavernRumorRead(c,rumor(c));c=normalizeCharacter(JSON.parse(JSON.stringify(c)));assert.equal(getLeoDoorAccess(c).blocked,false);
 c=applyBossVictory(c,'loewenkoenigin_b1f').character;c.cards.ownedCardCounts.zodiac_leo=1;c=normalizeCharacter(JSON.parse(JSON.stringify(c)));assert.equal(rumor(c).stageId,'defeated');
});
test('B1 room connects queen intro, golden door remains isolated, battle selects holy-war music',()=>{
 const room=getSpecialRoomDefinition(1);assert.equal(room.content.bossId,'loewenkoenigin_b1f');assert.equal(room.content.type,'eventBoss');assert.equal(room.lock.mode,'alwaysSuccess');
 const boss=createBossCombatant('loewenkoenigin_b1f');assert.equal(boss.battleBgmKey,'finalBoss');
 assert.match(readFileSync('js/audio.js','utf8'),/\["finalBoss", "bgm\/tozasareshi-seisen.mp3"\]/);
 assert.match(readFileSync('js/player.js','utf8'),/boss.id === LOEWENKOENIGIN_ID[\s\S]*?startBossEvent\(boss.id, fromGX, fromGY\)/);
});
