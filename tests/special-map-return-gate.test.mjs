import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpecialMapV2Session,switchV2Floor,warpV2ToEntrance} from '../js/special-map/session-v2.js';
import {mapOriginalId} from '../data/special-maps.js';
import {selectNormalMapBoss} from '../data/karte-normal-bosses.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const map={rulesetVersion:'special-map-v2',seed:12345,level:5,rarity:'WHITE',discovererName:'QA'};
test('status shows independent V2 EXP pool and restores normal carried EXP outside V2',()=>{
 const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 let active=null,nodes;const element={replaceChildren(...v){nodes=v;}};
 const scope={getSpecialMapContext:()=>active,MAX_LEVEL:999,getNextLevelExperience:()=>20000,hasCardEffect:()=>false,
  document:{querySelector:()=>element,createTextNode:textContent=>({textContent}),createElement:()=>({classList:{toggle(){}}})}};
 vm.runInNewContext(source.slice(source.indexOf('  function renderExperience('),source.indexOf('  function getRandomEncounterEnemyPartyData('))+';this.render=renderExperience;',scope);
 const c={experience:123,carriedExperience:777,level:5};scope.render(c);assert.equal(nodes[1].textContent,'+777');
 active={session:{kind:'specialMapV2',battleExperience:10000}};scope.render(c);assert.equal(nodes[0].textContent,'0000123');assert.equal(nodes[1].textContent,'+10000');assert.equal(c.carriedExperience,777);
 active.session.battleExperience=0;scope.render(c);assert.equal(nodes[1].textContent,'');
 active={session:{kind:'specialMap'}};scope.render(c);assert.equal(nodes[1].textContent,'+777');
});
test('boss world sprite matches selected boss; gate replaces it only after victory',()=>{
 let save=true;const s=createSpecialMapV2Session([map],mapOriginalId(map),{persistSurvey:()=>({ok:save})});
 assert.equal(s.getBossRenderState(),null);switchV2Floor(s,s.blueprint.links[1].lower);
 const p=s.generatedMap.bossRoom.bossCell,boss=selectNormalMapBoss({...map,themeId:s.generatedMap.themeId});
 assert.equal(s.getBossRenderState().definition.image,boss.image);assert.equal(s.getBossRenderState().x,p.x);assert.equal(s.getBossRenderState().y,p.y);
 s.playerX=p.x;s.playerY=p.y;assert.equal(warpV2ToEntrance(s),false);
 s.bossDefeated=true;assert.equal(s.getBossRenderState().definition.image,'images/dungeon_effects/warp_portal.avif');
 save=false;s.recordSurvey(p.x,p.y);assert.equal(warpV2ToEntrance(s),false);assert.equal(s.currentFloor,2);
 save=true;assert.equal(warpV2ToEntrance(s),true);assert.equal(s.currentFloor,0);assert.equal(s.getBossRenderState(),null);
});
