import test from 'node:test';
import assert from 'node:assert/strict';
import {getArrowGlintStrength,drawArrowGlintFrame} from '../js/enemy-ambient-effects.js';
import {createBossCombatant} from '../data/bosses.js';
test('arrow glint repeats two bounded pulses and is assigned to Zentaurin',()=>{
 assert.equal(createBossCombatant('zentaurin_b96f').ambientEffect,'arrow-glint');
 for(const time of [0,1.5,2.7])assert.equal(getArrowGlintStrength(time),0);
 for(const time of [.35,.95,3.15])assert.ok(getArrowGlintStrength(time)>.999);
});
test('concealment and reduced motion clear both glint layers',()=>{
 let clears=0;const canvas={width:100,height:100,getContext:()=>({clearRect(){clears++;}})};
 for(const [concealed,reduced] of [[true,false],[false,true]])drawArrowGlintFrame({back:canvas,front:canvas,concealed},.35,reduced);
 assert.equal(clears,4);
});
