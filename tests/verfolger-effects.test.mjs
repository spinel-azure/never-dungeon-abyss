import test from 'node:test';
import assert from 'node:assert/strict';
import { getRoamingRevealFrame } from '../js/roaming-reveal.js';
import { getBloodDripParticles, ENEMY_AMBIENT_EFFECTS, drawBloodDripFrame } from '../js/enemy-ambient-effects.js';
import { createEnemyCombatant, getEnemyById } from '../data/enemies.js';
test('reveal is continuous from silhouette through blur to the actual image',()=>{
 const start=getRoamingRevealFrame(0),mid=getRoamingRevealFrame(900),end=getRoamingRevealFrame(1800);
 assert.equal(start.opacity,0);assert.equal(start.silhouetteOpacity,1);assert.equal(start.complete,false);
 assert.equal(mid.opacity,.5);assert.equal(mid.blur,9);assert.equal(mid.complete,false);
 assert.equal(end.opacity,1);assert.equal(end.silhouetteOpacity,0);assert.equal(end.complete,true);
 assert.equal(getRoamingRevealFrame(0,1800,true).complete,true);
});
test('blood profile survives combatant creation and particles are bounded and time-based',()=>{
 const e=createEnemyCombatant(getEnemyById('verfolger'));assert.equal(e.ambientEffect,'blood-drip');
 const emitters=ENEMY_AMBIENT_EFFECTS[e.ambientEffect].emitters;
 for(const seconds of [0,.5,2.2,999999]){const ps=getBloodDripParticles(seconds,emitters);assert.equal(ps.length,6);assert.ok(ps.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&p.alpha>=0&&p.alpha<=1));}
 assert.notDeepEqual(getBloodDripParticles(0,emitters),getBloodDripParticles(.5,emitters));assert.deepEqual(getBloodDripParticles(1,emitters,true),[]);
});
test('concealed and reduced-motion blood canvases clear without drawing',()=>{
 let clears=0;const canvas={width:100,height:100,getContext:()=>({clearRect(){clears++;}})};
 for(const [concealed,reduced] of [[true,false],[false,true]])drawBloodDripFrame({back:canvas,front:canvas,concealed},1,reduced);
 assert.equal(clears,4);
});