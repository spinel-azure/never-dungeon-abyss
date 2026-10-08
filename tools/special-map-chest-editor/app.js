/* Local only; no network requests, no game-save keys. */
(()=>{'use strict';
const C=window.NDAChest,cat=window.NDA_CHEST_CATALOG,KEY='nda.special-map-v2.chest-editor.v1';
const $=id=>document.getElementById(id),labels={red:'赤箱',black:'黒箱',purple:'紫箱',enhancement:'強化値表'};
let doc=C.emptyChestDocument(),tab='red',selected=-1,previous=null;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn)=>{const b=el('button',text);b.onclick=fn;return b;};
const isObj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const tables=()=>isObj(doc)&&Array.isArray(doc[tab==='enhancement'?'enhancementTables':'tables'])?doc[tab==='enhancement'?'enhancementTables':'tables']:[];
const current=()=>tables()[selected];
const pct=v=>!Number.isFinite(v)||v<0?'—':v>0&&v*100<.000001?'<0.000001%':(v*100).toLocaleString('ja-JP',{maximumFractionDigits:6})+'%';
function msg(t){$('message').textContent=t;}
function save(){try{localStorage.setItem(KEY,JSON.stringify({document:doc,catalogFingerprint:cat.fingerprint,savedAt:new Date().toISOString()}));$('saveState').textContent='ブラウザ内に自動保存済み';}catch{$('saveState').textContent='自動保存不可：下書きJSONを保存してください';}}
function mutate(fn){previous=structuredClone(doc);fn();$('simulation').textContent='未実行（設定変更後）';save();render();}
function field(value,fn,type='text',label=''){const input=el('input');input.type=type;input.value=value??'';input.setAttribute('aria-label',label);if(type==='number')input.step='any';input.onchange=()=>mutate(()=>fn(type==='number'?(input.value===''?null:Number.isFinite(Number(input.value))?Number(input.value):input.value):input.value));return input;}
function choose(value,options,fn,label){const s=el('select');s.setAttribute('aria-label',label);if(!options.some(o=>o[0]===value))options=[[value??'','未設定・不明：'+(value??'')],...options];for(const [v,t]of options){const o=el('option',t);o.value=v;s.append(o)}s.value=value??'';s.onchange=()=>mutate(()=>fn(s.value));return s;}
function id(prefix,list){let n=1;while(list.some(t=>t?.id===prefix+'_'+n))n++;return prefix+'_'+n;}
function selectFirst(){selected=tables().findIndex(t=>isObj(t)&&(tab==='enhancement'||t.color===tab));}
function render(){
 $('tabs').replaceChildren(...Object.entries(labels).map(([key,name])=>{const b=button(name,()=>{tab=key;selectFirst();render()});if(key===tab)b.className='active';return b}));
 $('tableList').replaceChildren();tables().forEach((t,i)=>{if(!isObj(t)||(tab!=='enhancement'&&t.color!==tab))return;const b=button(t.id+(tab==='enhancement'?'':` · Lv${t.minLevel}〜${t.maxLevel}`),()=>{selected=i;render()});if(i===selected)b.className='active';$('tableList').append(b)});
 const t=current(),enh=tab==='enhancement';$('cloneTable').disabled=$('deleteTable').disabled=!isObj(t);$('searchPanel').hidden=enh||!isObj(t);$('editor').replaceChildren();
 if(!isObj(t))$('editor').append(el('p','テーブルを追加または選択してください。不明な色や不正な構造は下のJSON編集で修正できます。'));
 else{
  $('editor').append(el('h2',labels[tab]+'の設定'));const meta=el('div',undefined,'meta');
  const labeled=(name,node)=>{const l=el('label',name);l.append(node);meta.append(l)};
  labeled('テーブルID',field(t.id,v=>t.id=v,'text','テーブルID'));
  if(!enh){labeled('最小地図Lv',field(t.minLevel,v=>t.minLevel=v,'number','最小地図Lv'));labeled('最大地図Lv',field(t.maxLevel,v=>t.maxLevel=v,'number','最大地図Lv'))} $('editor').append(meta);
  if(!Array.isArray(t.entries))$('editor').append(el('p','entriesが配列ではありません。JSON編集で修正してください。'));
  else{const p=C.probabilities(t.entries);$('editor').append(el('p','合計重み：'+p.sum+' ／ 確率＝各重み ÷ 合計重み（表示のみ丸め）'));
   const wrap=el('div',undefined,'scroll'),table=el('table'),head=el('tr');for(const name of enh?['強化値','重み','計算上の確率','操作']:['候補情報','重み','最小個数','最大個数','強化値表','計算上の確率','操作'])head.append(el('th',name));table.append(head);
   t.entries.forEach((r,i)=>{const row=el('tr'),cell=node=>{const td=el('td');td.append(node);row.append(td)};if(!isObj(r)){cell(el('span','不正な行：'+JSON.stringify(r)));cell(button('行を削除',()=>mutate(()=>t.entries.splice(i,1))));table.append(row);return}
    if(enh)cell(choose(String(r.value),[0,1,2,3].map(v=>[String(v),'＋'+v]),v=>r.value=Number(v),'強化値 '+(i+1)));
    else{const c=cat.candidates.find(c=>c.kind===r.kind&&c.id===r.id),info=el('div',c?.name||'⚠ 未知の候補（保持中）');info.append(el('small',r.kind+' / '+r.id));if(c){info.append(el('small',c.category+' · '+c.rarity+' · '+(c.acquisition||'入手条件は本体参照')));if(c.notices.length)info.append(el('p',c.notices.join('／'),'notice'))}cell(info)}
    cell(field(r.weight,v=>r.weight=v,'number','重み '+(i+1)));
    if(!enh){cell(field(r.minCount,v=>r.minCount=v,'number','最小個数 '+(i+1)));cell(field(r.maxCount,v=>r.maxCount=v,'number','最大個数 '+(i+1)));cell(r.kind==='equipment'?choose(r.enhancementTableId,(Array.isArray(doc.enhancementTables)?doc.enhancementTables:[]).filter(isObj).map(e=>[e.id,e.id]),v=>r.enhancementTableId=v,'強化値表 '+(i+1)):el('span','—'));}
    cell(el('span',pct(p.values[i]),'prob'));cell(button('削除',()=>mutate(()=>t.entries.splice(i,1))));table.append(row);
   });wrap.append(table);$('editor').append(wrap);
   if(enh)$('editor').append(button('＋ 強化値の行を追加',()=>mutate(()=>t.entries.push({value:[0,1,2,3].find(v=>!t.entries.some(r=>r?.value===v))??0,weight:1}))));
  }
 }
 const validation=C.validateChestDocument(doc,cat);$('validity').textContent=validation.ok?'✓ 本番出力可能':validation.errors.length+'件のエラー';$('export').disabled=!validation.ok;
 $('issues').replaceChildren(...[...validation.errors.map(x=>[x,'error']),...validation.warnings.map(x=>[x,'warning'])].map(([x,cls])=>el('div',x.path+'：'+x.message+' → '+x.fix,cls)));
 if(validation.ok&&!validation.warnings.length)$('issues').append(el('p','検証OK。採用内容の承認やゲームへの適用は別途行ってください。'));
 $('raw').value=JSON.stringify(doc,null,2);$('undo').disabled=previous===null;renderSearch();
}
function renderSearch(){const t=current();$('results').replaceChildren();if(tab==='enhancement'||!isObj(t))return;const query=$('search').value.toLocaleLowerCase(),kind=$('kind').value;const found=cat.candidates.filter(c=>(tab!=='purple'||c.kind==='card')&&(!kind||c.kind===kind)&&(c.name+' '+c.id).toLocaleLowerCase().includes(query));$('results').append(el('p',`${found.length}件（先頭80件を表示。名前で絞り込めます）`));for(const c of found.slice(0,80)){const row=el('div',undefined,'result'),info=el('div');info.append(el('strong',c.name),el('p',`${c.kind} / ${c.id} · ${c.category} · ${c.rarity}`));if(c.notices.length)info.append(el('p',c.notices.join('／'),'notice'));const b=button('追加',()=>mutate(()=>{const r={kind:c.kind,id:c.id,weight:1,minCount:1,maxCount:1};if(c.kind==='equipment')r.enhancementTableId=Array.isArray(doc.enhancementTables)?doc.enhancementTables.find(isObj)?.id??'':'';t.entries.push(r)}));b.disabled=!Array.isArray(t.entries);row.append(info,b);$('results').append(row)}}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function load(text){try{const parsed=JSON.parse(text,(key,value)=>{if(typeof value==='number'&&!Number.isFinite(value))throw Error('数値が大きすぎます。有限数へ修正してください');return value});mutate(()=>{doc=parsed;selectFirst()});msg('読み込みました。未知のID・項目も保持しています。検証結果を確認してください。')}catch(e){msg('読込失敗：'+e.message+'。現在の下書きは保持しています。')}}
 $('search').oninput=renderSearch;$('kind').onchange=renderSearch;
 $('addTable').onclick=()=>{if(!isObj(doc)||!Array.isArray(doc.tables)||!Array.isArray(doc.enhancementTables)){msg('先に下書きJSONの構造を修正してください。');return}mutate(()=>{const rows=tables();rows.push(tab==='enhancement'?{id:id('enhancement',rows),entries:[]}:{id:id(tab,rows),color:tab,minLevel:1,maxLevel:100,entries:[]});selected=rows.length-1})};
 $('cloneTable').onclick=()=>mutate(()=>{const rows=tables(),copy=structuredClone(current());copy.id=id(copy.id+'_copy',rows);rows.push(copy);selected=rows.length-1});
 $('deleteTable').onclick=()=>mutate(()=>{tables().splice(selected,1);selectFirst()});
 $('undo').onclick=()=>{if(previous===null)return;const old=doc;doc=previous;previous=old;selectFirst();save();render()};
 $('fresh').onclick=()=>mutate(()=>{doc=C.emptyChestDocument();selectFirst()});
 $('draft').onclick=()=>download('special-map-chests.draft.json',JSON.stringify(doc,null,2));
 $('export').onclick=()=>{try{download('special-map-chests.json',C.exportChestDocument(doc,cat));msg('検証済みJSONを出力しました。ゲームへはまだ適用していません。')}catch(e){msg(e.message);render()}};
 $('import').onchange=async e=>{const file=e.target.files[0];if(file){try{load(await file.text())}catch(err){msg('ファイル読込失敗：'+err.message)}}e.target.value=''};
 $('applyRaw').onclick=()=>load($('raw').value);
 function simulate(n){try{const t=current();if(tab==='enhancement'||!isObj(t))throw Error('箱テーブルを選択してください。');const engine=C.compileChestTables(doc,cat),counts=t.entries.map(()=>0);for(let i=0;i<n;i++)counts[engine.roll({color:t.color,level:t.minLevel}).candidateIndex]++;const p=C.probabilities(t.entries);$('simulation').textContent=counts.map((v,i)=>`${i+1}. ${t.entries[i].id}：計算 ${pct(p.values[i])} ／ 試行 ${v}回 (${pct(v/n)})`).join('\n')}catch(e){$('simulation').textContent='試行できません：'+e.message+'。検証結果を確認してください。'}}
 $('sim100').onclick=()=>simulate(100);$('sim1000').onclick=()=>simulate(1000);
 $('catalogInfo').textContent=`候補 ${cat.candidates.length}件 ／ 更新 ${cat.generatedAt} ／ 元：${cat.sourceRepository} ／ 照合ID ${cat.fingerprint.slice(0,12)}`;
 try{const saved=localStorage.getItem(KEY);if(saved){const data=JSON.parse(saved);doc=data.document;msg('自動保存した下書きを復元しました。'+(data.catalogFingerprint!==cat.fingerprint?'候補一覧が更新されています。検証結果を確認してください。':''));$('saveState').textContent='下書き復元済み'}}catch{msg('自動保存の復元に失敗しました。保存JSONを読み込んでください。')}
 selectFirst();render();
})();
