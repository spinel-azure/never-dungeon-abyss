import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../js/town.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('function handleEntranceInput('),source.indexOf('function moveSelection('));
function setup(index=0){
 const calls=[];
 const town={entranceIndex:index,mode:'dungeonEntrance',playSe(){},entranceButtons:['enter','circle','return','empty-1','empty-2','empty-3'].map(id=>({dataset:{entranceCommand:id}}))};
 const context=vm.createContext({town,showGameCommands:()=>calls.push('menu'),showTownArrival:()=>calls.push('town'),renderEntranceSelection(){},renderTransferCircle(){}});
 vm.runInContext(handler,context);
 return {town,calls,action:context.handleEntranceInput};
}
test('entrance cursor reaches all six slots and wraps within rows',()=>{
 const {town,action}=setup();
 for(const [input,index] of [['down',3],['right',4],['right',5],['right',3],['up',0],['left',2]]){action(input);assert.equal(town.entranceIndex,index);}
});
test('B delegates to the game menu without leaving the entrance',()=>{
 const {town,calls,action}=setup(5);assert.equal(action('cancel'),false);assert.deepEqual(calls,['menu']);assert.equal(town.mode,'dungeonEntrance');assert.equal(town.entranceIndex,5);
});
test('blank slots do nothing on confirm; explicit return still returns to town',()=>{
 for(const index of [3,4,5]){const {action,calls}=setup(index);action('confirm');assert.deepEqual(calls,[]);}
 const {action,calls}=setup(2);action('confirm');assert.deepEqual(calls,['town']);
});
