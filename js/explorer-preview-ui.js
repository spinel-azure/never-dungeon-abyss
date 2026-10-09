import {mapNameColor} from './special-map/name-color.js';
import {sortRegisteredMaps} from '../data/special-map-sort.js';
import {MAP_BETA_WELCOME,MAP_BETA_EXPLANATION,MAP_BETA_NOTICE} from '../data/map-beta.js';
import {paginateMessageToFit} from './message-pagination.js';
import {grantTestStarterMaps,prepareFormalStarter,receiveFormalStarter,unidentifiedMapLabel} from '../data/special-map-starter.js';
import {hasPendingMapReward,receiveMapBossReward} from '../data/special-map-rewards.js';
import {surveyCount} from '../data/special-map-survey.js';
import {surveyTotalV2} from '../data/special-map-survey-v2.js';
import {getTentBackground} from './explorer-preview.js';
import {REGISTERED_LIMIT,isV2Map, rarityLabel, mapContentId, normalizeSpecialMaps, describeTestMap, setMapSignature, inspectAppraisal, appraiseMap, registerSharedMap, deleteRegisteredMap, toggleMapFavorite, updateMapSurvey} from '../data/special-maps.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';

export function createExplorerPreviewUI({host, commands, background, message, playSe, onExit, startExploration, showMapRewardAcquisition, useBetaIntroduction=()=>false, finishTyping=()=>false, canReceiveTestStarter=()=>false, getMaps=()=>null, updateMaps=()=>({ok:false,error:'保存処理に接続されていません。'})}) {
  const panel=document.createElement('section');
  panel.className='transfer-destination-overlay explorer-preview';panel.hidden=true;
  panel.setAttribute('aria-label','特殊地図');host.append(panel);
  const hint=document.querySelector('#commandHint');
  let active=false,view='tent',origin='maps',opening='tent',previousHint='',tentImage='',cursor=0;
  let index=0,page=0,armed=-1,appraisalIndex=0,appraisalArmed=-1,discoveryId='',step=0,detailId='',input=null;
  const maps=()=>normalizeSpecialMaps(getMaps());
  let formControls=[],formCursor=0,actions=[],actionCursor=0,pendingMap=null,codeDraft='';
  let exploration=null;
  let acquisitionController=null,preparedStarter=null,betaView='',betaPages=[],betaPage=0;
  const tentView=()=>useBetaIntroduction()?(!maps().starterMapsGranted?'betaWelcome':!maps().betaExplanationComplete?'betaExplanation':'tent'):'tent';
  const initialView=kind=>kind==='tent'&&canReceiveTestStarter()&&!maps().starterMapsTestGranted?'starter':kind==='tent'&&useBetaIntroduction()?tentView():kind;
  function showBetaPage(){message.textContent=betaPages[betaPage]+'\n＊Aボタンで次へ';}
  function betaCommands(entries){
    actions=entries.filter(e=>e[1]).map(e=>e[1]);
    commands.replaceChildren(...entries.map(([label,action])=>{const b=button(label,action,Boolean(action)&&actions.indexOf(action)===actionCursor);b.disabled=!action;return b;}));
  }
  function renderBeta(){
    panel.hidden=true;commands.hidden=false;commands.dataset.townActive='true';delete commands.dataset.entranceActive;
    if(betaView!==view){
      betaView=view;betaPage=0;
      const texts=view==='betaWelcome'?[MAP_BETA_WELCOME]:[MAP_BETA_NOTICE,...MAP_BETA_EXPLANATION];
      betaPages=texts.flatMap(text=>paginateMessageToFit({element:message,text:text===MAP_BETA_NOTICE?text:'トレリーレン「'+text+'」',formatPage:value=>value+'\n＊Aボタンで次へ'}));
    }
    betaCommands([['次へ（A）',advanceBeta],[''],[''],[''],[''],['戻る（B）',exit]]);showBetaPage();
    if(view==='betaWelcome'&&maps().unidentified.length){
      betaCommands([['既存の地図を鑑定する',()=>{view='appraise';render();}],['地図整理',()=>{view='organize';render();}],[''],[''],[''],['戻る（B）',exit]]);
      message.textContent='トレリーレン「3枚まとめて渡すので、未鑑定の地図をすべて鑑定してから受け取りに来てね。」';
    }
  }
  async function advanceBeta(){
    if(finishTyping())return;
    if(betaPage<betaPages.length-1){betaPage++;showBetaPage();return;}
    if(view==='betaExplanation'){
      const result=updateMaps(state=>({ok:true,state:{...state,betaExplanationComplete:true}}));
      if(!result.ok){error(result.error);return;}
      betaView='';view='appraise';appraisalIndex=0;render();return;
    }
    if(!maps().starterOffer){
      if(!preparedStarter){const prepared=prepareFormalStarter(maps());if(!prepared.ok){error(prepared.error);return;}preparedStarter=prepared.maps;}
      const prepared=updateMaps(state=>({ok:true,state:{...state,starterOffer:preparedStarter}}));
      if(!prepared.ok){error(prepared.error);return;}
    }
    const result=updateMaps(receiveFormalStarter);
    if(!result.ok){error(result.error);return;}
    preparedStarter=null;
    const controller=new AbortController();acquisitionController=controller;
    message.textContent='「はじまりの白地図」（3枚）を受け取った！';
    try{if(showMapRewardAcquisition)await showMapRewardAcquisition({signal:controller.signal,starter:true});else playSe('importantItem');}
    finally{if(acquisitionController===controller)acquisitionController=null;}
    if(controller.signal.aborted||!active)return;
    betaView='';view=maps().discovererName?'betaExplanation':'signature';render();
  }

  let sortMode=-1,sortFocused=false;
  const sortLabels=['お気に入り','Lv低い順','Lv高い順','テーマ'];
  const entries=()=>sortRegisteredMaps(maps().registered,sortMode);
  function cycleSort(){sortMode=(sortMode+1)%sortLabels.length;index=page=0;armed=-1;render();}
  const selectedMap=()=>maps().registered.find(m=>m.id===detailId);
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const mapText=(tag,text,map,cls)=>{const e=make(tag,text,cls);e.style.color=mapNameColor(map.rarity);return e;};
  const invoke=(action,sound=action===back||action===exit?'cancel':'confirm')=>{playSe(sound);action();};
  const button=(label,action,selected=false,sound)=>{const b=make('button');b.type='button';if(label)b.append(make('span',label,'explorer-button-label'));b.classList.toggle('is-selected',selected);b.onclick=()=>{if(acquisitionController||b.disabled)return;if(finishTyping())return;invoke(action,typeof sound==='function'?sound():sound??(label==='戻る'?'cancel':undefined));};return b;};
  const error=text=>{message.textContent=text;};
  const countText=()=>`未鑑定の地図 ${maps().unidentified.length} / 3　登録済み地図 ${maps().registered.length} / ${REGISTERED_LIMIT}${hasPendingMapReward(maps())?'　討伐地図報酬：未受領':''}`;
  function close(){acquisitionController?.abort();acquisitionController=null;exploration?.close();exploration=null;if(active&&hint)hint.textContent=previousHint;active=false;panel.hidden=true;commands.hidden=false;}
  function exit(){close();onExit();}
  function back(){
    sortFocused=false;
    if(view==='enter'){view='detail';actionCursor=0;}
    else if(['manage','share','delete'].includes(view)){view=view==='manage'?'detail':'manage';actionCursor=0;}
    else if(view==='sameContent')view='register';
    else if(view==='signature'&&useBetaIntroduction()&&!maps().discovererName){exit();return;}
    else if(view==='signature'||view==='starter')view=tentView();
    else if(view==='detail'){view=origin;armed=-1;}
    else if(view==='appraisal'||view==='duplicate'){view='appraise';appraisalArmed=-1;}
    else if(['appraise','register','organize'].includes(view))view=tentView();
    else {exit();return;}
    render();
  }
  function openDetail(map){sortFocused=false;detailId=map.id;origin=view;view='detail';actionCursor=0;render();}
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
    index=entries().findIndex(m=>m.id===result.map.id);page=Math.floor(index/5);
    origin='organize';detailId=result.map.id;view='detail';render();
    message.textContent=result.duplicate?'登録済みの地図を確認しました。既存の記録はそのままです。':'地図帳へ登録しました！';
  }
  function nextAppraisal(){if(view==='duplicate'||step===2)complete();else{step++;render();}}
  function signature(){
    const result=updateMaps(state=>setMapSignature(state,input.value));
    if(!result.ok){error(result.error);return;}
    view=initialView(opening);render();
  }
  function receiveStarter(){
    if(!canReceiveTestStarter())return;
    const result=updateMaps(grantTestStarterMaps);
    if(!result.ok){error(result.error);return;}
    view='tent';cursor=0;render();playSe('importantItem');
    message.textContent='【開発用】はじまりの白地図を3枚受け取りました。地図鑑定で確認できます。\n未鑑定の地図 3 / 3';
  }
  function activateTent(){
    if(cursor===4){
      if(!hasPendingMapReward(maps()))return;
      const result=updateMaps(receiveMapBossReward);
      if(!result.ok){error(result.error);return;}
      cursor=0;render();message.textContent='討伐報酬の未鑑定地図を1枚受け取りました。地図鑑定で確認できます。';
      if(showMapRewardAcquisition){
        const controller=new AbortController();acquisitionController=controller;
        Promise.resolve().then(()=>{if(!controller.signal.aborted)return showMapRewardAcquisition({signal:controller.signal});}).catch(()=>{}).finally(()=>{if(acquisitionController===controller)acquisitionController=null;});
      }else playSe('importantItem');
      return;
    }
    if(cursor===3)return;
    if(cursor===5){exit();return;}
    view=['appraise','register','organize'][cursor];
    if(view==='appraise'&&!maps().discovererName){opening='appraise';view='signature';}
    formCursor=0;codeDraft='';appraisalArmed=armed=-1;render();
  }
  function changeView(next){view=next;actionCursor=0;render();}
  function enterMap(){
    if(exploration)return;
    try{
      if(!startExploration)throw Error('探索機能に接続されていません。');
      exploration=startExploration({host,registered:maps().registered,mapKey:detailId,message,onEnter:()=>{panel.hidden=true;},onExit:exit,playSe,saveSurvey:mask=>updateMaps(state=>updateMapSurvey(state,detailId,mask))});
      if(!exploration?.ready)panel.hidden=true;view='exploring';
    }catch(e){error(e.message);}
  }
  function registered(result){
    if(!result.ok){error(result.error);return;}
    detailId=result.map.id;index=entries().findIndex(m=>m.id===detailId);page=Math.floor(index/5);
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
  async function pasteCode(){
    const target=input;
    try{
      const text=await globalThis.navigator.clipboard.readText();
      if(!active||view!=='register'||input!==target)return;
      target.value=text;codeDraft=text;
      message.textContent='共有コードを貼り付けました。内容を確認して登録してください。';
    }catch{
      if(active&&view==='register'&&input===target)error('クリップボードを読み取れませんでした。入力欄を長押しして貼り付けてください。');
    }
  }
  function actionButtons(items){
    actions=items.map(item=>item[1]);actionCursor=Math.min(actionCursor,items.length-1);
    const footer=make('div',undefined,'explorer-footer');
    items.forEach(([label,action],i)=>footer.append(button(label,action,i===actionCursor)));panel.append(footer);
  }
  function focusForm(){
    formControls.forEach((e,i)=>e.classList.toggle('is-selected',i===formCursor));
    if(formCursor===0)invoke(()=>input.focus?.());else{input.blur?.();formControls[formCursor]?.focus?.();}
  }
  function turnPage(delta){
    const count=maps().registered.length,pages=Math.ceil(count/5);if(pages<2)return;
    page=(page+delta+pages)%pages;index=page*5;armed=-1;sortFocused=false;render();
  }
  function render(){
    if(!active)return;
    actions=[];formControls=[];panel.replaceChildren();panel.hidden=view==='tent';commands.hidden=view!=='tent';
    background.src=view==='maps'||(['detail','enter'].includes(view)&&origin==='maps')?'images/background/circle.avif':tentImage;
    background.alt=view==='maps'||(['detail','enter'].includes(view)&&origin==='maps')?'地図探索':'探検家テント';
    if(hint)hint.textContent='＊ Bボタンで戻る';
    message.textContent=countText();
    if(view==='tent'){
      commands.dataset.townActive='true';delete commands.dataset.entranceActive;
      commands.setAttribute('aria-label','探検家テント');
      commands.replaceChildren(...['地図鑑定','地図登録','地図整理','調査報告','討伐報酬受領','戻る'].map((label,i)=>{const b=button(label,()=>{cursor=i;activateTent();},i===cursor);b.disabled=i===3||(i===4&&!hasPendingMapReward(maps()));return b;}));return;
    }
    if(view==='betaWelcome'||view==='betaExplanation'){renderBeta();return;}
    panel.append(make('h2',({starter:'【開発用】はじまりの白地図',maps:'MAP EXPLORATION',organize:'地図整理',detail:'地図詳細',signature:'地図署名',appraise:'地図鑑定',appraisal:'地図鑑定',duplicate:'地図鑑定',register:'地図登録',manage:'地図管理',share:'共有コード',delete:'地図削除',sameContent:'地図登録の確認',enter:'地図詳細'})[view]));
    if(view==='starter'){
      panel.append(make('p','開発用の配布です。はじまりの白地図3枚を受け取り、鑑定と探索を確認できます。本番の初回配布記録は変更しません。'));
      actionButtons([['テスト用3枚を受け取る（A）',receiveStarter],['あとで（B）',back]]);return;
    }
    if(view==='signature'||view==='register'){
      const isSignature=view==='signature',submitAction=isSignature?signature:()=>importCode();
      const form=make('form',undefined,'explorer-signature');
      form.dataset.gamepadForm='special-map';
      const label=make('label',isSignature?'地図に記録する名前（1～4文字）':'共有コードを入力／貼り付け');
      input=make(isSignature?'input':'textarea');if(isSignature)input.type='text';input.value=isSignature?'':codeDraft;input.autocomplete='off';input.spellcheck=false;
      if(!isSignature){input.setAttribute('autocapitalize','off');input.setAttribute('autocorrect','off');}
      input.setAttribute('aria-label',isSignature?'地図署名':'共有コード入力');
      input.oninput=()=>{if(!isSignature)codeDraft=input.value;};
      label.append(input);form.append(label);
      const submit=button(isSignature?'署名を登録（A）':'地図を登録（A）',submitAction),cancel=button('戻る（B）',back);
      const paste=isSignature?null:button('貼り付け',pasteCode);
      formControls=isSignature?[input,submit,cancel]:[input,paste,submit,cancel];formControls.forEach((e,i)=>{e.classList.toggle('is-selected',i===formCursor);e.onfocus=()=>{formCursor=i;formControls.forEach((c,j)=>c.classList.toggle('is-selected',i===j));};});
      const formActions=make('div',undefined,'explorer-form-actions');
      if(paste)formActions.append(paste);formActions.append(submit,cancel);form.append(formActions);
      form.onsubmit=e=>{e.preventDefault();if(!finishTyping())invoke(submitAction);};
      input.onkeydown=e=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();invoke(back);}else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(!finishTyping())invoke(submitAction);}};
      panel.append(form);
      if(isSignature)message.textContent='トレリーレン「発見した人の名前も地図に残すんだけど……なんて書いておけばいい？」';return;
    }
    if(view==='maps'||view==='organize'){
      const entries=sortRegisteredMaps(maps().registered,sortMode);index=Math.max(0,Math.min(index,entries.length-1));page=Math.floor(index/5);
      const list=make('div',undefined,'transfer-destination-list');
      if(!entries.length){sortFocused=true;list.append(make('p','登録されている地図はありません。'));}
      entries.slice(page*5,page*5+5).forEach((map,offset)=>{
        const i=page*5+offset,info=describeTestMap(map)||{name:map.rulesetVersion==='special-map-v1'?'特殊地図':'未対応の生成ルール',level:'?'};
        const b=button('',()=>{sortFocused=false;if(armed===i)openDetail(map);else{index=i;armed=i;render();}},i===index&&!sortFocused,()=>armed===i?'confirm':'cursorMove');
        const star=map.favorite?' ⭐':'';b.title=info.name+star;b.setAttribute('aria-label',(isV2Map(map)?info.name:`${info.name} Lv.${info.level}`)+star);
        b.append(mapText('span',info.name+(isV2Map(map)?star:''),map,isV2Map(map)?'explorer-map-name explorer-map-name-v2':'explorer-map-name'));if(!isV2Map(map))b.append(mapText('span',`Lv.${info.level}${star}`,map,'explorer-map-level'));list.append(b);
      });
      const pager=make('div',undefined,'transfer-destination-pager');
      const prev=button('◀',()=>turnPage(-1),false,'cursorMove'),next=button('▶',()=>turnPage(1),false,'cursorMove');
      prev.setAttribute('aria-label','前のページ');next.setAttribute('aria-label','次のページ');prev.disabled=next.disabled=entries.length<=5;
      pager.append(prev,make('strong',`${page+1} / ${Math.max(1,Math.ceil(entries.length/5))}`),next);
      const footer=make('div',undefined,'explorer-footer');const sort=button('ソート：'+(sortMode<0?'登録順':sortLabels[sortMode]),cycleSort,sortFocused);
      sort.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();sort.onclick();}};
      footer.append(button('戻る（B）',back),sort);panel.append(list,pager,footer);
      message.textContent=`${countText()}　↑↓：選択・ソート　←→：ページ　A：${sortFocused?'ソート':'詳細'}　B：戻る`;return;
    }
    if(view==='appraise'){
      const entries=maps().unidentified;appraisalIndex=Math.max(0,Math.min(appraisalIndex,entries.length-1));
      const list=make('div',undefined,'transfer-destination-list');
      if(!entries.length)list.append(make('p','鑑定できる地図を持っていません。'));
      entries.forEach((map,i)=>list.append(button(`${unidentifiedMapLabel(map)} ${i+1}`,()=>{if(appraisalArmed===i)inspect();else{appraisalIndex=i;appraisalArmed=i;render();}},i===appraisalIndex,()=>appraisalArmed===i?'confirm':'cursorMove')));
      panel.append(list,button('戻る（B）',back));return;
    }
    if(view==='duplicate'||view==='appraisal'){
      panel.append(make('p',view==='duplicate'?'この地図は以前にも発見しています。今回の未鑑定地図を消費し、登録済みの地図を確認します。':[
        'トレリーレン「ちょっと待ってね……。」','「ここがこうなって……うん……。」','「……分かった！」'
      ][step]));
      const footer=make('div',undefined,'explorer-footer');footer.append(button('確認（A）',nextAppraisal,true),button('戻る（B）',back));panel.append(footer);return;
    }
    if(view==='detail'||view==='enter'){
      const map=maps().registered.find(m=>m.id===detailId);if(!map){view=origin;render();return;}
      const info=describeTestMap(map)||{name:map.rulesetVersion==='special-map-v1'?'特殊地図':'未対応の生成ルール',level:'?'};
      const body=make('div',undefined,'explorer-detail');
      body.append(mapText('h3',(isV2Map(map)?info.name:`${info.name} Lv.${info.level}`)+(map.favorite?' ⭐':''),map),make('p',`発見者：${map.discovererName}`),make('p',isV2Map(map)?`${rarityLabel(map.rarity)}・3層　${surveyTotalV2(map.surveyedMasks)===300?'調査完了':`調査 ${surveyTotalV2(map.surveyedMasks)} / 300`}`:surveyCount(map.surveyedMask)===100?'調査完了':`調査率 ${surveyCount(map.surveyedMask)} / 100`),make('p',isV2Map(map)?'挑戦条件：未実装':'挑戦条件：未実装（Phase 2A仮地図）'));
      panel.append(body);if(view==='enter'){panel.append(make('p','この地図を探索しますか？'));actionButtons([['はい（A／ENTER）',enterMap],['いいえ（B）',back]]);return;}actionButtons(origin==='maps'?[['探索する（A）',()=>changeView('enter')],['戻る（B）',back]]:[['管理機能を確認（A）',()=>changeView('manage')],['戻る（B）',back]]);return;
    }
    if(view==='sameContent'){
      const existing=maps().registered.find(m=>mapContentId(m)===mapContentId(pendingMap));
      panel.append(make('p',`同じ内容の地図がすでに登録されています。発見者：${existing?.discovererName||''}`),make('p','発見者の異なる地図として登録しますか？'));
      actionButtons([['登録する（A）',()=>importCode(true)],['やめる（B）',back]]);return;
    }
    const map=selectedMap();if(!map){view='organize';render();return;}
    const info=describeTestMap(map)||{name:map.rulesetVersion==='special-map-v1'?'特殊地図':'未対応の生成ルール',level:'?'};
    if(isV2Map(map))panel.append(mapText('p',info.name+(map.favorite?' ⭐':''),map),make('p',`発見者：${map.discovererName}`));
    else panel.append(mapText('p',`${info.name} Lv.${info.level}${map.favorite?' ⭐':''}　発見者：${map.discovererName}`,map));
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
      panel.append(make('p','この地図を削除しますか？'),make('p',isV2Map(map)?'調査記録・お気に入り・メモ・探索途中の状態は失われます。討伐済みの記録と報酬の受領履歴は保持されます。再登録には共有コードが必要です。':'調査記録・踏破記録・お気に入り・メモ・探索途中の状態も失われます。再登録には共有コードが必要です。'));
      actionButtons([['削除する（A）',removeMap],['やめる（B）',back]]);
    }
  }
  function inputAction(action){
    if(!active)return false;
    if(acquisitionController)return true;
    if(action==='confirm'&&finishTyping())return true;
    if(exploration)return exploration.input(action);
    if(action==='cancel'){invoke(back);return true;}
    if(action==='sort'&&(view==='maps'||view==='organize')){invoke(cycleSort);return true;}
    if(['up','down','left','right','pageLeft','pageRight'].includes(action))playSe('cursorMove');
    if(view==='signature'||view==='register'){
      if(['up','down','left','right'].includes(action)){formCursor=(formCursor+(['down','right'].includes(action)?1:formControls.length-1))%formControls.length;focusForm();}
      else if(action==='confirm'){if(formCursor===0)input.focus?.();else formControls[formCursor]?.onclick?.();}
      return true;
    }
    if(actions.length){
      if(['up','down','left','right'].includes(action)){actionCursor=(actionCursor+(['down','right'].includes(action)?1:actions.length-1))%actions.length;render();}
      else if(action==='confirm')invoke(actions[actionCursor]);return true;
    }
    if(view==='tent'){
      const available=[0,1,2,...(hasPendingMapReward(maps())?[4]:[]),5];
      if(action==='up'||action==='down'){const next=(cursor+3)%6;cursor=available.includes(next)?next:5;}
      else if(action==='left'||action==='right'){const row=available.filter(i=>Math.floor(i/3)===Math.floor(cursor/3));cursor=row[(row.indexOf(cursor)+(action==='right'?1:row.length-1))%row.length];}
      else if(action==='confirm'){invoke(activateTent,cursor===5?'cancel':'confirm');return true;}
      render();return true;
    }
    if(view==='maps'||view==='organize'){
      const entries=sortRegisteredMaps(maps().registered,sortMode);
      if(action==='confirm'&&sortFocused)invoke(cycleSort);
      else if(action==='confirm'&&entries[index])invoke(()=>openDetail(entries[index]));
      else if(action==='left'||action==='pageLeft')turnPage(-1);
      else if(action==='right'||action==='pageRight')turnPage(1);
      else if(entries.length&&(action==='up'||action==='down')){
        const first=page*5,last=Math.min(first+4,entries.length-1);
        if(sortFocused){sortFocused=false;index=action==='down'?first:last;}
        else if((action==='down'&&index===last)||(action==='up'&&index===first))sortFocused=true;
        else index+=action==='down'?1:-1;
        armed=-1;render();
      }
    }else if(view==='appraise'){
      const count=maps().unidentified.length;
      if(action==='confirm'&&count)invoke(inspect);
      else if(count&&(action==='up'||action==='down')){appraisalIndex=(appraisalIndex+(action==='down'?1:count-1))%count;appraisalArmed=-1;render();}
    }else if(action==='confirm'){
      if(view==='appraisal'||view==='duplicate')invoke(nextAppraisal);else invoke(back);
    }
    return true;
  }
  return {open(kind){previousHint=hint?.textContent||'';active=true;sortFocused=false;opening=kind;betaView='';view=maps().discovererName?initialView(kind):kind==='tent'&&useBetaIntroduction()&&!maps().starterMapsGranted?'betaWelcome':'signature';cursor=formCursor=actionCursor=0;armed=appraisalArmed=-1;tentImage=getTentBackground();render();},input:inputAction,isTalking:()=>view==='betaWelcome'||view==='betaExplanation',close};
}
