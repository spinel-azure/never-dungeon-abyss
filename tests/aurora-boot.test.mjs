import test from 'node:test';import assert from 'node:assert/strict';
import {auroraProgressAt,auroraFrameAt,AURORA_SIZE,AURORA_BAR} from '../js/aurora-boot.js';
test('Aurora progress follows each timed checkpoint and pauses at 95 percent',()=>{
 for(const [ms,p] of [[0,0],[800,.35],[1500,.7],[2300,.9],[2800,.95],[3000,.95],[3300,.95],[3500,1]])assert.equal(auroraProgressAt(ms),p);
 for(const fps of [30,60]){let previous=0;for(let frame=0;frame<=fps*5;frame++){const progress=auroraProgressAt(frame*1000/fps);assert.ok(progress>=previous);previous=progress;}assert.equal(previous,1);}
});
test('Aurora phases use fixed durations and native 16:9 geometry',()=>{
 assert.deepEqual(AURORA_SIZE,{width:960,height:540});assert.ok(AURORA_BAR.x+AURORA_BAR.width<960);
 for(const [ms,phase] of [[0,'blackout'],[299,'blackout'],[300,'initializing'],[3799,'initializing'],[3800,'complete'],[4599,'complete'],[4600,'closing'],[4900,'ended']])assert.equal(auroraFrameAt(ms).phase,phase);
});
