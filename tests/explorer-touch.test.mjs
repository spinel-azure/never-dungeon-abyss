import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeSpecialMaps, SPECIAL_MAP_RULESET, describeTestMap,discoverTestMap} from '../data/special-maps.js';
const fixture=()=>normalizeSpecialMaps({discovererName:'†ルル',registered:Array.from({length:10},(_,i)=>({seed:i*36,rulesetVersion:SPECIAL_MAP_RULESET,discovererName:'†ルル'}))});
const label=i=>{const m=describeTestMap(fixture().registered[i]);return m.name+'Lv.'+m.level;};
import {createExplorerPreviewUI} from '../js/explorer-preview-ui.js';
import {prepareMapBossReward,confirmMapBossVictory} from '../data/special-map-rewards.js';
import {mapOriginalId,mapContentId} from '../data/special-maps.js';

// Minimal DOM for exercising the real controller's handlers and the document
// touch guard together. A cancelled touch sequence must not synthesize click.
class Element {
  constructor(tag='div'){this.tag=tag;this.style={};this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.text='';this.classes=new Set();this.classList={toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)};}
  set textContent(v){this.text=v;this.children=[];}
  get textContent(){return this.text+this.children.map(c=>c.textContent).join('');}
  setAttribute(k,v){this.attrs[k]=v;}
  append(...children){for(const c of children){c.parent=this;this.children.push(c);}}
  replaceChildren(...children){this.children=[];this.text='';this.append(...children);}
  closest(selector){
    const matches=s=>s==='button'?this.tag==='button':s==='.explorer-preview button'?this.tag==='button'&&this.ancestor('explorer-preview'):s==='.dungeon-commands button'?this.tag==='button'&&this.ancestor('dungeon-commands'):s==='.menu-screen'?this.ancestor('menu-screen'):false;
    return selector.split(',').some(s=>matches(s.trim()))?this:null;
  }
  ancestor(name){for(let e=this;e;e=e.parent)if(e.className?.split(' ').includes(name))return true;return false;}
}
function setup(t,layout='layout-mobile',initial=fixture(),extra={}){
  const handlers={},hint=new Element(),document={createElement:tag=>new Element(tag),querySelector:()=>hint,querySelectorAll:()=>[],body:{classList:{contains:v=>v===layout}},addEventListener:(type,fn)=>{(handlers[type]??=[]).push(fn);}};
  const previous=globalThis.document;globalThis.document=document;t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const source=readFileSync(new URL('../js/input.js',import.meta.url),'utf8');
  vm.runInNewContext(source.slice(source.indexOf('function configureTouchGuards()'))+'\nconfigureTouchGuards();',{document,Element,Date});
  const host=new Element(),commands=new Element(),background=new Element(),message=new Element();let exits=0;
  commands.className='dungeon-commands';
  let state=initial,saveFails=false;
  const ui=createExplorerPreviewUI({host,commands,background,message,getMaps:()=>state,updateMaps:operation=>{const result=operation(state);if(saveFails)return {ok:false,error:'保存に失敗しました。'};if(result.ok)state=result.state;return result;},playSe(){},onExit(){exits++;},...extra});
  const all=e=>[e,...e.children.flatMap(all)];
  const find=label=>all(host).find(e=>e.tag==='button'&&!e.disabled&&e.textContent===label);
  function touch(target){let cancelled=false;for(const type of ['touchstart','touchend'])for(const fn of handlers[type]||[])fn({target,preventDefault(){cancelled=true;},stopPropagation(){}});if(!cancelled&&!target.disabled)target.onclick?.();return cancelled;}
  return {ui,host,commands,background,message,find,touch,exits:()=>exits,all,state:()=>state,failSave:(value=true)=>{saveFails=value;}};
}

test('favorite star stays in list/detail and confirmation retains detail background and content',t=>{
 const initial=normalizeSpecialMaps({discovererName:'QA',registered:[{rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'WHITE',discovererName:'QA',favorite:true}]});
 const v=setup(t,'layout-mobile',initial);v.ui.open('maps');assert.match(v.host.textContent,/Lv\.50 ⭐/);
 v.ui.input('confirm');const bg=v.background.src;assert.match(v.host.textContent,/地図詳細/);
 v.ui.input('confirm');assert.equal(v.background.src,bg);assert.match(v.host.textContent,/地図詳細/);assert.match(v.host.textContent,/Lv\.50 ⭐/);assert.match(v.host.textContent,/この地図を探索しますか/);
 v.ui.input('cancel');assert.doesNotMatch(v.host.textContent,/この地図を探索しますか/);assert.match(v.host.textContent,/探索する/);
});
test('V2 uses existing detail UI and passes its original to the exploration dispatcher',t=>{
 const initial=normalizeSpecialMaps({discovererName:'スピネ',registered:[{rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'GOLD',discovererName:'†ルル'}]});
 let starts=0;const v=setup(t,'layout-mobile',initial,{startExploration({registered,mapKey}){starts++;assert.equal(registered.find(m=>m.id===mapKey).rulesetVersion,'special-map-v2');return {input(){},close(){}};}});
 v.ui.open('maps');v.ui.input('confirm');
 assert.match(v.host.textContent,/Lv\.100/);assert.match(v.host.textContent,/金地図/);assert.doesNotMatch(v.host.textContent,/調査率.*100/);
 v.ui.input('confirm');v.ui.input('confirm');
 assert.equal(starts,1);
});

test('development tent grants once, keeps names hidden before appraisal, and reveals one level plus separate signature',t=>{
 const v=setup(t,'layout-mobile',normalizeSpecialMaps({discovererName:'†ルル'}),{canReceiveTestStarter:()=>true});
 v.ui.open('tent');assert.ok(v.find('テスト用3枚を受け取る（A）'));v.touch(v.find('テスト用3枚を受け取る（A）'));
 assert.equal(v.state().unidentified.length,3);assert.equal(v.state().starterMapsTestGranted,true);
 assert.equal(v.state().starterMapsGranted,undefined);
 const originals=structuredClone(v.state().unidentified);assert.equal(v.commands.children.some(e=>e.textContent==='【開発用】白地図を受け取る'),false);
 v.commands.children[0].onclick();assert.doesNotMatch(v.host.textContent,/の地図 Lv\./);assert.ok(v.find('はじまりの白地図 1'));
 v.ui.input('confirm');for(let i=0;i<3;i++)v.ui.input('confirm');
 const name=describeTestMap(originals[0]).name;assert.ok(v.host.textContent.includes(name));assert.equal((v.host.textContent.match(/Lv\./g)||[]).length,1);
 assert.match(v.host.textContent,/白地図/);assert.match(v.host.textContent,/発見者：†ルル/);assert.equal(v.state().registered[0].seed,originals[0].seed);
 v.ui.close();v.ui.open('tent');assert.equal(v.find('テスト用3枚を受け取る（A）'),undefined);
});

test('starter grant save failure leaves all maps and entitlement untouched',t=>{
 const v=setup(t,'layout-mobile',normalizeSpecialMaps({discovererName:'†ルル'}),{canReceiveTestStarter:()=>true});v.ui.open('tent');v.failSave();v.touch(v.find('テスト用3枚を受け取る（A）'));
 assert.equal(v.state().starterMapsTestGranted,undefined);assert.equal(v.state().unidentified.length,0);assert.match(v.message.textContent,/保存に失敗/);
});

test('without development permission the tent has no starter grant controls',t=>{
 const v=setup(t,'layout-mobile',normalizeSpecialMaps({discovererName:'†ルル'}));v.ui.open('tent');
 assert.equal(v.find('テスト用3枚を受け取る（A）'),undefined);
 assert.equal(v.commands.children.some(e=>e.textContent==='【開発用】白地図を受け取る'),false);
});
for(const total of [0,100,300])test(`V2 detail displays persistent ${total}/300 independently of V1`,t=>{
 const masks=Array.from({length:3},(_,i)=>(i<total/100?'f':'0').repeat(25));
 const initial=normalizeSpecialMaps({discovererName:'スピネ',registered:[{rulesetVersion:'special-map-v2',seed:1,level:50,rarity:'SILVER',discovererName:'A',surveyedMasks:masks}]});
 const v=setup(t,'layout-mobile',initial);v.ui.open('maps');v.ui.input('confirm');
 assert.ok(v.host.textContent.includes(total===300?'調査完了':`調査 ${total} / 300`));
 assert.doesNotMatch(v.host.textContent,/今回の入場中のみ/);
});
for(const layout of ['layout-mobile','layout-tablet'])test(`${layout}: native taps select twice, explicit actions execute once`,t=>{
  const v=setup(t,layout);v.ui.open('maps');
  assert.equal(v.touch(v.find(label(2))),false);
  assert.ok(v.find(label(0)),'first tap remains in list');
  assert.equal(v.touch(v.find(label(2))),false);
  assert.ok(v.host.textContent.includes('挑戦条件：未実装'),'second tap opens detail');

  v.touch(v.find('戻る（B）'));assert.ok(v.find(label(0)));
  assert.ok(v.find(label(2)).classes.has('is-selected'));
  v.touch(v.find('戻る（B）'));assert.equal(v.exits(),1);
});
test('appraisal touch sequence saves only after final confirmation and then opens registered detail',t=>{
 const initial=discoverTestMap(normalizeSpecialMaps({discovererName:'†ルル'}),{seed:()=>123,id:()=>'found'}).state;
 const v=setup(t,'layout-mobile',initial);v.ui.open('tent');v.ui.input('confirm');
 v.touch(v.find('未鑑定の地図 1'));v.touch(v.find('未鑑定の地図 1'));
 for(let i=0;i<2;i++){v.touch(v.find('確認（A）'));assert.equal(v.state().unidentified.length,1);}
 v.touch(v.find('確認（A）'));assert.equal(v.state().registered.length,1);assert.equal(v.state().unidentified.length,0);assert.match(v.message.textContent,/登録しました/);assert.match(v.host.textContent,/発見者：†ルル/);
});
test('duplicate appraisal can be cancelled without consumption even with ten registered maps',t=>{
 const initial=discoverTestMap(fixture(),{seed:()=>0,id:()=>'repeat'}).state;
 const v=setup(t,'layout-mobile',initial);v.ui.open('tent');v.ui.input('confirm');v.ui.input('confirm');assert.match(v.host.textContent,/以前にも発見/);
 v.ui.input('cancel');assert.equal(v.state().unidentified.length,1);
 v.ui.input('confirm');v.ui.input('confirm');assert.equal(v.state().registered.length,10);assert.equal(v.state().unidentified.length,0);
});
test('failed UI appraisal keeps unidentified map and reports failure rather than success',t=>{
 const initial=discoverTestMap(normalizeSpecialMaps({discovererName:'†ルル'}),{seed:()=>123,id:()=>'found'}).state;
 const v=setup(t,'layout-mobile',initial);v.failSave();v.ui.open('tent');
 for(const action of ['confirm','confirm','confirm','confirm','confirm'])v.ui.input(action);
 assert.equal(v.state().unidentified.length,1);assert.equal(v.state().registered.length,0);assert.match(v.message.textContent,/保存に失敗/);assert.ok(v.find('未鑑定の地図 1'));
});
test('touch guard still protects the game surface and preserves existing command exemptions',t=>{
  const v=setup(t);assert.equal(v.touch(new Element('button')),true);
  const b=new Element('button');v.commands.append(b);assert.equal(v.touch(b),false);
});
test('keyboard/gamepad action routing retains paging and detail return position',t=>{
  const v=setup(t);v.ui.open('maps');for(const action of ['right','down','down','confirm'])v.ui.input(action);
  assert.ok(v.host.textContent.includes('挑戦条件：未実装'));v.ui.input('cancel');
  assert.ok(v.find(label(7)).classes.has('is-selected'));
  assert.match(v.host.textContent,/2 \/ 2/);
});

test('exploration confirms registered selection, routes runtime input and disposes on return',t=>{
 let started,disposed=0;const inputs=[];
 const v=setup(t,'layout-mobile',fixture(),{startExploration:options=>{started=options;return {input:a=>{inputs.push(a);if(a==='cancel')options.onExit();return true;},close:()=>disposed++};}});
 v.ui.open('maps');for(const a of ['right','down','down','confirm','confirm'])v.ui.input(a);
 assert.equal(started,undefined);assert.ok(v.find('はい（A／ENTER）'));
 v.ui.input('cancel');v.ui.input('cancel');assert.ok(v.find(label(7)).classes.has('is-selected'));
 for(const a of ['confirm','confirm','confirm'])v.ui.input(a);
 assert.equal(started.registered.length,10);assert.equal(v.host.children[0].hidden,true);
 v.ui.input('up');v.ui.input('cancel');assert.deepEqual(inputs,['up','cancel']);assert.equal(disposed,1);assert.equal(v.exits(),1);
 assert.equal(v.state().registered.length,10);
});
test('appraisal, registration and management actions need only one tap',t=>{
 const v=setup(t);v.ui.open('tent');
 const command=label=>v.commands.children.find(e=>e.textContent===label);
 for(const label of ['地図鑑定','地図登録']){
  v.touch(command(label));assert.ok(v.find('戻る（B）'));
  v.touch(v.find('戻る（B）'));assert.equal(v.commands.hidden,false);
 }
 v.touch(command('地図整理'));
 v.touch(v.find(label(0)));v.touch(v.find(label(0)));
 assert.match(v.host.textContent,/発見者：†ルル/);
 v.touch(v.find('戻る（B）'));assert.ok(v.find(label(0)));
});

test('signature gamepad navigates input, register, back without losing typed signature',t=>{
 const v=setup(t,'layout-desktop',normalizeSpecialMaps());v.ui.open('tent');
 const field=v.all(v.host).find(e=>e.tag==='input');field.value='†ルル';
 v.ui.input('confirm');v.ui.input('down');assert.ok(v.find('署名を登録（A）').classes.has('is-selected'));
 v.ui.input('confirm');assert.equal(v.state().discovererName,'†ルル');assert.equal(v.commands.hidden,false);
});
test('management delete confirmation clamps six maps to first page and save failure retains map',t=>{
 const initial=fixture();initial.registered=initial.registered.slice(0,6);
 const v=setup(t,'layout-mobile',initial);v.ui.open('organize');v.ui.input('right');v.ui.input('confirm');v.ui.input('confirm');
 v.touch(v.find('地図を削除'));v.ui.input('cancel');assert.equal(v.state().registered.length,6);
 v.touch(v.find('地図を削除'));v.touch(v.find('削除する（A）'));assert.equal(v.state().registered.length,5);assert.match(v.host.textContent,/1 \/ 1/);
 v.ui.input('confirm');v.ui.input('confirm');v.touch(v.find('地図を削除'));v.failSave();v.touch(v.find('削除する（A）'));
 assert.equal(v.state().registered.length,5);assert.match(v.message.textContent,/保存に失敗/);
});
test('share display/import uses original discoverer and duplicate keeps ten slots',async t=>{
 const {encodeMapCode}=await import('../data/special-map-code.js');
 const v=setup(t);v.ui.open('tent');v.touch(v.commands.children[1]);
 let field=v.all(v.host).find(e=>e.tag==='textarea');field.value=encodeMapCode(fixture().registered[2]);
 v.touch(v.find('地図を登録（A）'));assert.match(v.message.textContent,/すでに登録/);assert.equal(v.state().registered.length,10);
 v.touch(v.find('管理機能を確認（A）'));v.touch(v.find('共有コードを表示'));
 field=v.all(v.host).find(e=>e.tag==='textarea');assert.equal(field.value,encodeMapCode(fixture().registered[2]));
});

test('V2 shared UI warns about matching content, not the first matching layout',async t=>{
 const {encodeMapCode}=await import('../data/special-map-code.js');
 const map={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'GOLD',discovererName:'†ルル'};
 const initial=normalizeSpecialMaps({discovererName:'スピネ',registered:[{...map,level:1,discovererName:'先頭'},map]});
 const incoming={...map,discovererName:'ALC'},code=encodeMapCode(incoming);
 const v=setup(t,'layout-mobile',initial);v.ui.open('tent');v.touch(v.commands.children[1]);
 v.all(v.host).find(e=>e.tag==='textarea').value=code;v.touch(v.find('地図を登録（A）'));
 assert.match(v.host.textContent,/発見者：†ルル/);assert.doesNotMatch(v.host.textContent,/発見者：先頭/);
 v.ui.input('confirm');assert.equal(v.state().registered.length,3);assert.match(v.host.textContent,/金地図/);
 v.touch(v.find('管理機能を確認（A）'));v.touch(v.find('共有コードを表示'));
 assert.equal(v.all(v.host).find(e=>e.tag==='textarea').value,code);
});

test('clipboard failure retains visible selectable code and reports a manual-copy fallback',async t=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');t.after(()=>Object.defineProperty(globalThis,'navigator',prior));
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:()=>Promise.reject(Error('denied'))}}});
 const v=setup(t);v.ui.open('organize');v.ui.input('confirm');v.ui.input('confirm');v.touch(v.find('共有コードをコピー'));await Promise.resolve();
 assert.match(v.message.textContent,/手動でコピー/);assert.ok(v.all(v.host).some(e=>e.tag==='textarea'&&e.value.startsWith('NDA:')));
});

for(const mode of ['success','denied','unavailable'])test(`paste ${mode}: never auto-registers and keeps manual input usable`,async t=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');t.after(()=>Object.defineProperty(globalThis,'navigator',prior));
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:mode==='unavailable'?{}:{clipboard:{readText:()=>mode==='success'?Promise.resolve('nda:aBc-_123'):Promise.reject(Error('denied'))}}});
 const v=setup(t);v.ui.open('tent');v.touch(v.commands.children[1]);const field=v.all(v.host).find(e=>e.tag==='textarea');field.value='manual';
 v.ui.input('down');assert.ok(v.find('貼り付け').classes.has('is-selected'));v.ui.input('confirm');await Promise.resolve();
 assert.equal(field.value,mode==='success'?'nda:aBc-_123':'manual');assert.equal(v.state().registered.length,10);
 assert.match(v.message.textContent,mode==='success'?/内容を確認/:/長押し/);
 v.ui.input('down');assert.ok(v.find('地図を登録（A）').classes.has('is-selected'));
 assert.equal(field.attrs.autocapitalize,'off');
});
test('late clipboard response cannot replace input on another screen',async t=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');t.after(()=>Object.defineProperty(globalThis,'navigator',prior));let resolve;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{readText:()=>new Promise(r=>resolve=r)}}});
 const v=setup(t);v.ui.open('tent');v.touch(v.commands.children[1]);v.touch(v.find('貼り付け'));v.ui.input('cancel');v.touch(v.commands.children[1]);
 const field=v.all(v.host).find(e=>e.tag==='textarea');field.value='new input';resolve('old clipboard');await Promise.resolve();assert.equal(field.value,'new input');
});

function pendingRewardBook(full=false){
 const map={rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'QA'};
 let state=normalizeSpecialMaps({discovererName:'QA',registered:[map]});
 if(full)state.unidentified=Array.from({length:3},(_,i)=>({...map,seed:i,discoveryId:'owned-'+i}));
 const c={source:'special-map-v2-boss',themeId:'crystal',mapKey:mapOriginalId(map),contentId:mapContentId(map),mapSeed:map.seed,mapLevel:map.level,rarity:map.rarity,expeditionId:crypto.randomUUID(),battleUuid:crypto.randomUUID()};
 state=prepareMapBossReward(state,c,{random:()=>.5}).state;
 return confirmMapBossVictory(state,c).state;
}

test('F4 pending receipt is reachable by keyboard and touch, with no double receipt from a stale button',t=>{
 const v=setup(t,'layout-mobile',pendingRewardBook());v.ui.open('tent');
 assert.match(v.commands.children[4].textContent,/討伐報酬受領/);const stale=v.commands.children[4];
 v.ui.input('right');v.ui.input('down');v.ui.input('confirm');
 assert.equal(v.state().unidentified.length,1);assert.equal(v.state().bossReward.status,'received');
 assert.equal(v.commands.children[4].disabled,true);v.touch(stale);assert.equal(v.state().unidentified.length,1);
});

test('F4 tent full inventory and save failure retain exact pending reward, count and visible action',t=>{
 const full=setup(t,'layout-mobile',pendingRewardBook(true));full.ui.open('tent');const before=structuredClone(full.state());
 full.touch(full.commands.children[4]);assert.deepEqual(full.state(),before);assert.match(full.message.textContent,/先に鑑定/);assert.equal(full.commands.children[4].disabled,false);
 const failed=setup(t,'layout-mobile',pendingRewardBook());failed.ui.open('tent');failed.failSave();
 failed.touch(failed.commands.children[4]);assert.equal(failed.state().unidentified.length,0);assert.equal(failed.state().bossReward.status,'pending');assert.match(failed.message.textContent,/保存に失敗/);
});

test('F4 successful receipt presents only after commit, locks input, and never replays a stale reward',async t=>{
 let release,calls=0,signal;const v=setup(t,'layout-mobile',pendingRewardBook(),{showMapRewardAcquisition:options=>{
  calls++;signal=options.signal;assert.equal(v.state().bossReward.status,'received');return new Promise(r=>release=r);
 }});v.ui.open('tent');const stale=v.commands.children[4];v.touch(stale);
 await Promise.resolve();assert.equal(calls,1);assert.equal(signal.aborted,false);
 v.touch(stale);v.ui.input('cancel');v.touch(v.commands.children[5]);assert.equal(v.exits(),0);assert.equal(v.state().unidentified.length,1);
 release();await new Promise(r=>setImmediate(r));v.ui.input('cancel');assert.equal(v.exits(),1);assert.equal(calls,1);
});
test('F4 no receipt animation on full/save failure; closing aborts pending presentation',async t=>{
 for(const full of [true,false]){let calls=0;const v=setup(t,'layout-mobile',pendingRewardBook(full),{showMapRewardAcquisition:()=>calls++});v.ui.open('tent');if(!full)v.failSave();v.touch(v.commands.children[4]);await Promise.resolve();assert.equal(calls,0);}
 let signal;const v=setup(t,'layout-mobile',pendingRewardBook(),{showMapRewardAcquisition:o=>{signal=o.signal;return Promise.resolve();}});v.ui.open('tent');v.touch(v.commands.children[4]);await Promise.resolve();v.ui.close();assert.equal(signal.aborted,true);
});

test('tent has fixed six commands and skips disabled report and reward actions',t=>{
 const v=setup(t,'layout-mobile',fixture());v.ui.open('tent');
 assert.deepEqual(v.commands.children.map(b=>b.textContent),['地図鑑定','地図登録','地図整理','調査報告','討伐報酬受領','戻る']);
 assert.equal(v.commands.children[3].disabled,true);assert.equal(v.commands.children[4].disabled,true);
 v.ui.input('down');v.ui.input('confirm');assert.equal(v.exits(),1);
});

test('formal introduction resumes explanation after receipt without regranting and directs first appraisal',async t=>{
 let cues=0;const v=setup(t,'layout-mobile',normalizeSpecialMaps({discovererName:'QA'}),{useBetaIntroduction:()=>true,showMapRewardAcquisition:async o=>{assert.equal(o.starter,true);cues++;}});
 v.message.clientHeight=0;v.ui.open('tent');assert.match(v.message.textContent,/テントへようこそ/);v.ui.input('confirm');await new Promise(r=>setImmediate(r));
 assert.equal(v.state().unidentified.length,3);assert.equal(cues,1);assert.match(v.message.textContent,/地図探索β/);
 v.ui.input('confirm');v.ui.close();v.ui.open('tent');assert.match(v.message.textContent,/地図探索β/);assert.equal(cues,1);
 for(let i=0;i<6;i++)v.ui.input('confirm');assert.equal(v.state().betaExplanationComplete,true);assert.ok(v.find('はじまりの白地図 1'));
 v.ui.input('confirm');for(let i=0;i<3;i++)v.ui.input('confirm');assert.equal(v.state().betaExplorationUnlocked,true);
});
test('formal introduction keeps full inventory and entitlement intact while offering appraisal',t=>{
 const v=setup(t,'layout-mobile',pendingRewardBook(true),{useBetaIntroduction:()=>true});v.ui.open('tent');
 assert.equal(v.commands.children[0].textContent,'既存の地図を鑑定する');assert.equal(v.state().starterMapsGranted,undefined);v.touch(v.commands.children[0]);assert.match(v.host.textContent,/地図鑑定/);
});

test('failed formal preparation retries the same draw and only celebrates after successful delivery',async t=>{
 let draws=0,cues=0;t.mock.method(Math,'random',()=>{draws++;return .25;});
 const v=setup(t,'layout-mobile',normalizeSpecialMaps({discovererName:'QA'}),{useBetaIntroduction:()=>true,showMapRewardAcquisition:async()=>cues++});v.message.clientHeight=0;v.failSave();v.ui.open('tent');
 v.ui.input('confirm');assert.equal(draws,6);assert.equal(v.state().unidentified.length,0);assert.equal(cues,0);
 v.ui.input('confirm');assert.equal(draws,6);v.failSave(false);v.ui.input('confirm');await new Promise(r=>setImmediate(r));
 assert.equal(draws,6);assert.equal(v.state().unidentified.length,3);assert.equal(cues,1);
});

test('tent keyboard and gamepad actions play one cursor, confirm or cancel cue',t=>{
 const cues=[],v=setup(t,'layout-mobile',fixture(),{playSe:key=>cues.push(key)});v.ui.open('tent');
 v.ui.input('right');assert.deepEqual(cues.splice(0),['cursorMove']);
 v.ui.input('left');v.ui.input('confirm');assert.deepEqual(cues.splice(0),['cursorMove','confirm']);
 v.ui.input('cancel');assert.deepEqual(cues.splice(0),['cancel']);
 v.ui.input('down');v.ui.input('confirm');assert.deepEqual(cues.splice(0),['cursorMove','cancel']);assert.equal(v.exits(),1);
});
test('map touch selection, activation, paging and back have distinct single cues',t=>{
 const cues=[],v=setup(t,'layout-mobile',fixture(),{playSe:key=>cues.push(key)});v.ui.open('maps');
 v.touch(v.find(label(2)));assert.deepEqual(cues.splice(0),['cursorMove']);
 v.touch(v.find(label(2)));assert.deepEqual(cues.splice(0),['confirm']);
 v.touch(v.find('戻る（B）'));assert.deepEqual(cues.splice(0),['cancel']);
 v.touch(v.find('▶'));assert.deepEqual(cues.splice(0),['cursorMove']);
 v.ui.input('confirm');assert.deepEqual(cues.splice(0),['confirm']);
 v.ui.input('cancel');assert.deepEqual(cues.splice(0),['cancel']);
});
test('form action routed through its button does not double-play and disabled tent actions stay silent',t=>{
 const cues=[],v=setup(t,'layout-mobile',fixture(),{playSe:key=>cues.push(key)});v.ui.open('tent');
 v.commands.children[3].onclick();v.commands.children[4].onclick();assert.deepEqual(cues,[]);
 v.ui.input('right');v.ui.input('confirm');cues.length=0;
 v.ui.input('right');v.ui.input('confirm');assert.deepEqual(cues.splice(0),['cursorMove','confirm']);
 v.ui.input('cancel');assert.deepEqual(cues.splice(0),['cancel']);
 v.touch(v.commands.children[5]);assert.deepEqual(cues.splice(0),['cancel']);
});

test('100 registered maps survive reload and sort cycles preserve identity and saved order',t=>{
 const initial=normalizeSpecialMaps({discovererName:'QA',registered:Array.from({length:100},(_,i)=>({rulesetVersion:'special-map-v2',seed:i,level:100-i,rarity:'WHITE',discovererName:'QA',favorite:i===99}))});
 assert.equal(normalizeSpecialMaps(JSON.parse(JSON.stringify(initial))).registered.length,100);
 const before=JSON.stringify(initial);const v=setup(t,'layout-mobile',initial);v.ui.open('maps');assert.match(v.message.textContent,/100 \/ 100/);assert.match(v.host.textContent,/1 \/ 20/);
 v.touch(v.find('ソート：登録順'));assert.ok(v.find('ソート：お気に入り'));v.ui.input('confirm');assert.match(v.host.textContent,/Lv\.1 ⭐/);v.ui.input('cancel');
 v.touch(v.find('ソート：お気に入り'));assert.ok(v.find('ソート：Lv低い順'));v.ui.input('confirm');assert.match(v.host.textContent,/Lv\.1 ⭐/);v.ui.input('cancel');
 v.touch(v.find('ソート：Lv低い順'));assert.ok(v.find('ソート：Lv高い順'));v.ui.input('confirm');assert.match(v.host.textContent,/Lv\.100/);v.ui.input('cancel');
 v.touch(v.find('ソート：Lv高い順'));assert.ok(v.find('ソート：テーマ'));v.touch(v.find('ソート：テーマ'));assert.ok(v.find('ソート：お気に入り'));
 assert.equal(JSON.stringify(v.state()),before);
 for(let i=0;i<19;i++)v.ui.input('right');assert.match(v.host.textContent,/20 \/ 20/);v.ui.input('confirm');assert.match(v.host.textContent,/地図詳細/);
});

for(const kind of ['maps','organize'])test(`${kind}: page edges reach sort and confirm cycles without leaving sort`,t=>{
 const cues=[],v=setup(t,'layout-mobile',fixture(),{playSe:key=>cues.push(key)});v.ui.open(kind);
 const selected=()=>v.all(v.host).filter(e=>e.tag==='button'&&e.classes.has('is-selected'));
 for(let i=0;i<5;i++)v.ui.input('down');
 assert.deepEqual(selected().map(e=>e.textContent),['ソート：登録順']);
 assert.match(v.host.textContent,/1 \/ 2/);
 cues.length=0;
 for(const name of ['お気に入り','Lv低い順','Lv高い順','テーマ','お気に入り']){
  v.ui.input('confirm');assert.deepEqual(selected().map(e=>e.textContent),['ソート：'+name]);
 }
 assert.deepEqual(cues,Array(5).fill('confirm'));
 v.ui.input('down');assert.equal(selected().length,1);assert.ok(!selected()[0].textContent.startsWith('ソート'));
 v.ui.input('up');assert.ok(selected()[0].textContent.startsWith('ソート'));
 v.ui.input('up');assert.equal(selected()[0],v.find(label(4)));
 v.ui.input('down');v.ui.input('right');assert.equal(selected()[0],v.find(label(5)));
 v.ui.input('up');v.touch(v.find(label(6)));assert.equal(selected()[0],v.find(label(6)));
 v.ui.input('confirm');assert.match(v.host.textContent,/地図詳細/);
 v.ui.input('cancel');assert.equal(selected()[0],v.find(label(6)));
});

test('sort navigation handles a partial final page and empty book',t=>{
 const initial=fixture();initial.registered=initial.registered.slice(0,6);
 const v=setup(t,'layout-mobile',initial);v.ui.open('maps');v.ui.input('right');v.ui.input('down');
 assert.ok(v.find('ソート：登録順').classes.has('is-selected'));
 v.ui.input('up');assert.ok(v.find(label(5)).classes.has('is-selected'));
 v.ui.close();initial.registered=[];
 const empty=setup(t,'layout-mobile',initial);empty.ui.open('maps');empty.ui.input('up');empty.ui.input('confirm');
 assert.ok(empty.find('ソート：お気に入り').classes.has('is-selected'));
 empty.ui.input('cancel');assert.equal(empty.exits(),1);
});

for(const [rarity,color] of [['WHITE','#ffffff'],['SILVER','#dce6f2'],['GOLD','#ffd966']])test(`${rarity} map name color persists in selected list and details`,t=>{
 const initial=normalizeSpecialMaps({discovererName:'QA',registered:[{rulesetVersion:'special-map-v2',seed:1,level:20,rarity,discovererName:'QA'}]});
 const v=setup(t,'layout-mobile',initial);v.ui.open('maps');
 const name=v.all(v.host).find(e=>e.className?.includes('explorer-map-name'));assert.equal(name.style.color,color);
 v.ui.input('confirm');assert.equal(v.all(v.host).find(e=>e.tag==='h3').style.color,color);
 assert.equal(v.state().registered[0].rarity,rarity);
});

test('formal welcome precedes receipt and signature, and reload retains the exact three maps',async t=>{
 const v=setup(t,'layout-mobile',normalizeSpecialMaps({}),{useBetaIntroduction:()=>true,showMapRewardAcquisition:async()=>{}});
 v.message.clientHeight=0;v.ui.open('tent');assert.match(v.message.textContent,/テントへようこそ/);
 v.ui.input('confirm');await new Promise(r=>setImmediate(r));assert.equal(v.state().unidentified.length,3);assert.match(v.host.textContent,/地図署名/);
 const ids=v.state().unidentified.map(m=>[m.discoveryId,m.seed,m.level]);v.ui.close();v.ui.open('tent');assert.match(v.host.textContent,/地図署名/);
 const field=v.all(v.host).find(e=>e.tag==='input');field.value='銀虫';v.touch(v.find('署名を登録（A）'));
 assert.equal(v.state().discovererName,'銀虫');assert.ok(v.state().unidentified.every(m=>m.discovererName==='銀虫'));
 assert.deepEqual(v.state().unidentified.map(m=>[m.discoveryId,m.seed,m.level]),ids);assert.match(v.message.textContent,/地図探索β/);
});
