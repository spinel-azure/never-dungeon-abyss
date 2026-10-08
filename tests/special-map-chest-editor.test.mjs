// DOM-event integration harness: executes the actual local app without launching a browser.
// Layout, browser file pickers and browser download permissions require manual confirmation.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createChestCatalog} from '../data/special-map-chest-catalog.js';
import * as core from '../data/special-map-chest-core.js';
const source=readFileSync(new URL('../tools/special-map-chest-editor/app.js',import.meta.url),'utf8');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.value='';this.textContent='';this.disabled=false;}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(k,v){this[k]=v}
 click(){if(!this.disabled)this.onclick?.()}
}
function app(storage=new Map()){
 const nodes=new Map(),downloads=[];
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element('div'));return nodes.get(id)},createElement:tag=>new Element(tag)};
 const catalog={...createChestCatalog(),fingerprint:'test',sourceRepository:'test working tree',generatedAt:'test'};
 const context={window:{NDAChest:core,NDA_CHEST_CATALOG:catalog},document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},structuredClone,Blob,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test'},revokeObjectURL(){}},setTimeout:fn=>fn()};
 vm.runInNewContext(source,context);
 const node=id=>document.getElementById(id),walk=n=>[n,...n.children.flatMap(walk)];
 const click=(root,label)=>{const b=walk(node(root)).find(n=>n.tag==='button'&&n.textContent===label);assert.ok(b,'button: '+label);b.click()};
 const change=(label,value)=>{const n=[...nodes.values()].flatMap(walk).find(n=>n['aria-label']===label);assert.ok(n,'field: '+label);n.value=String(value);n.onchange()};
 const search=q=>{node('search').value=q;node('search').oninput()};
 return {node,click,change,search,downloads,storage,data:()=>JSON.parse(node('raw').value)};
}
function fill(a){
 a.node('addTable').click();a.search('healing_potion');a.click('results','追加');a.change('重み 1',2);a.change('最大個数 1',3);
 a.click('tabs','強化値表');a.node('addTable').click();a.click('editor','＋ 強化値の行を追加');a.change('重み 1',7);a.click('editor','＋ 強化値の行を追加');a.change('強化値 2',3);
 a.click('tabs','黒箱');a.node('addTable').click();a.search('iron_longsword');a.click('results','追加');
 a.click('tabs','紫箱');a.node('addTable').click();a.search('common_strength_up');a.click('results','追加');
}
test('search, add, edit all colors and enhancement, export/import, restore autosave',async()=>{
 const a=app();fill(a);assert.equal(a.node('export').disabled,false);a.node('export').click();assert.equal(a.downloads.length,1);const text=await a.downloads[0].text();assert.deepEqual(JSON.parse(text),a.data());
 const b=app();await b.node('import').onchange({target:{files:[{text:async()=>text}],value:'test'}});assert.deepEqual(b.data(),a.data());assert.equal(b.node('export').disabled,false);
 const restored=app(b.storage);assert.deepEqual(restored.data(),a.data());restored.node('sim1000').click();assert.match(restored.node('simulation').textContent,/1000回/);
});
test('unknown ID and fields survive draft download, block production, allow undo',async()=>{
 const a=app();fill(a);const valid=a.data(),unknown=structuredClone(valid);unknown.tables[0].entries[0].id='future_unknown';unknown.future={preserve:'この値を保持'};a.node('raw').value=JSON.stringify(unknown);a.node('applyRaw').click();assert.equal(a.node('export').disabled,true);a.node('draft').click();assert.deepEqual(JSON.parse(await a.downloads[0].text()),unknown);a.node('undo').click();assert.deepEqual(a.data(),valid);
});
test('table clone detects overlap, deletion restores validity and invalid JSON leaves document intact',()=>{
 const a=app();fill(a);const before=a.data();a.node('cloneTable').click();assert.equal(a.node('export').disabled,true);a.node('deleteTable').click();assert.deepEqual(a.data(),before);a.node('raw').value='{broken';a.node('applyRaw').click();assert.match(a.node('message').textContent,/読込失敗/);const saved=JSON.parse(a.storage.get('nda.special-map-v2.chest-editor.v1')).document;assert.deepEqual(saved,before);
});
test('overflowing JSON number is rejected instead of silently exported as null',()=>{const a=app();fill(a);const before=a.data();a.node('raw').value='{"schemaVersion":1,"tables":[],"enhancementTables":[],"future":1e400}';a.node('applyRaw').click();assert.match(a.node('message').textContent,/数値が大きすぎ/);assert.deepEqual(JSON.parse(a.storage.get('nda.special-map-v2.chest-editor.v1')).document,before)});
test('overflowing input weight remains an invalid draft value',()=>{const a=app();fill(a);a.change('重み 1','1e400');assert.equal(a.data().tables[2].entries[0].weight,'1e400');assert.equal(a.node('export').disabled,true)});
