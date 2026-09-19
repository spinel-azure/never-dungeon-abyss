import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {QUESTS,FLOOR_SURVEY_QUEST_ID as ID,B2F_UNLOCK_QUEST_IDS,acceptQuest,getQuestProgress,recordFloorExploration,recordEnemyDefeat,reportQuest,isDungeonDepthUnlocked,hasActiveFullFloorSurvey} from '../data/quests.js';
import {getLeoDoorAccess} from '../data/loewenkoenigin.js';
import {getSpecialRoomDefinition} from '../data/special-rooms.js';
const map=n=>Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>y*10+x<n));
const fresh=()=>acceptQuest(createInitialCharacter({name:'調査',job:'warrior'}),ID).character;
test('003: 98 cells incomplete, 99 cells reportable while Leo remains sealed',()=>{
 let c=fresh();assert.equal(getQuestProgress(c,ID).active,true);
 assert.equal(getLeoDoorAccess(c).sealed,true);
 c=recordFloorExploration(c,{depth:1,explored:map(98)});assert.equal(getQuestProgress(c,ID).readyToReport,false);
 c=recordFloorExploration(c,{depth:1,explored:map(99)});const p=getQuestProgress(c,ID);
 assert.equal(p.readyToReport,true);assert.equal(`${p.progress}/${p.quest.requiredCount}`,'99/99');assert.equal(p.quest.objectiveLabel,'B1Fを99マス踏破する');
 assert.equal(c.eventFlags.achievement_b1f_100_cells,undefined);assert.equal(getLeoDoorAccess(c).sealed,true);
 assert.equal(hasActiveFullFloorSurvey(c,1),false);
});
test('003: old saved progress 99 survives normalization and return without migration',()=>{
 let c=fresh();c.quests.active[ID].progress=99;c=normalizeCharacter(JSON.parse(JSON.stringify(c)));
 assert.equal(getQuestProgress(c,ID).readyToReport,true);
 c=recordFloorExploration(c,{depth:0,explored:[]});assert.equal(getQuestProgress(c,ID).progress,99);assert.equal(reportQuest(c,ID).accepted,true);
 let incomplete=recordFloorExploration(fresh(),{depth:1,explored:map(98)});
 incomplete=recordFloorExploration(incomplete,{depth:0,explored:[]});assert.equal(getQuestProgress(incomplete,ID).progress,0);
});
test('001+002+003: actual kill and exploration progress unlock B2F only after all reports',()=>{
 let c=createInitialCharacter({name:'新規',job:'warrior'});
 for(const id of B2F_UNLOCK_QUEST_IDS){const r=acceptQuest(c,id);assert.equal(r.accepted,true);c=r.character;}
 for(const enemy of ['abyss_rat','cave_slime'])for(let i=0;i<15;i++)c=recordEnemyDefeat(c,enemy,1);
 c=recordFloorExploration(c,{depth:1,explored:map(99)});
 for(const id of B2F_UNLOCK_QUEST_IDS){assert.equal(isDungeonDepthUnlocked(c,2),false);const r=reportQuest(c,id);assert.equal(r.accepted,true);c=r.character;}
 assert.equal(isDungeonDepthUnlocked(c,2),true);assert.equal(getLeoDoorAccess(c).blocked,true);
});
test('only B1 survey uses 99; B35/B45 remain accessible 100-cell surveys',()=>{
 assert.deepEqual(QUESTS.filter(q=>q.objectiveType==='exploreFloor').map(q=>[q.targetDepth,q.requiredCount]),[[1,99],[35,100],[45,100]]);
 for(const depth of [35,45])assert.equal(getSpecialRoomDefinition(depth).content,null);
 assert.equal(getSpecialRoomDefinition(1).content.bossId,'loewenkoenigin_b1f');
});
