import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
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
function setup(t,layout='layout-mobile'){
  const handlers={},hint=new Element(),document={createElement:tag=>new Element(tag),querySelector:()=>hint,querySelectorAll:()=>[],body:{classList:{contains:v=>v===layout}},addEventListener:(type,fn)=>{(handlers[type]??=[]).push(fn);}};
  const previous=globalThis.document;globalThis.document=document;t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const source=readFileSync(new URL('../js/input.js',import.meta.url),'utf8');
  vm.runInNewContext(source.slice(source.indexOf('function configureTouchGuards()'))+'\nconfigureTouchGuards();',{document,Element,Date});
  const host=new Element(),commands=new Element(),background=new Element(),message=new Element();let exits=0;
  commands.className='dungeon-commands';
  const ui=createExplorerPreviewUI({host,commands,background,message,playSe(){},onExit(){exits++;}});
  const all=e=>[e,...e.children.flatMap(all)];
  const find=label=>all(host).find(e=>e.tag==='button'&&!e.disabled&&e.textContent===label);
  function touch(target){let cancelled=false;for(const type of ['touchstart','touchend'])for(const fn of handlers[type]||[])fn({target,preventDefault(){cancelled=true;},stopPropagation(){}});if(!cancelled&&!target.disabled)target.onclick?.();return cancelled;}
  return {ui,host,commands,message,find,touch,exits:()=>exits,all};
}
for(const layout of ['layout-mobile','layout-tablet'])test(`${layout}: native taps select twice, explicit actions execute once`,t=>{
  const v=setup(t,layout);v.ui.open('maps');
  assert.equal(v.touch(v.find('呪われし奈落の地図Lv.18')),false);
  assert.ok(v.find('仮データ 10 / 10件'),'first tap remains in list');
  assert.equal(v.touch(v.find('呪われし奈落の地図Lv.18')),false);
  assert.ok(v.find('探索する（A）'),'second tap opens detail');
  v.touch(v.find('探索する（A）'));assert.match(v.message.textContent,/状態は変更しません/);
  v.touch(v.find('戻る（B）'));assert.ok(v.find('仮データ 10 / 10件'));
  assert.ok(v.find('呪われし奈落の地図Lv.18').classes.has('is-selected'));
  v.touch(v.find('戻る（B）'));assert.equal(v.exits(),1);
});
test('touch guard still protects the game surface and preserves existing command exemptions',t=>{
  const v=setup(t);assert.equal(v.touch(new Element('button')),true);
  const b=new Element('button');v.commands.append(b);assert.equal(v.touch(b),false);
});
test('keyboard/gamepad action routing retains paging and detail return position',t=>{
  const v=setup(t);v.ui.open('maps');for(const action of ['right','down','down','confirm'])v.ui.input(action);
  assert.ok(v.find('探索する（A）'));v.ui.input('cancel');
  assert.ok(v.find('薄明の地図Lv.8').classes.has('is-selected'));
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
 v.touch(v.find('甲虫の地図Lv.1'));v.touch(v.find('甲虫の地図Lv.1'));
 v.touch(v.find('管理機能を確認（A）'));assert.match(v.message.textContent,/状態は変更しません/);
 v.touch(v.find('戻る（B）'));assert.ok(v.find('仮データ 10 / 10件'));
});
