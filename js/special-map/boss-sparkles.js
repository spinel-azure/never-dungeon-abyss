export const SPECIAL_BOSS_GLOW = Object.freeze({karte_boss_maikaefer_koenig:'#ffd342',karte_boss_lumina:'#ffdc75',karte_boss_noctia:'#b9a1ff',karte_boss_zelena:'#8fffad'});
// Presentation only. Draw after the original sprite; never recolor its pixels.
export function drawSpecialBossSparkles(ctx, bossId, timeMs, {x=0,y=0,width=600,height=600,reducedMotion=false}={}) {
 if(!SPECIAL_BOSS_GLOW[bossId]||!Number.isFinite(timeMs)||width<=0||height<=0)return;
 const t=reducedMotion?0:timeMs/1000;
 ctx.save();
 try {
  ctx.globalCompositeOperation='screen';
  const color=SPECIAL_BOSS_GLOW[bossId];ctx.shadowColor=color;ctx.shadowBlur=Math.min(width,height)*.025;
  for(let i=0;i<36;i++) {
   const phase=i*2.399963, pulse=.5+.5*Math.sin(t*(1.2+(i%3)*.22)+phase);
   const alpha=reducedMotion?.38:(.2+Math.pow(pulse,2)*.8);
   const px=x+width*(.15+((i*37)%71)/100);
   const py=y+height*(.12+((i*29)%73)/100);
   const radius=Math.min(width,height)*(.005+.011*pulse);
   ctx.globalAlpha=alpha;
   const glow=ctx.createRadialGradient(px,py,0,px,py,radius*3);
   glow.addColorStop(0,color);glow.addColorStop(1,color+'00');
   ctx.fillStyle=glow;ctx.fillRect(px-radius*3,py-radius*3,radius*6,radius*6);
   ctx.fillStyle=color;
   if(bossId==='karte_boss_zelena'||bossId==='karte_boss_lumina'){
    ctx.save();ctx.translate(px,py);ctx.rotate(phase+t*.3);ctx.beginPath();ctx.ellipse(0,0,radius*.5,radius*1.8,0,0,Math.PI*2);ctx.fill();ctx.restore();continue;
   }
   if(bossId==='karte_boss_noctia'){ctx.beginPath();ctx.ellipse(px,py,radius*.6,radius,0,0,Math.PI*2);ctx.fill();}
   ctx.beginPath();
   ctx.moveTo(px,py-radius);ctx.lineTo(px+radius*.23,py-radius*.23);
   ctx.lineTo(px+radius,py);ctx.lineTo(px+radius*.23,py+radius*.23);
   ctx.lineTo(px,py+radius);ctx.lineTo(px-radius*.23,py+radius*.23);
   ctx.lineTo(px-radius,py);ctx.lineTo(px-radius*.23,py-radius*.23);ctx.closePath();ctx.fill();
   ctx.fillStyle='#fff9df';ctx.fillRect(px-1,py-1,2,2);
  }
 } finally {ctx.restore();}
}
