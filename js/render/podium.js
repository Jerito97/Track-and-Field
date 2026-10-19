// Podium rendering
import {ctx,LH,LW} from '../canvas.js';
import {INK} from '../config.js';
import {POSE} from '../poses.js';
import {animReady,animScale,drawAnim,drawAthlete,drawSprite} from '../rig.js';
import {ATH,G,S} from '../state.js';
import {podiumPose} from '../stick.js';
import {STYLE} from '../storage.js';
import {drawBackdrop,drawBoards,drawStands,setTheme,GRASS,GRASS_L,TARTAN,TARTAN_D} from './scenery.js';
import {txt} from './text.js';

// front view from the drawn celebration (frame 0 standing, 3 arm up) when loaded; s as in drawChar
function podiumAthlete(C,s,x,feet,up){
  if(animReady(C,'cheer')){ drawAnim(ctx,C,'cheer',up?3:0,x,feet,animScale(C,s*2.05)); return true; }
  drawAthlete(ctx,s,x,feet,0,STYLE.stick?podiumPose(up,performance.now()/1000,x*.05):up?POSE.cheer:POSE.stand,C,false); return false;
}
export function drawPodium(){
  const p=S.podium;
  setTheme(false); ctx.fillStyle='#bcd3ea'; ctx.fillRect(0,0,LW,LH);
  // the grandstand picture drifting slowly, a strip of grass and the podium on the red track (as in the illustration)
  if(!drawBackdrop(S.clock*6,0,164)){ drawStands(0,20,150,1,S.clock); drawBoards(0,150,14,24); }
  ctx.fillStyle=GRASS; ctx.fillRect(0,164,LW,34); for(let i=0;i<LW;i+=60){ ctx.fillStyle=GRASS_L; ctx.fillRect(i,164,30,34); }
  ctx.fillStyle='#fff'; ctx.fillRect(0,198,LW,2); ctx.fillStyle=TARTAN; ctx.fillRect(0,200,LW,LH-200);
  for(let y=200;y<LH;y+=30){ ctx.fillStyle=TARTAN_D; ctx.fillRect(0,y+16,LW,14); ctx.fillStyle='#fff'; ctx.fillRect(0,y+29,LW,1.5); }
  const cx=LW/2, gy=262, s=34;
  const spots=[{dx:0,h:34},{dx:-62,h:22},{dx:62,h:12}];
  p.order.slice(3).forEach((a,i)=>podiumAthlete(a.C,s*.85,cx+(i%2?1:-1)*(124+Math.floor(i/2)*34),gy+16,false));
  // steps in gold, silver and bronze, a lighter top and the number
  const STEP=[['#f2c33a','#ffe07a','#a8740c'],['#c9ced8','#e8ebf0','#6f7686'],['#c98a4b','#e3a86c','#7a4a1e']];
  [1,0,2].forEach(k=>{ const sp=spots[k], [c,top,dark]=STEP[k]; ctx.fillStyle=c; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(cx+sp.dx-28,gy-sp.h,56,sp.h+12); ctx.fill(); ctx.stroke();
    ctx.fillStyle=top; ctx.fillRect(cx+sp.dx-27,gy-sp.h+1,54,5); txt(String(k+1),cx+sp.dx,gy-sp.h/2+7,dark,16,{stroke:null}); });
  [2,1,0].forEach((k,idx)=>{ const a=p.order[k]; if(!a) return; const sp=spots[k], shown=p.step>=idx+1;
    let front=false;
    if(!(a.C.sprite&&drawSprite(shown?'cheer':'stand',cx+sp.dx,gy-sp.h))) front=podiumAthlete(a.C,s,cx+sp.dx,gy-sp.h,shown);
    if(shown){ ctx.fillStyle=['#ffd23a','#d9dde6','#e0975a'][k]; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(cx+sp.dx+(front?0:2),gy-sp.h-(front||STYLE.stick?1.3:1.02)*s,5,0,Math.PI*2); ctx.fill(); ctx.stroke(); } });
  ctx.fillStyle='#14284f'; ctx.fillRect(0,0,LW,20); txt('TORNEO',LW-8,11,'#e8262d',14,{align:'right',stroke:null});
  if(p.step>=1&&p.step<=3){ const k=3-p.step, a=p.order[k]; const names=['MEDALLA DE ORO','MEDALLA DE PLATA','MEDALLA DE BRONCE'];
    ctx.fillStyle='#e8262d'; ctx.fillRect(0,26,LW,40); txt(names[k],16,37,'#ffd23a',13,{align:'left',stroke:null});
    txt(a.me?'VOS':a.name.toUpperCase(),16,55,'#fff',19,{align:'left',stroke:null}); txt(String(G.total[ATH.indexOf(a)]||0),LW-16,47,'#fff',26,{align:'right',stroke:null}); }
  txt(p.step===0?'TOCÁ PARA VER EL PODIO':'TOCÁ PARA SEGUIR',LW/2,92,'#fff',16);
}
