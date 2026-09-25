import {getTentBackground} from './explorer-preview.js';
import {normalizeSpecialMaps, describeTestMap, setMapSignature, inspectAppraisal, appraiseMap} from '../data/special-maps.js';

export function createExplorerPreviewUI({host, commands, background, message, playSe, onExit, getMaps=()=>null, updateMaps=()=>({ok:false,error:'保存処理に接続されていません。'})}) {
  const panel=document.createElement('section');
  panel.className='transfer-destination-overlay explorer-preview';panel.hidden=true;
  panel.setAttribute('aria-label','特殊地図');host.append(panel);
  const hint=document.querySelector('#commandHint');
  let active=false,view='tent',origin='maps',opening='tent',previousHint='',tentImage='',cursor=0;
  let index=0,page=0,armed=-1,appraisalIndex=0,appraisalArmed=-1,discoveryId='',step=0,detailId='',input=null;
  const maps=()=>normalizeSpecialMaps(getMaps());
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(label,action,selected=false)=>{const b=make('button');b.type='button';if(label)b.append(make('span',label,'explorer-button-label'));b.classList.toggle('is-selected',selected);b.onclick=()=>{playSe('confirm');action();};return b;};
  const error=text=>{message.textContent=text;};
  const countText=()=>`未鑑定の地図 ${maps().unidentified.length} / 3　登録済み地図 ${maps().registered.length} / 10`;
  function close(){if(active&&hint)hint.textContent=previousHint;active=false;panel.hidden=true;commands.hidden=false;}
  function exit(){close();onExit();}
  function back(){
    if(view==='detail'){view=origin;armed=-1;}
    else if(view==='appraisal'||view==='duplicate'){view='appraise';appraisalArmed=-1;}
    else if(['appraise','register','organize'].includes(view))view='tent';
    else {exit();return;}
    render();
  }
  function openDetail(map){detailId=map.id;origin=view;view='detail';render();}
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
    view=['appraise','register','organize'][cursor];appraisalArmed=armed=-1;render();
  }
  function turnPage(delta){
    const count=maps().registered.length,pages=Math.ceil(count/5);if(pages<2)return;
    page=(page+delta+pages)%pages;index=page*5;armed=-1;render();
  }
  function render(){
    if(!active)return;
    panel.replaceChildren();panel.hidden=view==='tent';commands.hidden=view!=='tent';
    background.src=view==='maps'||(view==='detail'&&origin==='maps')?'images/background/circle.avif':tentImage;
    background.alt=view==='maps'||(view==='detail'&&origin==='maps')?'地図探索':'探検家テント';
    if(hint)hint.textContent='＊ Bボタンで戻る';
    message.textContent=countText();
    if(view==='tent'){
      commands.dataset.townActive='true';delete commands.dataset.entranceActive;
      commands.setAttribute('aria-label','探検家テント');
      commands.replaceChildren(...['地図鑑定','地図登録','地図整理','戻る','',''].map((label,i)=>{const b=button(label,()=>{cursor=i;activateTent();},i===cursor);b.disabled=!label;return b;}));return;
    }
    panel.append(make('h2',({maps:'MAP EXPLORATION',organize:'地図整理',detail:'地図詳細',signature:'地図署名',appraise:'地図鑑定',appraisal:'地図鑑定',duplicate:'地図鑑定',register:'地図登録'})[view]));
    if(view==='signature'){
      const form=make('form',undefined,'explorer-signature');
      const label=make('label','地図に記録する名前（1～4文字）');
      input=make('input');input.type='text';input.value='';input.autocomplete='off';input.setAttribute('aria-label','地図署名');
      label.append(input);form.append(label);
      const submit=button('署名を登録（A）',signature,true);form.append(submit);
      form.onsubmit=e=>{e.preventDefault();signature();};panel.append(form,button('戻る（B）',back));
      message.textContent='トレリーレン「発見した人の名前も地図に残すんだけど……なんて書いておけばいい？」';return;
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
      const footer=make('div',undefined,'explorer-footer');footer.append(button('戻る（B）',back,true));panel.append(body,footer);return;
    }
    panel.append(make('p','共有コードからの地図登録はPhase 2Bで対応します。'),button('戻る（B）',back,true));
  }
  function inputAction(action){
    if(!active)return false;
    if(action==='cancel'){back();return true;}
    if(view==='signature'){if(action==='confirm')signature();return true;}
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
  return {open(kind){previousHint=hint?.textContent||'';active=true;opening=kind;view=maps().discovererName?kind:'signature';cursor=0;armed=appraisalArmed=-1;tentImage=getTentBackground();render();},input:inputAction,close};
}
