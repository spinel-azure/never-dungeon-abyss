import {createMapPreview, moveMapPreview, selectMapPreview, PREVIEW_MAPS, PREVIEW_COUNTS, getTentBackground} from './explorer-preview.js';

export function createExplorerPreviewUI({host, commands, background, message, playSe, onExit}) {
  const panel = document.createElement('section');
  const hint = document.querySelector('#commandHint');
  let previousHint = '';
  panel.className = 'transfer-destination-overlay explorer-preview'; panel.hidden = true;
  panel.setAttribute('aria-label', '特殊地図 UIテスト');
  host.append(panel);
  let view = 'tent', cursor = 0, detailOrigin = 'maps', sample = createMapPreview(), tentImage = '', active = false;
  const make = (tag, text, className) => {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const button = (text, action, selected=false) => {const b=make('button');if(text)b.append(make('span',text,'explorer-button-label'));b.type='button';b.classList.toggle('is-selected',selected);b.onclick=()=>{playSe('confirm');action();};return b;};
  const exit = () => {close();onExit();};
  const notice = () => {message.textContent='Phase 1：画面確認のみです。地図・セーブ・冒険者の状態は変更しません。';};
  function renderTent() {
    commands.hidden=false;commands.dataset.townActive='true';delete commands.dataset.entranceActive;
    commands.setAttribute('aria-label','探検家テント');
    const labels=['地図鑑定','地図登録','地図整理','戻る','',''];
    commands.replaceChildren(...labels.map((label,i)=>{const b=button(label,()=>{cursor=i;activateTent();},i===cursor);b.disabled=!label;return b;}));
  }
  function activateTent(){
    if(cursor===3){exit();return;}
    if(cursor===2){view='organize';sample.detail=false;sample.armed=-1;}else view=cursor===0?'appraise':'register';
    render();
  }
  function back(){
    if(view==='detail'){view=detailOrigin;sample.detail=false;sample.armed=-1;}
    else if(view==='organize'||view==='appraise'||view==='register')view='tent';
    else {exit();return;}
    render();
  }
  function details(){detailOrigin=view;sample.detail=true;view='detail';render();}
  function render(){
    if(!active)return;
    panel.replaceChildren();panel.hidden=view==='tent';
    background.src=view==='maps'||(view==='detail'&&detailOrigin==='maps')?'images/background/circle.avif':tentImage;
    background.alt=view==='maps'||(view==='detail'&&detailOrigin==='maps')?'地図探索':'探検家テント';
    if(hint)hint.textContent='＊ Bボタンで戻る';
    message.textContent='Phase 1 UIテスト：表示中の地図は仮データです。';
    if(view==='tent'){message.textContent='探検家テント。地図の鑑定・登録・整理を行う場所です。（Phase 1）';renderTent();return;}
    commands.hidden=true;
    const title=make('h2',view==='maps'?'MAP EXPLORATION':view==='organize'?'地図整理':view==='detail'?'地図詳細':view==='appraise'?'地図鑑定':'地図登録');panel.append(title);
    if(view==='maps'||view==='organize'){
      const list=make('div',undefined,'transfer-destination-list');
      if(!sample.count)list.append(make('p','登録されている地図はありません。'));
      PREVIEW_MAPS.slice(sample.page*5,Math.min(sample.count,sample.page*5+5)).forEach((map,offset)=>{
        const index=sample.page*5+offset,b=button('',()=>{if(selectMapPreview(sample,index))details();else render();},index===sample.index);
        b.title=map.name;b.setAttribute('aria-label',`${map.name} Lv.${map.level}`);
        b.append(make('span',map.name,'explorer-map-name'),make('span',`Lv.${map.level}`,'explorer-map-level'));list.append(b);
      });
      const pager=make('div',undefined,'transfer-destination-pager');
      const prev=button('◀',()=>{moveMapPreview(sample,'left');render();}),next=button('▶',()=>{moveMapPreview(sample,'right');render();});
      prev.setAttribute('aria-label','前のページ');next.setAttribute('aria-label','次のページ');prev.disabled=next.disabled=sample.count<=5;
      pager.append(prev,make('strong',`${sample.page+1} / ${Math.max(1,Math.ceil(sample.count/5))}`),next);
      const footer=make('div',undefined,'explorer-footer');
      footer.append(button(`仮データ ${sample.count} / 10件`,cycleCount),button('戻る（B）',back));
      panel.append(list,pager,footer);message.textContent='↑↓：選択　←→：ページ　A：詳細　B：戻る ／ L・R：仮データ件数切替';
    }else if(view==='detail'){
      const map=PREVIEW_MAPS[sample.index],body=make('div',undefined,'explorer-detail');
      body.append(make('h3',`${map.name} Lv.${map.level}`),make('p',`発見者：${map.discoverer}`),make('p',`踏破状況：${map.cleared?'踏破済み':'未踏破'}`),make('p',`挑戦条件：B${map.requiredDepth}F到達`));
      const footer=make('div',undefined,'explorer-footer');footer.append(button(detailOrigin==='maps'?'探索する（A）':'管理機能を確認（A）',notice,true),button('戻る（B）',back));
      panel.append(body,footer);message.textContent=detailOrigin==='maps'?'この地図を探索しますか？（Phase 1：入場は行いません）':'地図整理の詳細表示です。編集・共有・削除は後のPhaseで接続します。';
    }else{
      panel.append(make('p',view==='appraise'?'未鑑定の地図を鑑定し、地図帳へ登録する画面です。':'共有コードから地図を登録する画面です。'),make('p','Phase 1：画面案内のみ。本処理は未接続です。'),button('戻る（B）',back,true));
    }
  }
  function cycleCount(){sample=createMapPreview(PREVIEW_COUNTS[(PREVIEW_COUNTS.indexOf(sample.count)+1)%PREVIEW_COUNTS.length]);render();}
  function input(action){
    if(!active)return false;
    if(action==='cancel'){playSe('cancel');back();return true;}
    if(action==='pageLeft'||action==='pageRight'){if(view==='maps'||view==='organize')cycleCount();return true;}
    if(view==='tent'){
      if(['up','down','left','right'].includes(action)){
        // Three columns, with only the back command on the second row.
        if(action==='up'||action==='down')cursor=cursor===3?0:3;
        else if(cursor<3)cursor=(cursor+(action==='right'?1:2))%3;
        playSe('cursorMove');render();
      }
      if(action==='confirm')activateTent();
    }else if(view==='maps'||view==='organize'){
      if(action==='confirm'&&sample.count)details();
      else if(['up','down','left','right'].includes(action)){moveMapPreview(sample,action);playSe('cursorMove');render();}
    }else if(action==='confirm'){if(view==='detail')notice();else back();}
    return true;
  }
  function close(){if(active&&hint)hint.textContent=previousHint;active=false;panel.hidden=true;commands.hidden=false;}
  return {open(kind){previousHint=hint?.textContent||'';active=true;view=kind;cursor=0;sample.detail=false;sample.armed=-1;tentImage=getTentBackground();render();},input,close};
}
