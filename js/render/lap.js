// World record lap (see game/lap.js): stadium, the athlete running with a flag, confetti and the banner
import {ctx,LH,LW} from '../canvas.js';
import {INK} from '../config.js';
import {fmt} from '../game/scoring.js';
import {runPose} from '../poses.js';
import {drawAthlete} from '../rig.js';
import {ME,S} from '../state.js';
import {hash} from '../utils.js';
import {drawBackdrop,GRASS,GRASS_L,setTheme,TARTAN,TARTAN_D} from './scenery.js';
import {txt} from './text.js';

const CONF=['#ffd23a','#e8262d','#2f6fe0','#27c26a','#ffffff','#ff7a1a'];
export function drawLap(){
  const t=S.clock, L=S.lap; setTheme(false);
  ctx.fillStyle='#bcd3ea'; ctx.fillRect(0,0,LW,LH);
  // the crowd drifts by: the camera follows the runner
  drawBackdrop(t*40,0,170);
  ctx.fillStyle=GRASS; ctx.fillRect(0,170,LW,24); for(let x=-((t*120)%60);x<LW;x+=60){ ctx.fillStyle=GRASS_L; ctx.fillRect(x,170,30,24); }
  const TT=194; ctx.fillStyle=TARTAN; ctx.fillRect(0,TT,LW,LH-TT);
  for(let l=0;l<4;l++){ ctx.fillStyle=TARTAN_D; ctx.fillRect(0,TT+l*32+18,LW,14); ctx.fillStyle='#fff'; ctx.fillRect(0,TT+l*32,LW,2); }
  // lane markings going by
  for(let x=-((t*200)%120);x<LW;x+=120){ ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fillRect(x,TT+60,24,3); }
  // the runner: comes in from the left and stays a little left of the middle, flag up
  const px=Math.min(LW*.42,-40+t*260), feet=290, s=40;
  const fig=drawAthlete(ctx,s,px,feet,0,runPose(t*13,1),ME(),true);
  const hx=fig&&fig.hand?fig.hand[0]:px+10, hy=fig&&fig.hand?fig.hand[1]:feet-70;
  // the flag pole held up, the flag (your colour) waving behind, above the head
  const top=hy-100, fx=hx+4;
  ctx.strokeStyle=INK; ctx.lineWidth=3; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(hx-2,hy+12); ctx.lineTo(fx,top); ctx.stroke();
  const wave=k=>Math.sin(t*9-k*1.4)*4*k/4;
  ctx.fillStyle=ME().j; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(fx,top);
  for(let k=0;k<=4;k++) ctx.lineTo(fx-k*12,top+wave(k)); for(let k=4;k>=0;k--) ctx.lineTo(fx-k*12,top+28+wave(k)); ctx.closePath(); ctx.fill(); ctx.stroke();
  // confetti
  for(let i=0;i<70;i++){ const h=hash(i*13), x=(h*LW*1.3+t*(20+h*40))%(LW+40)-20, y=((hash(i*7)*LH+t*(60+hash(i*3)*70))%(LH+20))-10;
    ctx.save(); ctx.translate(x,y); ctx.rotate(t*3+i); ctx.fillStyle=CONF[i%CONF.length]; ctx.fillRect(-3,-1.5,6,3); ctx.restore(); }
  // banner
  const k=Math.min(1,t/.4), bw=LW*k;
  ctx.fillStyle='#e8262d'; ctx.fillRect(LW/2-bw/2,34,bw,66); ctx.fillStyle='#9a1218'; ctx.fillRect(LW/2-bw/2,96,bw,4);
  if(k>=1){ const pulse=1+Math.sin(t*6)*.04;
    txt('¡NUEVO RÉCORD MUNDIAL!',LW/2,56,'#ffd23a',Math.round(Math.min(30,LW/14)*pulse),{lw:4});
    txt(`${S.ev.name} · ${fmt(S.ev,L.mark)}`,LW/2,84,'#fff',18,{lw:3}); }
  if(t>1.2) txt('TOCÁ PARA SEGUIR',LW/2,124,'#fff',15);
}
