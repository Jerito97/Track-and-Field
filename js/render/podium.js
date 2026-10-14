// Podium rendering
import {ctx,LH,LW} from '../canvas.js';
import {INK} from '../config.js';
import {drawChar} from '../draw/character.js';
import {POSE} from '../poses.js';
import {drawSprite} from '../rig.js';
import {ATH,G,S} from '../state.js';
import {drawBoards,drawStands} from './scenery.js';
import {txt} from './text.js';

export function drawPodium(){
  const p=S.podium;
  ctx.fillStyle='#bcd3ea'; ctx.fillRect(0,0,LW,LH);
  drawStands(0,20,150,1,S.clock); drawBoards(0,150,14,24);
  ctx.fillStyle='#8cc63f'; ctx.fillRect(0,164,LW,LH-164); for(let i=0;i<LW;i+=60){ ctx.fillStyle='#99d04a'; ctx.fillRect(i,164,30,LH-164); }
  const cx=LW/2, gy=262, s=34;
  const spots=[{dx:0,h:34},{dx:-62,h:22},{dx:62,h:12}];
  p.order.slice(3).forEach((a,i)=>drawChar(ctx,s*.85,cx+(i%2?1:-1)*(124+Math.floor(i/2)*34),gy+16,0,POSE.stand,a.C,false));
  [1,0,2].forEach(k=>{ const sp=spots[k]; ctx.fillStyle='#fff'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(cx+sp.dx-28,gy-sp.h,56,sp.h+12); ctx.fill(); ctx.stroke(); ctx.fillStyle='#e8262d'; ctx.fillRect(cx+sp.dx-28,gy-sp.h,56,5); txt(String(k+1),cx+sp.dx,gy-sp.h/2+7,'#e8262d',16,{stroke:null}); });
  [2,1,0].forEach((k,idx)=>{ const a=p.order[k]; if(!a) return; const sp=spots[k], shown=p.step>=idx+1;
    if(!(a.C.sprite&&drawSprite(shown?'cheer':'stand',cx+sp.dx,gy-sp.h))) drawChar(ctx,s,cx+sp.dx,gy-sp.h,0,shown?POSE.cheer:POSE.stand,a.C,false);
    if(shown){ ctx.fillStyle=['#ffd23a','#d9dde6','#e0975a'][k]; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(cx+sp.dx+2,gy-sp.h-1.02*s,5,0,Math.PI*2); ctx.fill(); ctx.stroke(); } });
  for(let i=0;i<LW/36;i++){ const x=18+i*36; ctx.fillStyle=INK; ctx.beginPath(); ctx.arc(x,314,10,Math.PI,0); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(x,305,11,3,0,0,Math.PI*2); ctx.fill(); ctx.fillRect(x-5,297,10,7); }
  ctx.fillStyle='#14284f'; ctx.fillRect(0,0,LW,20); txt('TORNEO',LW-8,11,'#e8262d',14,{align:'right',stroke:null});
  if(p.step>=1&&p.step<=3){ const k=3-p.step, a=p.order[k]; const names=['MEDALLA DE ORO','MEDALLA DE PLATA','MEDALLA DE BRONCE'];
    ctx.fillStyle='#e8262d'; ctx.fillRect(0,26,LW,40); txt(names[k],16,37,'#ffd23a',13,{align:'left',stroke:null});
    txt(a.me?'VOS':a.name.toUpperCase(),16,55,'#fff',19,{align:'left',stroke:null}); txt(String(G.total[ATH.indexOf(a)]||0),LW-16,47,'#fff',26,{align:'right',stroke:null}); }
  txt(p.step===0?'TOCÁ PARA VER EL PODIO':'TOCÁ PARA SEGUIR',LW/2,92,'#fff',16);
}
