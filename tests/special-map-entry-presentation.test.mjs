import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
function setup(){
 const events=[],classes=new Set(),titleClasses=new Set(),strong={textContent:'NEVER DUNGEON : ABYSS'};
 const title={hidden:true,classList:{add:x=>titleClasses.add(x),remove:x=>titleClasses.delete(x)},querySelector:()=>strong};
 const transition={hidden:true,classList:{add:x=>classes.add(x),remove:(...xs)=>xs.forEach(x=>classes.delete(x))},style:{removeProperty(){}},offsetWidth:1};
 const scope={sceneTransition:transition,sceneTransitionTitle:title,document:{body:{classList:{add(){},remove(){}}}},requestAnimationFrame:fn=>fn(),wait:async ms=>events.push({ms,hidden:title.hidden,text:strong.textContent}),passiveNotificationCoordinator:{updateAvailability(){}},sceneTransitionRunning:false};
 const source=main.slice(main.indexOf('  async function runSceneTransition('),main.indexOf('  function wait(milliseconds)'));
 vm.runInNewContext(source+';this.run=runSceneTransition;',scope);
 return {scope,events,title,transition,strong,classes,titleClasses};
}
test('V2 uses existing stairs sequence and scene transition, titles appear only after dark and clean up',async()=>{
 const h=setup(),sounds=[];let entered=0;
 const line=main.match(/runEntryTransition:(onDark=>runSceneTransition\([^\n]+)\),/)[1]+')';
 const context={runSceneTransition:h.scope.run,playSeSequence:(key,count)=>{sounds.push([key,count]);return Promise.resolve();}};
 const entry=vm.runInNewContext('('+line+')',context);
 await entry(()=>{entered++;assert.equal(h.title.hidden,true);assert.equal(h.classes.has('is-black'),true);});
 assert.deepEqual(sounds,[['stairs',3]]);assert.equal(entered,1);
 assert.deepEqual(h.events.map(e=>e.ms),[2700,1000,120,700]);
 assert.equal(h.events[0].hidden,true);assert.equal(h.events[1].hidden,false);assert.equal(h.events[1].text,'MAP DUNGEON');
 assert.ok(h.events.slice(2).every(e=>e.hidden));
 assert.equal(h.title.hidden,true);assert.equal(h.strong.textContent,'NEVER DUNGEON : ABYSS');assert.equal(h.transition.hidden,true);assert.equal(h.scope.sceneTransitionRunning,false);assert.equal(h.titleClasses.size,0);
});
test('ordinary transitions retain prior title and timing; failing V2 transitions still restore DOM and locks',async()=>{
 const h=setup();await h.scope.run({showEnteringTitle:true});assert.deepEqual(h.events.map(e=>e.ms),[2700,120,700]);assert.equal(h.events[0].hidden,false);assert.equal(h.events[0].text,'NEVER DUNGEON : ABYSS');
 await assert.rejects(h.scope.run({enteringMapDungeon:true,onDark(){throw Error('failed');}}));
 assert.equal(h.transition.hidden,true);assert.equal(h.title.hidden,true);assert.equal(h.strong.textContent,'NEVER DUNGEON : ABYSS');assert.equal(h.scope.sceneTransitionRunning,false);assert.equal(h.titleClasses.size,0);
});
