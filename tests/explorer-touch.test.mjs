import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeSpecialMaps, SPECIAL_MAP_RULESET, describeTestMap,discoverTestMap} from '../data/special-maps.js';
const fixture=()=>normalizeSpecialMaps({discovererName:'†ルル',registered:Array.from({length:10},(_,i)=>({seed:i*36,rulesetVersion:SPECIAL_MAP_RULESET,discovererName:'†ルル'}))});
const label=i=>{const m=describeTestMap(fixture().registered[i]);return m.name+'Lv.'+m.level;};
import {createExplorerPreviewUI} from '../js/explorer-preview-ui.js';

// Minimal DOM for exercising the real controller's handlers and the document
// touch guard together. A cancelled touch sequence must not synthesize click.
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.text='';this.classes=new Set();this.classList={toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)};}
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
function setup(t,layout='layout-mobile',initial=fixture()){
  const handlers={},hint=new Element(),document={createElement:tag=>new Element(tag),querySelector:()=>hint,querySelectorAll:()=>[],body:{classList:{contains:v=>v===layout}},addEventListener:(type,fn)=>{(handlers[type]??=[]).push(fn);}};
  const previous=globalThis.document;globalThis.document=document;t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const source=readFileSync(new URL('../js/input.js',import.meta.url),'utf8');
  vm.runInNewContext(source.slice(source.indexOf('function configureTouchGuards()'))+'\nconfigureTouchGuards();',{document,Element,Date});
  const host=new Element(),commands=new Element(),background=new Element(),message=new Element();let exits=0;
  commands.className='dungeon-commands';
  let state=initial,saveFails=false;
  const ui=createExplorerPreviewUI({host,commands,background,message,getMaps:()=>state,updateMaps:operation=>{const result=operation(state);if(saveFails)return {ok:false,error:'保存に失敗しました。'};if(result.ok)state=result.state;return result;},playSe(){},onExit(){exits++;}});
  const all=e=>[e,...e.children.flatMap(all)];
  const find=label=>all(host).find(e=>e.tag==='button'&&!e.disabled&&e.textContent===label);
  function touch(target){let cancelled=false;for(const type of ['touchstart','touchend'])for(const fn of handlers[type]||[])fn({target,preventDefault(){cancelled=true;},stopPropagation(){}});if(!cancelled&&!target.disabled)target.onclick?.();return cancelled;}
  return {ui,host,commands,message,find,touch,exits:()=>exits,all,state:()=>state,failSave:()=>{saveFails=true;}};
}
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
 const v=setup(t,'layout-mobile',initial);v.ui.open('maps');v.ui.input('right');v.ui.input('confirm');v.ui.input('confirm');
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

test('clipboard failure retains visible selectable code and reports a manual-copy fallback',async t=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');t.after(()=>Object.defineProperty(globalThis,'navigator',prior));
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:()=>Promise.reject(Error('denied'))}}});
 const v=setup(t);v.ui.open('maps');v.ui.input('confirm');v.ui.input('confirm');v.touch(v.find('共有コードをコピー'));await Promise.resolve();
 assert.match(v.message.textContent,/手動でコピー/);assert.ok(v.all(v.host).some(e=>e.tag==='textarea'&&e.value.startsWith('NDA16:')));
});
