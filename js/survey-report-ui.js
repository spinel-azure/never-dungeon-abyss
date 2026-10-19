import {renderItemGetItems} from './item-get-presentation.js';
import {SURVEY_PRIZES,reportableMaps,surveyExchangeReason,surveyPrizeDetails} from '../data/survey-report.js';
import {describeTestMap,normalizeSpecialMaps} from '../data/special-maps.js';
import {hasKeyItem} from '../data/key-items.js';
import {mapNameColor} from './special-map/name-color.js';
import {sortRegisteredMaps} from '../data/special-map-sort.js';
import {paginateMessageToFit} from './message-pagination.js';
export function createSurveyReportUI({host,commands,message,getCharacter,transact,playSe,playJingle=async key=>playSe(key),finishTyping=()=>false,onBack}){
 const panel=document.createElement('section');panel.className='transfer-destination-overlay explorer-preview';panel.hidden=true;host.append(panel);
 const overlay=document.createElement('div');overlay.className='survey-reward-overlay';overlay.hidden=true;host.append(overlay);
 const sortByKind={reports:-1,exchange:0};let listIndex=0;
 let active=false,mode='home',index=0,page=0,sort=-1,sortFocus=false,selected=null,locked=false,epoch=0,pages=[],pageIndex=0,nextTalk=null,background='';
 const state=()=>normalizeSpecialMaps(getCharacter()?.specialMaps);
 const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function button(text,action,chosen=false,disabled=false){const b=make('button'),label=make('span',text);label.className='explorer-button-label';b.append(label);b.type='button';b.disabled=disabled;b.classList.toggle('is-selected',chosen);b.onclick=()=>{if(locked||disabled)return;if(finishTyping())return;playSe(text.startsWith('戻る')?'cancel':'confirm');action();};return b;}
 function say(text){message.textContent='トレリーレン「'+text+'」';}
 function talk(text,done){mode='talk';pages=paginateMessageToFit({element:message,text:'トレリーレン「'+text+'」',formatPage:t=>t+'\n＊Aボタンで次へ'});pageIndex=0;nextTalk=done;render();}
 function advance(){if(++pageIndex<pages.length)render();else nextTalk();}
 function commit(action,id){const r=transact(action,id);if(!r?.ok){playSe('blocked');message.textContent=r?.error||'保存できませんでした。';return false;}return true;}
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 async function present(kind){
  locked=true;const token=epoch;overlay.replaceChildren();overlay.hidden=false;
  const title=make('div',kind==='book'?'「スタンプ帳」を手に入れた！':'報告完了');title.className='survey-reward-title';
  const image=make('img');image.src=kind==='book'?'images/item-compendium/stamp_book.avif':'images/screenshots/erledigt_stamp.avif';image.alt=kind==='book'?'スタンプ帳':'Erledigt';image.className=kind==='book'?'survey-book':'survey-stamp';
  if(kind==='book'){
   const effect=make('div');effect.className='card-get-effect item-get-effect is-active';
   const heading=make('strong','ITEM GET!!');heading.className='card-get-title';
   const items=make('span');items.className='item-get-items';
   renderItemGetItems(items,['スタンプ帳'],{itemIds:['stamp_book'],acquisitionMessage:true});
   effect.append(heading,items);overlay.append(effect);
   await Promise.all([playJingle('importantItem'),delay(3200)]);if(token!==epoch)return;await playJingle('battleVictory');
  }
  else{overlay.append(title);await playJingle('battleVictory');if(token!==epoch)return;overlay.append(image,make('p',`＋1p　所持 ${state().stampPoints}p`));playSe('surveyStamp');await delay(2000);}
  if(token!==epoch)return;overlay.classList.add('is-fading');await delay(350);if(token!==epoch)return;
  overlay.hidden=true;overlay.classList.remove('is-fading');locked=false;return true;
 }
 function introduction(){
  const explain=()=>talk('調査の終わった地図をあたしに見せてくれればその都度、今渡したスタンプ帳にスタンプを押してあげる。\nスタンプ1つにつき、スタンプポイントが1ポイント貯まるよ。',()=>talk('貯まったポイントでいろいろなものと交換出来るよ！',()=>{if(commit('intro'))home();else{pageIndex=pages.length-1;}}));
  if(hasKeyItem(getCharacter()?.keyItems,'stamp_book')){explain();return;}
  talk('あなたが調べてくれた地図をあたしに報告して欲しいの。まずはこれを渡しておくね！',async()=>{if(!commit('book')){pageIndex=pages.length-1;return;}if(await present('book'))explain();});
 }
 function home(){mode='home';index=0;render();const greeting=background.endsWith('01f.avif')?'おはよう':background.endsWith('01c.avif')?'こんばんは':'こんにちは';say(greeting+'！調査した地図を報告してくれるの？それとも何か交換する？');}
 function list(kind,resume=false){mode=kind;sort=sortByKind[kind];index=resume?listIndex:0;page=Math.floor(index/5);sortFocus=false;render();}
 function rows(){if(mode==='reports')return sortRegisteredMaps(reportableMaps(getCharacter()),sort);
 const list=[...SURVEY_PRIZES];return sort===0?list.sort((a,b)=>a.category-b.category):sort===1?list.sort((a,b)=>a.cost-b.cost):sort===2?list.sort((a,b)=>b.cost-a.cost):list;}
 function cycleSort(){sort=(sort+1)%(mode==='reports'?4:3);sortByKind[mode]=sort;index=page=0;render();}
 function select(row){listIndex=index;selected=row;mode=mode==='reports'?'reportConfirm':'exchangeConfirm';index=0;render();}
 async function confirm(){
  if(mode==='reportConfirm'){
   if(!commit('report',selected.id))return;
   talk('…わぁ！隅々までじっくり調査してくれたのね。どうもありがとう！',async()=>{if(await present('report')){list('reports');say('他にも報告してくれる地図はあるのかな？');}});
  }else if(mode==='exchangeConfirm'){
   if(surveyExchangeReason(getCharacter(),selected)==='ポイント不足'){
    playSe('blocked');talk('ごめんね。ポイントが足りないみたい。他の物を選んでくれる？',()=>list('exchange',true));return;
   }
   if(!commit('exchange',selected.id))return;
   locked=true;const token=epoch;say('はい、どうぞ！');await playJingle('battleVictory');if(token!==epoch)return;locked=false;list('exchange',true);say('はい、どうぞ！');
  }
 }
 function back(){
  if(mode==='talk'){close();onBack();return;}
  if(mode==='home'){close();onBack();return;}
  if(mode==='reportConfirm'){list('reports',true);return;}
  if(mode==='exchangeConfirm'){list('exchange',true);say('考え直すのね？わかったわ。');return;}
  if(mode==='exchange'){talk('ポイントが貯まったらいつでも来てね！',home);return;}home();
 }
 function render(){
  panel.replaceChildren();commands.replaceChildren();panel.hidden=['home','talk'].includes(mode);commands.hidden=!panel.hidden;
  if(mode==='talk'){commands.append(button('次へ（A）',advance,true),button('報告',()=>{},false,true),button('交換',()=>{},false,true),make('span'),make('span'),button('戻る（B）',back));message.textContent=pages[pageIndex]+'\n＊Aボタンで次へ';return;}
  if(mode==='home'){commands.append(button('報告',()=>list('reports'),index===0),button('交換',()=>list('exchange'),index===1),button('戻る',back,index===2),make('span'),make('span'),make('span'));return;}
  const heading=make('header');heading.className='survey-heading';heading.append(make('h2',mode.startsWith('report')?'調査報告':'スタンプ交換'),make('span',`所持 ${state().stampPoints}p`));panel.append(heading);
  if(mode.endsWith('Confirm')){
   if(mode==='exchangeConfirm'){
    const detail=make('div');detail.className='explorer-detail survey-exchange-detail';
    const info=surveyPrizeDetails(selected),top=make('div');top.className='survey-prize-top';
    const name=make('h3',selected.name);if(selected.once)name.style.color='#ff9d2e';top.append(name);
    if(info.image){const image=make('img');image.src=info.image;image.alt=selected.name;image.onerror=()=>image.remove();top.append(image);}
    detail.append(top,make('p',`【${info.category}】${info.description}`),make('p',`必要 ${selected.cost}p ／ 所持 ${state().stampPoints}p`));
    if(info.effect)detail.append(make('p',info.effect));
    const reason=surveyExchangeReason(getCharacter(),selected);if(reason)detail.append(make('p',reason));panel.append(detail);
   }else panel.append(make('h3',selected.name||describeTestMap(selected)?.name));
   panel.append(button('はい（A）',confirm,index===0),button('いいえ（B）',back,index===1));say(mode==='reportConfirm'?'この地図を報告してくれるの？':'交換するのはこれでいい？');return;
  }
  const items=rows();index=Math.max(0,Math.min(index,items.length-1));page=Math.floor(index/5);
  const listEl=make('div');listEl.className='transfer-destination-list';
  if(!items.length)listEl.append(make('p','報告できる地図はありません。'));
  items.slice(page*5,page*5+5).forEach((row,n)=>{const i=page*5+n,reason=mode==='exchange'?surveyExchangeReason(getCharacter(),row):'';
   const label=mode==='reports'?describeTestMap(row)?.name:`${row.name}　${row.cost}p${reason?'（'+reason+'）':''}`;
   const b=button(label,()=>{index=i;select(row);},!sortFocus&&index===i);b.classList.toggle('is-unavailable',Boolean(reason));b.children[0].className='explorer-map-name';if(mode==='reports'){b.style.color=mapNameColor(row.rarity);const check=make('span','☑');check.className='explorer-map-complete';b.append(check);}if(row.once&&!reason)b.style.color='#ff9d2e';listEl.append(b);
  });panel.append(listEl);
  const pager=make('div');pager.className='transfer-destination-pager';pager.append(button('◀',()=>turn(-1)),make('strong',`${page+1} / ${Math.max(1,Math.ceil(items.length/5))}`),button('▶',()=>turn(1)));panel.append(pager);
  const footer=make('div');footer.className='explorer-footer';footer.append(button('戻る（B）',back),button('ソート：'+(sort<0?'登録順':mode==='reports'?['お気に入り','Lv低い順','Lv高い順','テーマ'][sort]:['カテゴリ順','ポイント低い順','ポイント高い順'][sort]),cycleSort,sortFocus));panel.append(footer);
  say(mode==='reports'?'報告してくれる地図を選んでね。':'貯まったスタンプポイントを景品と交換できるよ！何と交換する？');
 }
 function turn(delta){const count=Math.max(1,Math.ceil(rows().length/5));page=(page+delta+count)%count;index=page*5;sortFocus=false;render();}
 function input(action){if(!active)return false;if(locked)return true;if(action==='confirm'&&finishTyping())return true;if(action==='cancel'){playSe('cancel');back();return true;}
  if(action==='confirm'){playSe('confirm');if(mode==='talk')advance();else if(mode==='home'){if(index===2)back();else list(index===0?'reports':'exchange');}else if(mode.endsWith('Confirm')){if(index===0)void confirm();else back();}else if(sortFocus)cycleSort();else {const row=rows()[index];if(row)select(row);}return true;}
  if(['up','down','left','right','pageLeft','pageRight'].includes(action)){playSe('cursorMove');if(mode==='talk')return true;if(mode==='home'||mode.endsWith('Confirm')){const count=mode==='home'?3:2;index=(index+(['down','right'].includes(action)?1:count-1))%count;render();}else if(['left','pageLeft','right','pageRight'].includes(action))turn(['left','pageLeft'].includes(action)?-1:1);else{const first=page*5,last=Math.min(first+4,rows().length-1);if(sortFocus){sortFocus=false;index=action==='up'?last:first;}else if((action==='up'&&index===first)||(action==='down'&&index===last))sortFocus=true;else index+=action==='down'?1:-1;render();}}return true;
 }
 function close(){active=false;epoch++;locked=false;overlay.hidden=true;overlay.classList.remove('is-fading');panel.hidden=true;}
 return {open(image){active=true;background=image;epoch++;if(state().surveyIntroductionComplete&&hasKeyItem(getCharacter()?.keyItems,'stamp_book'))home();else introduction();},input,close,isActive:()=>active,isTalking:()=>active&&['home','talk','reportConfirm','exchangeConfirm'].includes(mode)};
}
