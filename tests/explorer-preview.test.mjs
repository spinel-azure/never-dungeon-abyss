import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createMapPreview, moveMapPreview, selectMapPreview, PREVIEW_MAPS, getTentBackground, isExplorerTestEnabled, setExplorerTestEnabled, onExplorerTestChanged} from '../js/explorer-preview.js';
test('tent backgrounds switch at all local-hour boundaries',()=>{
 for(const [h,s] of [[0,'c'],[4,'c'],[5,'f'],[7,'f'],[8,'e'],[16,'e'],[17,'d'],[18,'d'],[19,'c'],[23,'c']])assert.equal(getTentBackground(h),`images/background/dungeon_01${s}.avif`);
});
test('0, 1, 5, 6 and 10 fixtures paginate and wrap without invalid selection',()=>{
 for(const count of [0,1,5,6,10]){const s=createMapPreview(count);for(const key of ['up','right','down','left','down','right']){moveMapPreview(s,key);assert.ok(s.index>=0&&s.index<Math.max(1,count));assert.equal(s.page,Math.floor(s.index/5));}s.page=s.index=0;moveMapPreview(s,'right');assert.equal(s.page,count>5?1:0);}
});
test('second touch opens details, cancelled touch selection is reset by navigation',()=>{
 const s=createMapPreview(10);assert.equal(selectMapPreview(s,7),false);assert.equal(selectMapPreview(s,7),true);assert.equal(s.page,1);assert.equal(s.index,7);
 moveMapPreview(s,'left');assert.equal(s.index,7);s.detail=false;s.armed=-1;assert.equal(s.page,1);assert.equal(s.index,7);
 assert.equal(selectMapPreview(s,7),false);moveMapPreview(s,'up');assert.equal(s.armed,-1);assert.equal(selectMapPreview(s,6),false);
});
test('fixtures include identical content with different signatures and long names',()=>{
 assert.equal(PREVIEW_MAPS[4].seed,PREVIEW_MAPS[6].seed);assert.notEqual(PREVIEW_MAPS[4].discoverer,PREVIEW_MAPS[6].discoverer);assert.ok(PREVIEW_MAPS.some(m=>m.name.length>20));
});
test('debug gate starts off and only notifies UI subscribers',()=>{
 assert.equal(isExplorerTestEnabled(),false);const seen=[],dispose=onExplorerTestChanged(v=>seen.push(v));setExplorerTestEnabled(true);setExplorerTestEnabled(false);dispose();assert.deepEqual(seen,[true,false]);
});

const townSource=readFileSync(new URL('../js/town.js',import.meta.url),'utf8');
test('locked entrance preview buttons are skipped and cannot open a preview',()=>{
 const town={entranceIndex:0,mode:'dungeonEntrance',playSe(){},entranceButtons:['enter','circle','return','explorerTent','mapExploration','empty-3'].map((id,i)=>({disabled:i===3||i===4,dataset:{entranceCommand:id}}))};
 const context=vm.createContext({town,isExplorerTestEnabled:()=>false,renderEntranceSelection(){}});
 vm.runInContext(townSource.slice(townSource.indexOf('function handleEntranceInput('),townSource.indexOf('function moveSelection(')),context);
 for(const action of ['down','left','up','right','down']){context.handleEntranceInput(action);assert.ok(!town.entranceButtons[town.entranceIndex].disabled);}
 context.activateEntranceCommand('explorerTent');context.activateEntranceCommand('mapExploration');assert.equal(town.mode,'dungeonEntrance');
});
test('save-facing town state maps preview back to entrance without persisting fixtures',()=>{
 const town={mode:'explorerPreview',registrationRequired:false,firstTownArrivalPending:false};
 const context=vm.createContext({town,currentFacility:()=>({id:'dungeon'})});
 vm.runInContext(townSource.slice(townSource.indexOf('export function getTownState('),townSource.indexOf('export function handleTownInput(')).replace('export ',''),context);
 assert.equal(context.getTownState().mode,'dungeonEntrance');
 assert.deepEqual(Object.keys(context.getTownState()).sort(),['facilityId','firstTownArrivalPending','innKeeperId','mode','registrationRequired']);
 assert.equal(town.mode,'explorerPreview');
});
