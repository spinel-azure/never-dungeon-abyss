import {LION_CONFIG} from '../data/loewenkoenigin.js';

// Keep the old portrait visible while the next asset decodes, then blend layers.
export async function presentLionPhase(image, source) {
  if(!image) return;
  const incoming=new Image();incoming.src=source;
  try {await incoming.decode();} catch {image.src=source;return;}
  if(!image.isConnected)return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){image.src=source;return;}
  const rect=image.getBoundingClientRect();
  const layer=image.cloneNode(false);
  layer.classList.add('lion-phase-layer');
  layer.removeAttribute('id');layer.src=source;layer.alt='';layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',
    maxWidth:'none',maxHeight:'none',margin:'0',transform:'none',pointerEvents:'none',zIndex:'1000',objectFit:'contain'});
  document.body.append(layer);
  const outgoing=image.animate([{opacity:1},{opacity:0}],
    {duration:LION_CONFIG.transitionMs,easing:'ease-in-out',fill:'forwards'});
  try {
    await layer.animate([{opacity:0,filter:'drop-shadow(0 0 24px #ffe090)'},{opacity:1,filter:'drop-shadow(0 0 5px #ffe090)'}],
      {duration:LION_CONFIG.transitionMs,easing:'ease-in-out',fill:'forwards'}).finished;
    image.src=source;
  } finally {outgoing.cancel();layer.remove();}
}
