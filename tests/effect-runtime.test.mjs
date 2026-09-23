import test from 'node:test';
import assert from 'node:assert/strict';
import {EffectEngine,getAnchorOffset} from '../js/effects/effect-engine.js';
import {normalizeEffectDefinition,createEffectPart,EFFECT_PART_TYPES} from '../js/effects/effect-schema.js';
import {EffectAudio} from '../js/effects/effect-audio.js';
import {getBattleEffectTarget,prepareBattleSkillEffect} from '../js/battle-skill-presentation.js';

test('export/import retains target anchoring, image assets and all audio settings',()=>{
 const effect=normalizeEffectDefinition({duration:5000,parts:[{...createEffectPart('cutin'),anchor:'enemy',imageSrc:'images/test.png',imageData:'data:image/png;base64,AAAA'}],audioTracks:[{kind:'bgm',audioData:'data:audio/wav;base64,AAAA',src:'bgm/test.wav',start:230,duration:4000,volume:37,loop:true,fadeIn:123,fadeOut:321}]});
 assert.deepEqual(normalizeEffectDefinition(JSON.parse(JSON.stringify(effect))),effect);
 assert.equal(effect.parts[0].anchor,'enemy');assert.equal(effect.audioTracks[0].volume,37);
});
test('every positional part follows a moving target and old parts remain screen anchored',()=>{
 for(const type of Object.keys(EFFECT_PART_TYPES)){
  const part=normalizeEffectDefinition({parts:[{type,anchor:'enemy'}]}).parts[0];
  const wide=['shake','whiteout','blackout','blizzard','message'].includes(type);
  assert.deepEqual(getAnchorOffset(part,{width:960,height:540},{x:700,y:180}),wide?{x:0,y:0}:{x:220,y:-90});
  assert.deepEqual(getAnchorOffset({...part,anchor:'screen'},{width:960,height:540},{x:700,y:180}),{x:0,y:0});
 }
 assert.equal(normalizeEffectDefinition({parts:[{type:'slash'}]}).parts[0].anchor,'screen');
});
test('target coordinates follow the selected party image including CSS scale and motion',()=>{
 let rect={left:250,top:120,width:60,height:80};
 const image={getBoundingClientRect:()=>rect,closest:()=>null};
 const root={querySelector:s=>s.includes('data-index="2"')?{querySelector:()=>image}:null};
 const canvas={width:960,height:540,getBoundingClientRect:()=>({left:100,top:50,width:480,height:270})};
 assert.deepEqual(getBattleEffectTarget(root,canvas,2),{x:360,y:220});rect.left+=20;
 assert.deepEqual(getBattleEffectTarget(root,canvas,2),{x:400,y:220});
});
test('damage and healing placeholders resolve without losing target or audio data',()=>{
 const source={parts:[{type:'popup',anchor:'enemy',valueSource:'healing',text:'{healing}'}],audioTracks:[{volume:50}]};
 const ready=prepareBattleSkillEffect(source,123,456);assert.equal(ready.parts[0].text,'456');assert.equal(ready.parts[0].anchor,'enemy');assert.equal(source.parts[0].text,'{healing}');assert.deepEqual(ready.audioTracks,source.audioTracks);
});
test('audio offsets, fades, loop and speed use one timeline and pause releases sources',()=>{
 const calls=[],track={enabled:true,start:100,duration:1000,volume:80,loop:true,fadeIn:200,fadeOut:200};
 const context={currentTime:0,destination:{},createBufferSource:()=>({playbackRate:{},connect(){},disconnect(){},start(...a){calls.push(a)},stop(){calls.push('stop')}}),createGain:()=>({connect(){},disconnect(){},gain:{setTargetAtTime(v){calls.push(v)}}})};
 const audio=new EffectAudio({getEffect:()=>({duration:2000}),context});audio.prepared=new Map([[track,{duration:.3}]]);audio.running=true;
 audio.sync(200,1);assert.deepEqual(calls[0],[0,.1]);assert.equal(calls[1],.4);
 audio.sync(400,.25);assert.equal(audio.voices.get(track).source.playbackRate.value,.25);
 audio.sync(1100,1);assert.equal(audio.voices.size,0);audio.pause();assert.equal(audio.running,false);
});
test('stopping while assets prepare settles playback instead of leaving the battle waiting',async()=>{
 const canvas={getContext:()=>({})};const engine=new EffectEngine(canvas);engine.prepare=()=>new Promise(()=>{});
 let result;const playing=engine.play({onComplete:value=>{result=value}});engine.stop(false);
 assert.equal(await playing,false);assert.equal(result,false);
});

test('ice orbit rotation is animated, reversible and backward compatible',()=>{
  assert.equal(normalizeEffectDefinition({parts:[{type:'ice'}]}).parts[0].spinTurns,0);
  for(const turns of [1,-1,.5]){
    const angles=[];
    const ctx=new Proxy({}, {get:(_,key)=>key==='rotate'?angle=>angles.push(angle):()=>{},set:()=>true});
    const engine=new EffectEngine({getContext:()=>ctx});
    const effect=normalizeEffectDefinition({duration:1000,parts:[{type:'ice',start:0,duration:1000,easing:'linear',spinTurns:turns}]});
    assert.equal(normalizeEffectDefinition(JSON.parse(JSON.stringify(effect))).parts[0].spinTurns,turns);
    engine.effect=effect;engine.time=250;engine.renderPart(effect.parts[0]);
    assert.equal(angles[0],turns*Math.PI/2);
    angles.length=0;engine.time=500;engine.renderPart(effect.parts[0]);assert.equal(angles[0],turns*Math.PI);
  }
});

test('editor can preview empty cutin slots while runtime and invalid images remain strict', async()=>{
 const engine=new EffectEngine({getContext:()=>({})});
 engine.effect=normalizeEffectDefinition({parts:[{type:'cutin',fileName:'unassigned'}]});
 await assert.rejects(engine.prepare(), /Missing cutin image/);
 await engine.prepare({allowMissingImages:true});
 engine.effect.parts[0].imageSrc='broken.png';
 engine.imageCache.set('broken.png',{decode:async()=>{throw new Error('decode failed')}});
 await assert.rejects(engine.prepare({allowMissingImages:true}), /decode failed/);
 engine.imageCache.set('broken.png',{decode:async()=>{}});
 await engine.prepare({allowMissingImages:true});
});

test('messages seek deterministically, clear in gaps and preserve multiline text',()=>{
 const seen=[];const ctx=new Proxy({}, {get:()=>()=>{}});
 const engine=new EffectEngine({getContext:()=>ctx},{transparent:true,backdrop:false,onMessage:text=>seen.push(text)});
 engine.load({duration:1000,parts:[{type:'message',start:0,duration:400,text:'ルミナ！\n呼んだ！'},{type:'message',start:200,duration:300,text:'ノクティア！'}]});
 for(const t of [250,600,100])engine.seek(t);
 assert.deepEqual(seen,['ルミナ！\n呼んだ！','ノクティア！',null,'ルミナ！\n呼んだ！']);
});
test('magic circle image survives JSON and draws with its dimensions; new popup defaults to k8x12',async()=>{
 const calls=[];const ctx=new Proxy({}, {get:(_,key)=> (...args)=>{if(key==='drawImage')calls.push(args)}});
 const engine=new EffectEngine({getContext:()=>ctx},{transparent:true,backdrop:false});
 const circle={...createEffectPart('magicCircle'),imageSrc:'circle.png',width:320,height:180,start:0,duration:1000};
 engine.imageCache.set('circle.png',{complete:true,naturalWidth:320,decode:async()=>{}});
 engine.load(JSON.parse(JSON.stringify({duration:1000,parts:[circle]})));await engine.prepare();engine.seek(500);
 assert.deepEqual(calls.at(-1).slice(1),[-160,-90,320,180]);
 assert.equal(createEffectPart('popup').fontFamily,'pixel');
 assert.equal(normalizeEffectDefinition({parts:[{type:'popup',fontFamily:'serif'}]}).parts[0].fontFamily,'serif');
});
