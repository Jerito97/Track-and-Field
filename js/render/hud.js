// HUD: header bar, cue buttons, popups, meters
import {secs} from '../utils.js';
import {ctx,LH,LW} from '../canvas.js';
import {INK} from '../config.js';
import {OVER,PERFECT,pedalP} from '../game/cycle.js';
import {CUEPOS,NUMPOS} from '../game/core.js';
import {ME,S} from '../state.js';
import {txt} from './text.js';

export function drawHud(V){
  const ev=V.ev;
  ctx.fillStyle='#14284f'; ctx.fillRect(0,0,LW,20);
  ctx.fillStyle='#e8262d'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(108,0); ctx.lineTo(100,20); ctx.lineTo(0,20); ctx.closePath(); ctx.fill();
  txt((ME().name||'Jugador').toUpperCase(),8,11,'#fff',14,{align:'left',stroke:null});
  if(ev.type==='sprint'){ const t=S.finished?S.final:S.t+(S.pen||0); ctx.fillStyle='#e8262d'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.rect(LW-62,2,58,16); ctx.fill(); ctx.stroke(); txt(secs(t||0),LW-33,10.5,'#fff',14,{stroke:null}); }
  else txt(`RONDA ${S.round}/3`,LW-8,11,'#fff',14,{align:'right',stroke:null});
  if(!V.replay&&S.cue) drawCue(S.cue);
  if(S.demo&&!V.replay) drawDemo();
  if(S.phase==='ready'&&!V.replay){ cueCircle(LW/2,150,'#ff4d2e',''); txt('TOCÁ PARA EMPEZAR',LW/2,196,'#fff',16); }
  S.fx.forEach(f=>{ if(f.k==='ring'){ const k=f.t/.45; ctx.strokeStyle=`rgba(255,255,255,${1-k})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(f.x,f.y,28+k*16,0,Math.PI*2); ctx.stroke(); }
    else if(f.k==='x'){ const k=f.t/.45; ctx.save(); ctx.globalAlpha=1-k; ctx.translate(f.x,f.y); ctx.strokeStyle=INK; ctx.lineWidth=9; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-14,-14); ctx.lineTo(14,14); ctx.moveTo(14,-14); ctx.lineTo(-14,14); ctx.stroke(); ctx.strokeStyle='#e8262d'; ctx.lineWidth=5.5; ctx.stroke(); ctx.restore(); } });
  S.pops.forEach(p=>{ const k=Math.min(1,p.t/.15), sc=(.6+.4*k)*p.big, a=p.hold?1:Math.min(1,(p.dur-p.t)/.3);
    ctx.save(); ctx.globalAlpha=Math.max(0,a); ctx.translate(LW/2,p.small?52:(ev.hurdles&&S.phase!=='wait'?205:94)); /* hurdles: big popups below the raised number buttons */ ctx.rotate(-.05); ctx.scale(sc,sc);
    txt(p.text,0,0,p.col,40,{lw:6}); if(p.sub) txt(p.sub,0,32,'#ffd23a',20,{lw:4}); ctx.restore(); });
  if(V.replay){ txt('REPETICIÓN',LW/2,36,'#fff',20); ctx.fillStyle=INK; ctx.beginPath(); ctx.arc(LW-22,282,13,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(LW-29,276); ctx.lineTo(LW-22,282); ctx.lineTo(LW-29,288); ctx.closePath(); ctx.moveTo(LW-22,276); ctx.lineTo(LW-15,282); ctx.lineTo(LW-22,288); ctx.closePath(); ctx.fill(); }
}
// where the star has to get to: a small ring with a dot in the middle (aim for the dot)
export function target(x,y){ ctx.lineWidth=3; ctx.strokeStyle='rgba(14,26,52,.7)'; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth=1.6; ctx.strokeStyle='#fff'; ctx.stroke(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,1.6,0,Math.PI*2); ctx.fill(); }
// the star: small and steady (a slow turn, a soft glow), yellow, brighter right at the end (p .9-1.05); spark: a faint
// halo while it runs
export function drawStar(x,y,r,p,spark){
  const good=p>=.9&&p<=1.05; r*=.62;
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle=good?'rgba(255,240,120,.6)':spark?'rgba(255,255,255,.35)':'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(0,0,r*1.45,0,Math.PI*2); ctx.fill();
  ctx.rotate(S.clock*1.5); ctx.beginPath();
  for(let i=0;i<10;i++){ const rr=i%2?r*.45:r, a=-Math.PI/2+i*Math.PI/5; ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); }
  ctx.closePath(); ctx.fillStyle=good?'#fff36b':'#ffd23a'; ctx.strokeStyle=INK; ctx.lineWidth=1.2; ctx.fill(); ctx.stroke(); ctx.restore();
}
export const CUECOL={'#2fd166':'#139a44','#ff4d2e':'#b8200f','#2f7fd6':'#1b4f9c','#ff8a1e':'#c4520a'};
export function cueCircle(x,y,col,label){
  const K=1.45;
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(x+2,y+3.5,20*K,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=INK; ctx.beginPath(); ctx.arc(x,y,20*K,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,18*K,0,Math.PI*2); ctx.fill();
  const g=ctx.createRadialGradient(x-7,y-9,2,x,y,16*K); g.addColorStop(0,'#fff'); g.addColorStop(.25,col); g.addColorStop(1,CUECOL[col]);
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,15.5*K,0,Math.PI*2); ctx.fill();
  if(label) txt(label,x,y+1,'#fff',28,{lw:3});
}
export function drawCue(cue){
  const pulse=1+.06*Math.sin(S.clock*14);
  const at=(p,col,label)=>{ const [x,y]=CUEPOS[p](); ctx.save(); ctx.translate(x,y); ctx.scale(pulse,pulse); cueCircle(0,0,col,label); ctx.restore(); };
  if(cue.type==='side') at(cue.side,'#2fd166','');
  else if(cue.type==='foot') at(cue.side,'#ff8a1e','');
  else if(cue.type==='rush'){ ['L','R'].forEach(p=>at(p,'#ff4d2e','')); const k=1+.12*Math.abs(Math.sin(S.clock*18)); ctx.save(); ctx.translate(LW/2,104); ctx.scale(k,k); txt('¡TOCÁ RÁPIDO!',0,0,'#ffd23a',24,{lw:5}); ctx.restore(); }
  else if(cue.type==='hamhold'){ ['L','R'].forEach(p=>at(p,'#ff8a1e','')); if(!S.held2) txt(cue.label||'MANTENÉ LOS DOS',LW/2,104,'#fff',18,{lw:4}); }
  else if(cue.type==='both'&&cue.hold){ ['L','R'].forEach(p=>at(p,'#ff8a1e','')); txt(cue.release?'SOLTÁ EN LA PUNTA':'APRETÁ Y MANTENÉ EN LA PUNTA',LW/2,150,'#fff',18,{lw:4}); }
  else if(cue.type==='both') ['L','R'].forEach(p=>{ if(!(S.pend&&S.pend.side===p)) at(p,'#ff4d2e',''); });
  else if(cue.type==='pedal'){ const [x,y]=CUEPOS[cue.side](), p=pedalP();
    // the button (orange: hold it), and round it the ring filling from 12 o'clock: red, yellow, green close to full;
    // past it, red (the stroke is only half one)
    ctx.save(); ctx.translate(x,y); if(!p) ctx.scale(pulse,pulse); cueCircle(0,0,p>1?'#ff4d2e':'#ff8a1e',''); ctx.restore();
    const R=37, a0=-Math.PI/2;
    ctx.lineCap='butt'; ctx.lineWidth=9; ctx.strokeStyle='rgba(14,26,52,.75)'; ctx.beginPath(); ctx.arc(x,y,R,0,Math.PI*2); ctx.stroke();
    if(p>0){ ctx.strokeStyle=p>1?'#ff3b30':p>=PERFECT?'#2fd166':p>=.86?'#9be22e':p>=.65?'#ffd23a':'#ff8a1e'; ctx.lineWidth=7;
      ctx.beginPath(); ctx.arc(x,y,R,a0,a0+Math.PI*2*Math.min(p,OVER)); ctx.stroke(); }
    // the mark at 12 o'clock: let go there
    ctx.fillStyle='#fff'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x-6,y-R-10); ctx.lineTo(x+6,y-R-10); ctx.lineTo(x,y-R+1); ctx.closePath(); ctx.fill(); ctx.stroke();
    if(!p) txt('MANTENÉ',x,y+R+14,'#fff',12,{lw:3}); }
  else if(cue.type==='hold'){ ['L','R'].forEach(p=>at(p,'#ff4d2e','')); txt('MANTENÉ LOS DOS',LW/2,150,'#fff',18,{lw:4}); }
  else if(cue.type==='num'){ // the three columns, faintly
    ctx.save(); ctx.setLineDash([7,6]); ctx.lineCap='round';
    [LW/3,LW*2/3].forEach(x=>{ ctx.beginPath(); ctx.moveTo(x,58); ctx.lineTo(x,160); ctx.strokeStyle='rgba(14,26,52,.7)'; ctx.lineWidth=5; ctx.stroke(); ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke(); }); ctx.restore();
    cue.order.forEach((p,i)=>{ if(i>=cue.next){ const [x,y]=NUMPOS[p](); cueCircle(x,y,'#2f7fd6',String(i+1)); } }); }
}
// the tutorial: a finger on each tap (and on both buttons while holding), what to do now at the bottom, how to leave
function drawDemo(){
  const finger=(x,y,k)=>{ ctx.save(); ctx.globalAlpha=k; ctx.fillStyle='rgba(255,255,255,.85)'; ctx.strokeStyle=INK; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(x+10,y+12,13,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x+4,y+14,13,34,6); ctx.fill(); ctx.stroke(); ctx.restore(); };
  S.fingers.forEach(f=>finger(f.x,f.y,1-f.t/.35));
  if(S.held2) [CUEPOS.L(),CUEPOS.R()].forEach(([x,y])=>finger(x,y,1));
  txt('CÓMO SE JUEGA · TOCÁ LA PANTALLA PARA SALIR',LW/2,32,'#ffd23a',12,{lw:3});
  const t=S.demoCaption; if(!t) return;
  // as big as fits in the width
  let size=18; ctx.font=`${size}px Bangers, Impact, sans-serif`; while(size>10&&ctx.measureText(t).width>LW-44){ size--; ctx.font=`${size}px Bangers, Impact, sans-serif`; }
  const w=Math.min(LW-12,ctx.measureText(t).width+30), y=LH-48;
  ctx.fillStyle='rgba(14,26,52,.88)'; ctx.beginPath(); ctx.roundRect((LW-w)/2,y-16,w,32,10); ctx.fill();
  ctx.strokeStyle='#ffd23a'; ctx.lineWidth=2; ctx.stroke();
  txt(t,LW/2,y,'#fff',size,{lw:3});
}
