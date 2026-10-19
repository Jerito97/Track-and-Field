// Stadium scenery and props
import {ctx,LW} from '../canvas.js';
import {BOARDS,FAN_SHIRTS,HAIRS,INK,SKINS} from '../config.js';
import {JAV_ART} from '../assets.js';
import {hash} from '../utils.js';
import {txt} from './text.js';

export function drawStands(cam,top,bot,excite,clock){
  const rows=5, rowH=(bot-top)/rows, off=cam*.35*24, sp=15;
  ctx.fillStyle='#c4cad6'; ctx.fillRect(0,top,LW,bot-top);
  for(let r=0;r<rows;r++){
    const y=top+r*rowH; ctx.fillStyle=r%2?'#d3d8e2':'#c1c7d3'; ctx.fillRect(0,y+rowH*.64,LW,rowH*.36); ctx.fillStyle='#9097a5'; ctx.fillRect(0,y+rowH*.64,LW,1.5);
    const shift=(r%2)*sp*.5, i0=Math.floor((off-shift)/sp)-1, i1=i0+Math.ceil(LW/sp)+2, hr=Math.min(sp*.34,rowH*.23);
    for(let i=i0;i<=i1;i++){ const h=hash(i*7+r*131); if(h<.07) continue;
      const x=i*sp-off+shift, up=h>.5, b=Math.max(0,Math.sin(clock*10+h*40))*rowH*.12*excite*(up?1:.4), cy=y+rowH*.42-b;
      ctx.lineWidth=1.2; ctx.strokeStyle=INK;
      if(up&&excite>.5){ ctx.beginPath(); ctx.moveTo(x-hr*.8,cy+hr*1.2); ctx.lineTo(x-hr*1.5,cy-hr*1.2); ctx.moveTo(x+hr*.8,cy+hr*1.2); ctx.lineTo(x+hr*1.5,cy-hr*1.2); ctx.stroke(); }
      ctx.fillStyle=FAN_SHIRTS[(h*800|0)%FAN_SHIRTS.length]; ctx.beginPath(); ctx.rect(x-hr*1.15,cy+hr*.9,hr*2.3,rowH*.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle=SKINS[(h*97|0)%SKINS.length]; ctx.beginPath(); ctx.arc(x,cy,hr,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle=HAIRS[(h*331|0)%HAIRS.length]; ctx.beginPath(); ctx.arc(x,cy-hr*.15,hr*1.02,Math.PI*1.05,Math.PI*1.95); ctx.fill();
      ctx.fillStyle=INK; ctx.fillRect(x-hr*.42,cy-hr*.05,hr*.2,hr*.32); ctx.fillRect(x+hr*.22,cy-hr*.05,hr*.2,hr*.32);
    }
  }
  for(let i=Math.floor(off/180)-1;i<Math.floor(off/180)+LW/180+2;i++){ const x=i*180-off+90; ctx.fillStyle='rgba(230,234,242,.92)'; ctx.fillRect(x,top,16,bot-top); ctx.fillStyle='#aab1bf'; for(let y=top+4;y<bot;y+=6) ctx.fillRect(x,y,16,1); }
}
export function drawBoards(cam,y,h,ppm){
  ctx.fillStyle=INK; ctx.fillRect(0,y,LW,h);
  const bw=8;
  for(let i=Math.floor(cam/bw)-1;i<=Math.floor(cam/bw)+Math.ceil(LW/(bw*ppm))+1;i++){
    const [bg,fg,word]=BOARDS[((i%BOARDS.length)+BOARDS.length)%BOARDS.length], x=(i*bw-cam)*ppm+1;
    ctx.fillStyle=bg; ctx.fillRect(x,y+2,bw*ppm-2,h-4);
    ctx.font=`${Math.round(h*.68)}px Bangers, Impact, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=fg; ctx.fillText(word,x+(bw*ppm-2)/2,y+h/2+1,bw*ppm-10);
  }
}
export function drawBottomAds(){
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,300,LW,20);
  const n=Math.max(1,Math.floor((LW-40)/96)), bw=(LW-40)/n;
  for(let i=0;i<n;i++){ const [bg,fg,w]=BOARDS[(i+2)%BOARDS.length]; const x=40+i*bw; ctx.fillStyle=bg; ctx.fillRect(x,302,bw-4,16); ctx.font='12px Bangers, Impact, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=fg; ctx.fillText(w,x+(bw-4)/2,310.5); }
  ctx.fillStyle='#e8262d'; ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(18,304,13,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // pause: two bars
  ctx.fillStyle='#fff'; ctx.fillRect(12.5,298,4,12); ctx.fillRect(19.5,298,4,12);
}
export function hurdle(px,py,s,down){ ctx.save(); ctx.translate(px,py); if(down) ctx.rotate(1.25);
  ctx.lineCap='round'; ctx.strokeStyle=INK; ctx.lineWidth=Math.max(2.5,s*.07); ctx.beginPath(); ctx.moveTo(-.55*s,0); ctx.lineTo(0,0); ctx.lineTo(0,-.95*s); ctx.stroke();
  ctx.strokeStyle='#f4f4f4'; ctx.lineWidth=Math.max(1.2,s*.04); ctx.stroke();
  const bw=.14*s, bh=.22*s; ctx.fillStyle='#fff'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.fillRect(-bw/2,-.95*s-bh,bw,bh); ctx.fillStyle='#e8262d'; ctx.fillRect(-bw/2,-.95*s-bh*.66,bw,bh*.33); ctx.strokeRect(-bw/2,-.95*s-bh,bw,bh);
  ctx.restore(); }
export function shadow(px,py,alt,s){ ctx.fillStyle='rgba(0,0,40,.25)'; ctx.beginPath(); ctx.ellipse(px+.1*s,py+1.5,Math.max(3,(.4-alt*.08)*s),.08*s,0,0,Math.PI*2); ctx.fill(); }
export function flag(x,y,col,letter){ ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-22); ctx.stroke();
  ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(x,y-22); ctx.lineTo(x+13,y-18); ctx.lineTo(x,y-13); ctx.closePath(); ctx.fill(); ctx.stroke(); if(letter) txt(letter,x+4.5,y-17.5,INK,8,{stroke:null}); }
export function upright(x,y,s){ ctx.fillStyle='#ffcf1f'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.rect(x-2.5,y-7.2*s,5,7.2*s); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(x,y,9,3,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
// javelin centred at cx,cy, angle a (up is positive), len logical px long: the drawn javelin, or a vector one until it loads
export function javelin(cx,cy,a,len){
  if(JAV_ART.complete&&JAV_ART.naturalWidth){ const h=len*.034; ctx.save(); ctx.translate(cx,cy); ctx.rotate(-a); ctx.drawImage(JAV_ART,-len/2,-h/2,len,h); ctx.restore(); return; }
  const dx=Math.cos(a)*len/2, dy=-Math.sin(a)*len/2, w=2.4;
  ctx.lineCap='round'; ctx.strokeStyle=INK; ctx.lineWidth=w+2.5; ctx.beginPath(); ctx.moveTo(cx-dx,cy-dy); ctx.lineTo(cx+dx,cy+dy); ctx.stroke();
  ctx.strokeStyle='#f4f4f4'; ctx.lineWidth=w; ctx.stroke();
  ctx.strokeStyle='#e8262d'; ctx.lineWidth=w+1; ctx.beginPath(); ctx.moveTo(cx-dx*.05,cy-dy*.05); ctx.lineTo(cx+dx*.2,cy+dy*.2); ctx.stroke(); }
