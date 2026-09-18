export function drawGeminiFinalBoard(ctx,e,W,H,images,load) {
 const paths=['images/screenshots/gemini_01.avif','images/screenshots/gemini_02.avif'];
 paths.forEach(p=>load(p,p));
 const tablets=paths.map(p=>images.get(p));
 if(!['finalLeaving','finalSlots','finalPiece'].includes(e.phase))return;
 for(let i=0;i<2;i++)drawTablet(ctx,W*(.342+i*.168),H*.306,W*.148,H*.363,e.slots[i],e.selection===i,tablets);
 if(e.phase==='finalPiece') {
  ctx.save();ctx.fillStyle='rgba(0,0,0,.82)';ctx.fillRect(W*.31,H*.72,W*.38,H*.25);ctx.restore();
  for(let i=0;i<2;i++)drawTablet(ctx,W*(.355+i*.18),H*.745,W*.11,H*.19,i,e.piece===i,tablets);
 }
}
function drawTablet(ctx,x,y,w,h,piece,selected,tablets) {
 ctx.save();ctx.shadowColor=selected?'#79ffff':'#7249ba';ctx.shadowBlur=selected?16:7;
 ctx.fillStyle=piece===null?'#555a62':'#562191';ctx.fillRect(x,y,w,h);ctx.shadowBlur=0;
 ctx.lineWidth=Math.max(2,w*.035);ctx.strokeStyle=selected?'#b9ffff':'#a075d2';ctx.strokeRect(x,y,w,h);
 ctx.strokeStyle=piece===null?'#a2a9b0':'#bd79fa';ctx.beginPath();ctx.moveTo(x+w,y);ctx.lineTo(x,y);ctx.lineTo(x,y+h);ctx.stroke();
 ctx.strokeStyle='#252036';ctx.beginPath();ctx.moveTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.stroke();
 if(piece!==null && tablets[piece]?.naturalWidth) {
  ctx.shadowColor='#b977ff';ctx.shadowBlur=8;
  ctx.drawImage(tablets[piece],x+w*.025,y+h*.02,w*.95,h*.96);
 } ctx.restore();
}
