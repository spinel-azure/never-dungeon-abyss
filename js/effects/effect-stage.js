// CSS translation is expressed in rendered pixels, while the effect uses logical
// canvas coordinates. Individual translate leaves existing transforms untouched.
export function createStageShake(elements, reference, getSize) {
  const originals=new Map(elements.filter(Boolean).map(element=>[element,element.style.translate]));
  return ({x,y})=>{
    const size=getSize();
    for(const [element,original] of originals) element.style.translate=x||y
      ? `${x*reference.clientWidth/size.width}px ${y*reference.clientHeight/size.height}px`
      : original;
  };
}

// A transient overlay filters the composed stage, including its DOM background.
export function screenState(parts,time){
 let blur=0,tv=null;
 for(const p of parts){if(!p.enabled||time<p.start||time>=p.start+p.duration)continue;const elapsed=time-p.start;
 if(p.type==='gaussianBlur'){let t=Math.min(1,elapsed/Math.max(1,p.transition));if(p.easing==='easeInCubic')t=t**3;else if(p.easing==='easeOutCubic')t=1-(1-t)**3;else if(p.easing==='easeInOutCubic')t=t<.5?4*t**3:1-((-2*t+2)**3)/2;blur=Math.max(blur,p.fromBlur+(p.toBlur-p.fromBlur)*t);}
 if(p.type==='tvOff'){const t=Math.min(1,elapsed/Math.max(1,p.collapse));tv={close:Math.min(1,t/.65),line:Math.max(0,1-Math.max(0,t-.65)/.35),flash:Math.max(0,1-t*8)};}
 }return {blur,tv};
}
export function createStageFilter(stage,getSize){
 let overlay=null;
 return state=>{if(!state||(!state.blur&&!state.tv)){overlay?.remove();overlay=null;return}if(!overlay){overlay=document.createElement('div');overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:100;overflow:hidden';for(let i=0;i<3;i++)overlay.append(document.createElement('div'));stage.append(overlay)}
 const scale=stage.clientWidth/(getSize().width||960);overlay.style.backdropFilter=overlay.style.webkitBackdropFilter=state.blur?'blur('+state.blur*scale+'px)':'none';
 const [top,bottom,line]=overlay.children;const tv=state.tv;for(const el of [top,bottom])el.style.cssText='position:absolute;left:0;width:100%;background:#000;height:'+(tv?tv.close*50:0)+'%';top.style.top='0';bottom.style.bottom='0';
 line.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);height:2px;background:white;box-shadow:0 0 12px 3px white;width:'+(tv?tv.line*100:0)+'%;opacity:'+(tv?Math.min(1,tv.close*2)*tv.line:0);
 overlay.style.background=tv&&tv.flash?'rgba(255,255,255,'+tv.flash*.7+')':'transparent';
 };
}
