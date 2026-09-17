import { GEMINI_ASSETS } from '../data/gemini-event.js';
export function drawGeminiEvent(ctx, event, width, height, images, load) {
  for (const [key,path] of Object.entries(GEMINI_ASSETS)) load('gemini_'+key,path);
  ctx.fillStyle='#050508';ctx.fillRect(0,0,width,height);
  if (['opening','opened'].includes(event.phase)) return;
  const background=images.get('gemini_background');
  if (background?.complete && background.naturalWidth) ctx.drawImage(background,0,0,width,height);
  if (event.page < 1) return;
  const ready=['white','red'].every(key=>images.get('gemini_'+key)?.naturalWidth>0);
  if (!ready) return;
  event.sistersReadyAt ??= performance.now();
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const alpha=reduced ? 1 : Math.min(1,(performance.now()-Math.max(event.sistersReadyAt,event.sistersFadeStart || 0))/1500);
  ctx.save();ctx.globalAlpha=alpha;
  for (const [key,center] of [['white',.17],['red',.83]]) {
    const image=images.get('gemini_'+key);
    const scale=Math.min(height*.91/image.naturalHeight,width*.31/image.naturalWidth);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    ctx.drawImage(image,width*center-w/2,height*.97-h,w,h);
  }
  ctx.restore();
}
