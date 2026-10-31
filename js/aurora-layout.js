// In-game presentations occupy exactly the existing canvas, preserving the HUD.
export function layoutAuroraSurface(surface,anchor,embedded=false){
 const rect=anchor?.getBoundingClientRect();
 if(embedded&&rect){
  Object.assign(surface.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
  surface.style.borderRadius=getComputedStyle(anchor.parentElement).borderRadius;
  return;
 }
 const w=Math.min(rect?.width||innerWidth,innerWidth,innerHeight*16/9),h=w*9/16;
 Object.assign(surface.style,{width:w+'px',height:h+'px',left:(innerWidth-w)/2+'px',top:(rect?Math.max(0,Math.min(rect.top,innerHeight-h)):(innerHeight-h)/2)+'px'});
}
