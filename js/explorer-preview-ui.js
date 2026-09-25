import {getTentBackground} from './explorer-preview.js';
import {normalizeSpecialMaps, describeTestMap, setMapSignature, inspectAppraisal, appraiseMap, registerSharedMap, deleteRegisteredMap, toggleMapFavorite} from '../data/special-maps.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';

export function createExplorerPreviewUI({host, commands, background, message, playSe, onExit, getMaps=()=>null, updateMaps=()=>({ok:false,error:'保存処理に接続されていません。'})}) {
  const panel=document.createElement('section');
  panel.className='transfer-destination-overlay explorer-preview';panel.hidden=true;
  panel.setAttribute('aria-label','特殊地図');host.append(panel);
  const hint=document.querySelector('#commandHint');
  let active=false,view='tent',origin='maps',opening='tent',previousHint='',tentImage='',cursor=0;
  let index=0,page=0,armed=-1,appraisalIndex=0,appraisalArmed=-1,discoveryId='',step=0,detailId='',input=null;
  const maps=()=>normalizeSpecialMaps(getMaps());
  let formControls=[],formCursor=0,actions=[],actionCursor=0,pendingMap=null,codeDraft='';
  const selectedMap=()=>maps().registered.find(m=>m.id===detailId);
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(label,action,selected=false)=>{const b=make('button');b.type='button';if(label)b.append(make('span',label,'explorer-button-label'));b.classList.toggle('is-selected',selected);b.onclick=()=>{playSe('confirm');action();};return b;};
  const error=text=>{message.textContent=text;};
  const countText=()=>`未鑑定の地図 ${maps().unidentified.length} / 3　登録済み地図 ${maps().registered.length} / 10`;
  function close(){if(active&&hint)hint.textContent=previousHint;active=false;panel.hidden=true;commands.hidden=false;}
  function exit(){close();onExit();}
  function back(){
    if(['manage','share','delete'].includes(view)){view=view==='manage'?'detail':'manage';actionCursor=0;}
    else if(view==='sameContent')view='register';
    else if(view==='signature')view='tent';
    else if(view==='detail'){view=origin;armed=-1;}
    else if(view==='appraisal'||view==='duplicate'){view='appraise';appraisalArmed=-1;}
    else if(['appraise','register','organize'].includes(view))view='tent';
    else {exit();return;}
    render();
  }
  function openDetail(map){detailId=map.id;origin=view;view='detail';actionCursor=0;render();}
  function inspect(){
    const map=maps().unidentified[appraisalIndex];if(!map)return;
    discoveryId=map.discoveryId;
    const result=inspectAppraisal(maps(),discoveryId);
    if(!result.ok){error(result.error);return;}
    step=0;view=result.duplicate?'duplicate':'appraisal';render();
  }
  function complete(){
    const result=updateMaps(state=>appraiseMap(state,discoveryId));
    if(!result.ok){view='appraise';render();error(result.error);return;}
    index=maps().registered.findIndex(m=>m.id===result.map.id);page=Math.floor(index/5);
    origin='organize';detailId=result.map.id;view='detail';render();
    message.textContent=result.duplicate?'登録済みの地図を確認しました。既存の記録はそのままです。':'地図帳へ登録しました！';
  }
  function nextAppraisal(){if(view==='duplicate'||step===2)complete();else{step++;render();}}
  function signature(){
    const result=updateMaps(state=>setMapSignature(state,input.value));
    if(!result.ok){error(result.error);return;}
    view=opening;render();
  }
  function activateTent(){
    if(cursor===3){exit();return;}
    view=['appraise','register','organize'][cursor];
    if(view==='appraise'&&!maps().discovererName){opening='appraise';view='signature';}
    formCursor=0;codeDraft='';appraisalArmed=armed=-1;render();
  }
  function changeView(next){view=next;actionCursor=0;render();}
  function registered(result){
    if(!result.ok){error(result.error);return;}
    detailId=result.map.id;index=maps().registered.findIndex(m=>m.id===detailId);page=Math.floor(index/5);
    origin='organize';changeView('detail');error(result.duplicate?'この地図はすでに登録されています。':'地図帳へ登録しました！');
  }
  function importCode(confirmed=false){
    if(!confirmed){codeDraft=input.value;const decoded=decodeMapCode(codeDraft);if(!decoded.ok){error(decoded.error);return;}pendingMap=decoded.map;}
    const check=registerSharedMap(maps(),pendingMap,{confirmSameContent:confirmed});
    if(check.needsConfirmation){changeView('sameContent');return;}
    if(!check.ok){error(check.error);return;}
    if(check.duplicate){registered(check);return;}
    registered(updateMaps(state=>registerSharedMap(state,pendingMap,{confirmSameContent:confirmed})));
  }
  function removeMap(){
    const result=updateMaps(state=>deleteRegisteredMap(state,detailId));
    if(!result.ok){error(result.error);return;}
    view='organize';armed=-1;render();error('地図を削除しました。');
  }
  function favorite(){const result=updateMaps(state=>toggleMapFavorite(state,detailId));if(!result.ok){error(result.error);return;}render();}
  function copyCode(code){
    // Clipboard invocation stays in the user gesture, before asynchronous work.
    let copied;try{copied=globalThis.navigator?.clipboard?.writeText(code);}catch{copied=null;}
    if(!copied){error('コピーできませんでした。コードを手動でコピーしてください。');return;}
    Promise.resolve(copied).then(()=>{if(active&&view==='share')error('共有コードをコピーしました！');},()=>{if(active&&view==='share')error('コピーできませんでした。コードを手動でコピーしてください。');});
  }
  function actionButtons(items){
    actions=items.map(item=>item[1]);actionCursor=Math.min(actionCursor,items.length-1);
    const footer=make('div',undefined,'explorer-footer');
    items.forEach(([label,action],i)=>footer.append(button(label,action,i===actionCursor)));panel.append(footer);
  }
  function focusForm(){
    formControls.forEach((e,i)=>e.classList.toggle('is-selected',i===formCursor));
    if(formCursor===0)input.focus?.();else{input.blur?.();formControls[formCursor]?.focus?.();}
  }
  function turnPage(delta){
    const count=maps().registered.length,pages=Math.ceil(count/5);if(pages<2)return;
    page=(page+delta+pages)%pages;index=page*5;armed=-1;render();
  }
  function render(){
    if(!active)return;
    actions=[];formControls=[];panel.replaceChildren();panel.hidden=view==='tent';commands.hidden=view!=='tent';
    background.src=view==='maps'||(view==='detail'&&origin==='maps')?'images/background/circle.avif':tentImage;
    background.alt=view==='maps'||(view==='detail'&&origin==='maps')?'地図探索':'探検家テント';
    if(hint)hint.textContent='＊ Bボタンで戻る';
    message.textContent=countText();
    if(view==='tent'){
      commands.dataset.townActive='true';delete commands.dataset.entranceActive;
      commands.setAttribute('aria-label','探検家テント');
      commands.replaceChildren(...['地図鑑定','地図登録','地図整理','戻る','',''].map((label,i)=>{const b=button(label,()=>{cursor=i;activateTent();},i===cursor);b.disabled=!label;return b;}));return;
    }
    panel.append(make('h2',({maps:'MAP EXPLORATION',organize:'地図整理',detail:'地図詳細',signature:'地図署名',appraise:'地図鑑定',appraisal:'地図鑑定',duplicate:'地図鑑定',register:'地図登録',manage:'地図管理',share:'共有コード',delete:'地図削除',sameContent:'地図登録の確認'})[view]));
    if(view==='signature'||view==='register'){
      const isSignature=view==='signature',submitAction=isSignature?signature:()=>importCode();
      const form=make('form',undefined,'explorer-signature');
      form.dataset.gamepadForm='special-map';
      const label=make('label',isSignature?'地図に記録する名前（1～4文字）':'共有コードを入力／貼り付け');
      input=make(isSignature?'input':'textarea');if(isSignature)input.type='text';input.value=isSignature?'':codeDraft;input.autocomplete='off';input.spellcheck=false;
      input.setAttribute('aria-label',isSignature?'地図署名':'共有コード入力');
      input.oninput=()=>{if(!isSignature)codeDraft=input.value;};
      label.append(input);form.append(label);
      const submit=button(isSignature?'署名を登録（A）':'地図を登録（A）',submitAction),cancel=button('戻る（B）',back);
      formControls=[input,submit,cancel];formControls.forEach((e,i)=>{e.classList.toggle('is-selected',i===formCursor);e.onfocus=()=>{formCursor=i;formControls.forEach((c,j)=>c.classList.toggle('is-selected',i===j));};});
      form.append(submit,cancel);form.onsubmit=e=>{e.preventDefault();submitAction();};
      input.onkeydown=e=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();back();}else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitAction();}};
      panel.append(form);
      if(isSignature)message.textContent='トレリーレン「発見した人の名前も地図に残すんだけど……なんて書いておけばいい？」';return;
    }
    if(view==='maps'||view==='organize'){
      const entries=maps().registered;index=Math.max(0,Math.min(index,entries.length-1));page=Math.floor(index/5);
      const list=make('div',undefined,'transfer-destination-list');
      if(!entries.length)list.append(make('p','登録されている地図はありません。'));
      entries.slice(page*5,page*5+5).forEach((map,offset)=>{
        const i=page*5+offset,info=describeTestMap(map)||{name:'未対応の生成ルール',level:'?'};
        const b=button('',()=>{if(armed===i)openDetail(map);else{index=i;armed=i;render();}},i===index);
        b.title=info.name;b.setAttribute('aria-label',`${info.name} Lv.${info.level}`);
        b.append(make('span',info.name,'explorer-map-name'),make('span',`Lv.${info.level}`,'explorer-map-level'));list.append(b);
      });
      const pager=make('div',undefined,'transfer-destination-pager');
      const prev=button('◀',()=>turnPage(-1)),next=button('▶',()=>turnPage(1));
      prev.setAttribute('aria-label','前のページ');next.setAttribute('aria-label','次のページ');prev.disabled=next.disabled=entries.length<=5;
      pager.append(prev,make('strong',`${page+1} / ${Math.max(1,Math.ceil(entries.length/5))}`),next);
      const footer=make('div',undefined,'explorer-footer');footer.append(button('戻る（B）',back));panel.append(list,pager,footer);
      message.textContent=`${countText()}　↑↓：選択　←→：ページ　A：詳細　B：戻る`;return;
    }
    if(view==='appraise'){
      const entries=maps().unidentified;appraisalIndex=Math.max(0,Math.min(appraisalIndex,entries.length-1));
      const list=make('div',undefined,'transfer-destination-list');
      if(!entries.length)list.append(make('p','鑑定できる地図を持っていません。'));
      entries.forEach((map,i)=>list.append(button(`未鑑定の地図 ${i+1}`,()=>{if(appraisalArmed===i)inspect();else{appraisalIndex=i;appraisalArmed=i;render();}},i===appraisalIndex)));
      panel.append(list,button('戻る（B）',back));return;
    }
    if(view==='duplicate'||view==='appraisal'){
      panel.append(make('p',view==='duplicate'?'この地図は以前にも発見しています。今回の未鑑定地図を消費し、登録済みの地図を確認します。':[
        'トレリーレン「ちょっと待ってね……。」','「ここがこうなって……うん……。」','「……分かった！」'
      ][step]));
      const footer=make('div',undefined,'explorer-footer');footer.append(button('確認（A）',nextAppraisal,true),button('戻る（B）',back));panel.append(footer);return;
    }
    if(view==='detail'){
      const map=maps().registered.find(m=>m.id===detailId);if(!map){view=origin;render();return;}
      const info=describeTestMap(map)||{name:'未対応の生成ルール',level:'?'};
      const body=make('div',undefined,'explorer-detail');
      body.append(make('h3',`${info.name} Lv.${info.level}`),make('p',`発見者：${map.discovererName}`),make('p',`踏破状況：${map.cleared?'踏破済み':'未踏破'}`),make('p','挑戦条件：未実装（Phase 2A仮地図）'));
      panel.append(body);actionButtons([['管理機能を確認（A）',()=>changeView('manage')],['戻る（B）',back]]);return;
    }
    if(view==='sameContent'){
      const existing=maps().registered.find(m=>m.rulesetVersion===pendingMap.rulesetVersion&&m.seed===pendingMap.seed);
      panel.append(make('p',`同じ内容の地図がすでに登録されています。発見者：${existing?.discovererName||''}`),make('p','発見者の異なる地図として登録しますか？'));
      actionButtons([['登録する（A）',()=>importCode(true)],['やめる（B）',back]]);return;
    }
    const map=selectedMap();if(!map){view='organize';render();return;}
    const info=describeTestMap(map)||{name:'未対応の生成ルール',level:'?'};
    panel.append(make('p',`${info.name} Lv.${info.level}　発見者：${map.discovererName}`));
    if(view==='manage'){
      actionButtons([['共有コードを表示',()=>changeView('share')],['共有コードをコピー',()=>{changeView('share');try{copyCode(encodeMapCode(map));}catch(e){error(e.message);}}],
        [`お気に入り ${map.favorite?'ON':'OFF'}`,favorite],['地図を削除',()=>{if(map.favorite){error('お気に入り登録を解除してから削除してください。');return;}changeView('delete');}],['戻る（B）',back]]);return;
    }
    if(view==='share'){
      let code;try{code=encodeMapCode(map);}catch(e){panel.append(make('p',e.message));actionButtons([['戻る（B）',back]]);return;}
      const field=make('textarea',undefined,'explorer-share-code');field.readOnly=true;field.value=code;field.setAttribute('aria-label','共有コード');field.dataset.gamepadForm='special-map';
      panel.append(field);actionButtons([['コードをコピー（A）',()=>copyCode(code)],['戻る（B）',back]]);return;
    }
    if(view==='delete'){
      panel.append(make('p','この地図を削除しますか？'),make('p','踏破記録・お気に入り・メモ・探索途中の状態も失われます。再登録には共有コードが必要です。'));
      actionButtons([['削除する（A）',removeMap],['やめる（B）',back]]);
    }
  }
  function inputAction(action){
    if(!active)return false;
    if(action==='cancel'){back();return true;}
    if(view==='signature'||view==='register'){
      if(['up','down','left','right'].includes(action)){formCursor=(formCursor+(['down','right'].includes(action)?1:2))%3;focusForm();}
      else if(action==='confirm'){if(formCursor===0)input.focus?.();else if(formCursor===1){if(view==='signature')signature();else importCode();}else back();}
      return true;
    }
    if(actions.length){
      if(['up','down','left','right'].includes(action)){actionCursor=(actionCursor+(['down','right'].includes(action)?1:actions.length-1))%actions.length;render();}
      else if(action==='confirm')actions[actionCursor]();return true;
    }
    if(view==='tent'){
      if(action==='up'||action==='down')cursor=cursor===3?0:3;
      else if((action==='left'||action==='right')&&cursor<3)cursor=(cursor+(action==='right'?1:2))%3;
      else if(action==='confirm'){activateTent();return true;}
      render();return true;
    }
    if(view==='maps'||view==='organize'){
      const entries=maps().registered;
      if(action==='confirm'&&entries[index])openDetail(entries[index]);
      else if(action==='left'||action==='pageLeft')turnPage(-1);
      else if(action==='right'||action==='pageRight')turnPage(1);
      else if(entries.length&&(action==='up'||action==='down')){index=(index+(action==='down'?1:entries.length-1))%entries.length;armed=-1;render();}
    }else if(view==='appraise'){
      const count=maps().unidentified.length;
      if(action==='confirm')inspect();
      else if(count&&(action==='up'||action==='down')){appraisalIndex=(appraisalIndex+(action==='down'?1:count-1))%count;appraisalArmed=-1;render();}
    }else if(action==='confirm'){
      if(view==='appraisal'||view==='duplicate')nextAppraisal();else back();
    }
    return true;
  }
  return {open(kind){previousHint=hint?.textContent||'';active=true;opening=kind;view=maps().discovererName?kind:'signature';cursor=formCursor=actionCursor=0;armed=appraisalArmed=-1;tentImage=getTentBackground();render();},input:inputAction,close};
}
