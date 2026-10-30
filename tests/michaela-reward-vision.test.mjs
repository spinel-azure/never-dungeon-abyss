import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMichaelaRewardVision,MICHAELA_REWARD_IMAGES} from '../js/michaela-reward-vision.js';
test('prepared Michaela vision uses the three supplied images in order',()=>{
 assert.deepEqual(MICHAELA_REWARD_IMAGES.map(p=>p.split('/').at(-1)),['dungeon_event_27.avif','dungeon_event_27b.avif','dungeon_event_27c.avif']);
 for(const p of MICHAELA_REWARD_IMAGES)assert.ok(readFileSync(p).length>0);
});
test('unfinished dialogue cannot start the dormant reward',async()=>{
 const vision=createMichaelaRewardVision({host:null,message:null,playJingle:async()=>{}});
 for(const text of [undefined,'','   '])await assert.rejects(vision.play(text),TypeError);
 assert.equal(vision.isActive(),false);assert.equal(vision.handleInput('confirm'),false);vision.dispose();
});
