import test from "node:test";
import assert from "node:assert/strict";

test("ending audio waits for decoding, follows the real audio clock, fades and cleans up", async () => {
  const sources = [], listeners = new Map(); let context, release;
  globalThis.document = { hidden:false, body:{classList:{contains:()=>false}}, addEventListener:(key,fn)=>listeners.set(key,fn) };
  globalThis.window = { addEventListener:(key,fn)=>listeners.set(key,fn), AudioContext:class {
    constructor() { context=this; this.currentTime=0; this.state="running"; this.destination={}; }
    createGain() { return { gain:{setValueAtTime(value){this.value=value;}},connect(){},disconnect(){this.disconnected=true;} }; }
    createBufferSource() { const source={connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}}; sources.push(source); return source; }
    async resume() { this.state="running"; }
    decodeAudioData(_buffer, done) { done({duration:96}); }
  } };
  globalThis.fetch = () => new Promise(resolve => { release=()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}); });
  const audio = await import(`../js/audio.js?ending-test=${Date.now()}`);
  audio.configureAudio();
  const clock = audio.createEndingAudioClock();
  const ready = clock.start();
  assert.equal(sources.length,0);
  context.currentTime=42; release();
  assert.equal(await ready,true);
  assert.equal(sources.length,1); assert.equal(sources[0].loop,false);
  assert.equal(clock.elapsed(),0);
  context.currentTime=70; assert.equal(clock.elapsed(),28);
  document.hidden=true; listeners.get("visibilitychange")();
  assert.equal(sources[0].stopped,undefined);
  document.hidden=false; listeners.get("visibilitychange")();
  assert.equal(sources.length,1);
  clock.fade(.5); clock.stop();
  assert.equal(sources[0].stopped,true); assert.equal(sources[0].disconnected,true);
  audio.setBgmOptions({enabled:false});
  const fallback = audio.createEndingAudioClock(); assert.equal(await fallback.start(),false);
  assert.ok(fallback.elapsed()>=0); fallback.stop();
});

test("blocked audio times out and late loading never starts a ghost BGM", async () => {
  let resolveResume, resolveBuffer, starts=0;
  globalThis.document = {hidden:false,body:{classList:{contains:()=>false}},addEventListener(){}};
  globalThis.window = {addEventListener(){}, AudioContext:class {
    constructor(){this.state="suspended";this.currentTime=0;this.destination={};}
    createGain(){return {gain:{setValueAtTime(){}},connect(){},disconnect(){}};}
    createBufferSource(){return {connect(){},disconnect(){},start(){starts++;},stop(){}};}
    resume(){return new Promise(resolve=>{resolveResume=()=>{this.state="running";resolve();};});}
    decodeAudioData(_buffer,done){done({});}
  }};
  globalThis.fetch=()=>new Promise(resolve=>{resolveBuffer=()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});});
  const audio=await import(`../js/audio.js?blocked-ending=${Date.now()}`);
  const clock=audio.createEndingAudioClock({timeoutMs:5});
  assert.equal(await clock.start(),false);
  resolveResume(); resolveBuffer(); await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(starts,0); clock.stop();
  const cancelled=audio.createEndingAudioClock(); const ready=cancelled.start(); cancelled.stop();
  assert.equal(await ready,false); assert.equal(starts,0);
});
