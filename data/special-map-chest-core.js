// Pure, opt-in V2 chest table format. No exploration hooks or inventory writes.
export const SCHEMA_VERSION = 1;
export const COLORS = ['red', 'black', 'purple'];
export const MAX_COUNT = 10000; // Allocation guard, not an inventory ownership cap.
export function emptyChestDocument() { return {schemaVersion:1,tables:[],enhancementTables:[]}; }
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const integer = (x,min,max) => Number.isSafeInteger(x) && x>=min && x<=max;
const validId = x => typeof x==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(x);
export function probabilities(entries) {
  const sum=Array.isArray(entries)?entries.reduce((s,e)=>s+(typeof e?.weight==='number'?e.weight:NaN),0):NaN;
  return {sum,values:Array.isArray(entries)?entries.map(e=>sum>0&&Number.isFinite(sum)?e?.weight/sum:NaN):[]};
}
export function validateChestDocument(doc,catalog) {
  const errors=[],warnings=[];
  const err=(path,message,fix)=>errors.push({path,message,fix});
  const keys=(o,allowed,path)=>{for(const k of Object.keys(o))if(!allowed.includes(k))err(path+'.'+k,'未対応の項目です。値は保持しています。','仕様を確認して下書きJSONで修正してください。');};
  const list=(x,path)=>{if(!Array.isArray(x)){err(path,'配列ではありません。','JSON編集で配列 [] に修正してください。');return []}return x;};
  if(!object(doc)){err('$','JSONの最上位はオブジェクトが必要です。','下書きJSONで構造を修正してください。');return {ok:false,errors,warnings};}
  keys(doc,['schemaVersion','tables','enhancementTables','notes'],'$');
  if(doc.schemaVersion!==SCHEMA_VERSION)err('schemaVersion','未対応のschemaVersionです。','対応版は1です。旧形式を変換せずに番号だけ変更しないでください。');
  if(doc.notes!==undefined&&typeof doc.notes!=='string')err('notes','注記は文字列です。','文字列へ修正してください。');
  const tables=list(doc.tables,'tables'),enh=list(doc.enhancementTables,'enhancementTables');
  const records=new Map((catalog?.candidates||[]).map(c=>[c.kind+':'+c.id,c]));
  if(!catalog||catalog.catalogVersion!==1||!records.size)err('catalog','候補一覧がありません。','本体リポジトリから候補一覧を更新してください。');
  const checkIds=(rows,path)=>{const seen=new Set();rows.forEach((t,i)=>{if(!object(t)){err(`${path}[${i}]`,'表はオブジェクトです。','下書きJSONで修正してください。');return}if(!validId(t.id))err(`${path}[${i}].id`,'テーブルIDが不正です。','英数字・_・-の1〜100文字で指定してください。');if(seen.has(t.id))err(`${path}[${i}].id`,'テーブルIDが重複しています。','別のIDへ変更してください。');seen.add(t.id)});};
  checkIds(tables,'tables');checkIds(enh,'enhancementTables');
  const checkWeights=(rows,path)=>{if(!rows.length)err(path,'空の抽選表です。','候補を1件以上追加してください。');rows.forEach((r,i)=>{if(!object(r)||typeof r.weight!=='number'||!Number.isFinite(r.weight)||r.weight<=0)err(`${path}[${i}].weight`,'重みは0より大きい有限数です。','正の数を入力するか行を削除してください。');});const p=probabilities(rows);if(rows.length&&(!Number.isFinite(p.sum)||p.sum<=0||p.values.some(v=>v===0)))err(path,'合計重みまたは確率を安全に計算できません。','極端な数値を避け、重みを同じ比率で縮小してください。');};
  enh.forEach((t,i)=>{if(!object(t))return;const path=`enhancementTables[${i}]`;keys(t,['id','entries'],path);const rows=list(t.entries,path+'.entries');checkWeights(rows,path+'.entries');const seen=new Set();rows.forEach((r,j)=>{if(!object(r))return;keys(r,['value','weight'],`${path}.entries[${j}]`);if(!integer(r.value,0,3))err(`${path}.entries[${j}].value`,'強化値は整数0〜3です。','本体で有効な＋0〜＋3を選択してください。');if(seen.has(r.value))err(`${path}.entries[${j}].value`,'同じ強化値が重複しています。','同じ強化値の重みを1行へまとめてください。');seen.add(r.value);});});
  tables.forEach((t,i)=>{if(!object(t))return;const path=`tables[${i}]`;keys(t,['id','color','minLevel','maxLevel','entries'],path);if(!COLORS.includes(t.color))err(path+'.color','箱色が不正です。','red / black / purple を指定してください。');if(!integer(t.minLevel,1,100)||!integer(t.maxLevel,1,100)||t.minLevel>t.maxLevel)err(path+'.level','Lv範囲が不正です。','1〜100の整数で、最小≦最大にしてください。');const rows=list(t.entries,path+'.entries');checkWeights(rows,path+'.entries');rows.forEach((r,j)=>{if(!object(r))return;const row=`${path}.entries[${j}]`;keys(r,['kind','id','weight','minCount','maxCount','enhancementTableId'],row);const c=records.get(r.kind+':'+r.id);if(!c)err(row+'.id','存在しないID、または種類が一致しません。','候補一覧を更新するか、検索結果から正しい候補に置き換えてください。');if(!['item','equipment','card'].includes(r.kind))err(row+'.kind','未対応の候補種類です。','item / equipment / card を指定してください。');if(t.color==='purple'&&r.kind!=='card')err(row+'.kind','紫箱はデッキカード用です。','カード候補を選んでください。');if(!integer(r.minCount,1,MAX_COUNT)||!integer(r.maxCount,1,MAX_COUNT)||r.minCount>r.maxCount)err(row+'.count','個数範囲が不正です。',`1〜${MAX_COUNT}の整数で、最小≦最大にしてください。`);
    if(r.kind==='equipment'){const ref=enh.find(e=>e?.id===r.enhancementTableId);if(!ref)err(row+'.enhancementTableId','強化値表の参照が存在しません。','強化値表を追加し、この行で選択してください。');else if(c&&Array.isArray(ref.entries)&&ref.entries.some(e=>!c.allowedEnhancements?.includes(e?.value)))err(row+'.enhancementTableId','この装備で無効な強化値を含みます。','固有・呪い装備には＋0のみの表を指定してください。');if(c?.unique&&(r.minCount!==1||r.maxCount!==1))err(row+'.count','固有装備は重複所持できません。','個数を1〜1にしてください。');}
    else if(r.enhancementTableId!==undefined)err(row+'.enhancementTableId','装備以外に強化値表が指定されています。','この行の参照項目を削除してください。');
    if(c?.notices?.length)warnings.push({path:row,message:c.name+'：'+c.notices.join('／'),fix:'採用可否は未確定です。入手条件を確認してください。'});
    if((t.color==='red'&&r.kind!=='item')||(t.color==='black'&&r.kind!=='equipment'))warnings.push({path:row,message:'箱色の主用途と異なる候補です。',fix:'意図した設定か確認してください（赤・黒の種類制限は未確定）。'});
  });});
  for(const color of COLORS){const gaps=[],overlap=[];for(let lv=1;lv<=100;lv++){const found=tables.filter(t=>object(t)&&t.color===color&&integer(t.minLevel,1,100)&&integer(t.maxLevel,1,100)&&lv>=t.minLevel&&lv<=t.maxLevel);if(!found.length)gaps.push(lv);if(found.length>1)overlap.push(lv)}if(gaps.length)err(color+'.levels','Lv範囲の抜け：'+gaps.join(','),'この色の表でLv1〜100を重複なく覆ってください。');if(overlap.length)err(color+'.levels','Lv範囲の重複：'+overlap.join(','),'該当する表の最小・最大Lvを修正してください。');}
  return {ok:errors.length===0,errors,warnings};
}
export function exportChestDocument(doc,catalog){const result=validateChestDocument(doc,catalog);if(!result.ok)throw Object.assign(new Error('宝箱テーブル検証エラー'),{issues:result.errors});return JSON.stringify(doc,null,2);}
function randomValue(rng){const r=rng();if(typeof r!=='number'||!Number.isFinite(r)||r<0||r>=1)throw Error('RNG must return a finite number in [0,1)');return r;}
function weighted(rows,rng){const total=probabilities(rows).sum,target=randomValue(rng)*total;let acc=0;for(let i=0;i<rows.length;i++){acc+=rows[i].weight;if(target<acc)return i;}return rows.length-1;}
export function compileChestTables(doc,catalog){exportChestDocument(doc,catalog);const saved=structuredClone(doc),records=new Map(catalog.candidates.map(c=>[c.kind+':'+c.id,structuredClone(c)]));return {roll({color,level,rng=Math.random}){if(!COLORS.includes(color)||!integer(level,1,100))throw Error('Invalid color or map level');const table=saved.tables.find(t=>t.color===color&&level>=t.minLevel&&level<=t.maxLevel);const index=weighted(table.entries,rng),r=table.entries[index],amount=r.minCount+Math.floor(randomValue(rng)*(r.maxCount-r.minCount+1)),c=records.get(r.kind+':'+r.id);let drops;
  if(r.kind==='equipment'){const enhancement=saved.enhancementTables.find(t=>t.id===r.enhancementTableId);drops=Array.from({length:amount},()=>({kind:'equipment',equipmentId:r.id,slot:c.slot,enhancement:enhancement.entries[weighted(enhancement.entries,rng)].value}));}
  else drops=[r.kind==='item'?{kind:'item',itemId:r.id,amount}:{kind:'card',cardId:r.id,amount}];
  return {tableId:table.id,candidateIndex:index,kind:r.kind,id:r.id,amount,drops};
}};}
