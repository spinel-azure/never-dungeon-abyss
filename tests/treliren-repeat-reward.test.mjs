import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrelirenDialogue} from '../js/treliren-dialogue.js';
for(const phase of [5,6])test(`Treliren phase ${phase} grants incense once after the dialogue and survives restart`,async t=>{
 const node=()=>({clientHeight:0,textContent:'',classList:{add(){},remove(){}},replaceChildren(...children){this.children=children;}});
 const previous=globalThis.document;globalThis.document={createElement:node};t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 const run={phase:0,rewardGiven:false,firstEncounter:false};let event,rewards=0,cues=0;
 const message=node(),ui=createTrelirenDialogue({messageEl:message,getRun:()=>run,startOverlay:e=>event=e,getEvent:()=>event,clearOverlay:()=>event=null,save:()=>true,grantReward:()=>{rewards++;run.rewardGiven=true;},playReward:async()=>{cues++;},finish:()=>true,onClose(){},onCancel(){},needsRequest:()=>phase===5,requestCompleted:()=>phase===6});
 ui.start();assert.equal(run.phase,phase);assert.equal(rewards,0);
 ui.handle('confirm');await new Promise(r=>setImmediate(r));assert.equal(rewards,1);assert.equal(cues,1);assert.match(message.children[0].textContent,/魔除けのお香/);
 ui.cleanup();ui.start();assert.equal(rewards,1);assert.equal(cues,1);ui.cleanup();
});
