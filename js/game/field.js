// Field events: long jump, pole vault, javelin
import {cheer,noise,tone} from '../audio.js';
import {GRAV} from '../config.js';
import {POSE,runPose} from '../poses.js';
import {S} from '../state.js';
import {rec} from '../storage.js';
import {clamp,rand} from '../utils.js';
import {armsFor,bothCue,judge,pop} from './core.js';
import {startReplay} from './replay.js';

// pole vault (as in the original): the pole lowers by itself, timed so the star reaches its tip (in POLE_T s) about
// PV_REACH m before the box; press and hold both buttons when the star is at the tip to plant it (the closer, the
// higher), keep holding up the swing and let go when the star reaches the other end
const POLE_T=1.0, PV_REACH=3.5;
export const qOf=p=>p<=1?clamp(p,0,1):Math.max(0,1-(p-1)*5);
// long jump air push, by flight progress u (0 take-off .. 1 landing): best at the highest point (u .5, full marks
// within .44-.56), fading to nothing at .2 and .8
export const stretchQ=u=>Math.max(0,Math.min(1,1-(Math.abs(u-.5)-.06)/.24));
// distance without the air push, and what a perfect push adds (m)
const LJ_NOPUSH=-.6, LJ_PUSH=1.4;
// long jump: the front foot is about LJ_FOOT m ahead of the hip; it's the foot that must not pass the board
const LJ_FOOT=.35;
// where the athlete (hip) fouls: the foot reaching the board's edge (long jump), the line itself otherwise
const foulX=ev=>ev.kind==='lj'?ev.line-LJ_FOOT:ev.line;
export function updateField(dt){
  const ev=S.ev;
  if(S.phase==='ready'){ const k=armsFor(); S.pose=k==='jav'?{...POSE.stand,arms:[{a:-2.4,b:.55},POSE.stand.arms[1]]}:(k==='pole'?{...POSE.stand,arms:[{a:.9,b:1.3},{a:.6,b:1.5}]}:POSE.stand); return; }
  if(S.phase==='run'){
    if(ev.bands&&!S.prep&&ev.line-S.x<=ev.bands[0]){ S.prep=true; S.cue=null; tone(520,.06,'triangle',.04); }
    if(!S.zone&&ev.line-S.x<=ev.zone){
      S.zone=true; S.cue=null; tone(880,.08,'triangle',.05);
      S.pops.push({text:'¡PREPARATE!',t:0,dur:.8,col:'#ffd23a',sub:'',big:.6,small:true});
      if(ev.kind==='lj') bothCue();
      else if(ev.kind==='pv') S.meter={k:'pole',p:0,on:false,wasHeld:!!S.held2};
      else S.cue={type:'hold',t:0};
    }
    const sp=S.v;
    S.x+=sp*dt; S.legP+=sp*dt*2.4;
    if(S.zone&&ev.kind==='jav'){
      S.pose=S.meter?POSE.javBack:runPose(S.legP,Math.min(1,sp/4),'jav');
      if(S.meter){ S.meter.p+=dt/.7; if(S.meter.p>=1.2) javThrow(); }
    } else {
      S.pose=S.v>.2?runPose(S.legP,Math.min(1,S.v/4),armsFor()):S.pose;
      if(S.zone&&ev.kind==='pv'){ const m=S.meter, held=!!S.held2;
        if(!m.on&&ev.line-S.x<=PV_REACH+S.v*POLE_T){ m.on=true; S.cue={type:'both',hold:true,t:0}; tone(500,.06,'triangle',.04); }
        if(m.on){ m.p=Math.min(1.25,m.p+dt/POLE_T); if(held&&!m.wasHeld){ m.wasHeld=held; plantPole(); return; } }
        m.wasHeld=held; }
    }
    if(S.phase==='run'&&S.x>=foulX(ev)){ S.x=foulX(ev); fieldFoul(); }
    return;
  }
  if(S.phase==='act') updateAct(dt);
  else if(S.phase==='post'){ S.postT-=dt; if(S.postT<=0){ S.phase='idle'; startReplay(); } }
}
export function fieldFoul(){
  const ev=S.ev; S.cue=null; S.meter=null; S.foul=true; S.marks[0].push(null); tone(160,.45,'sawtooth',.06);
  if(ev.kind==='lj') S.pops.push({text:'¡PISASTE LA TABLA!',t:0,dur:.9,col:'#ff5a3c',sub:'',big:.6,small:true});
  S.act={k:ev.kind+'foul',t:0,v:S.v}; S.phase='act';
}
export function fieldAction(){
  const ev=S.ev, a=S.act;
  if(S.phase==='act'){
    if(a&&a.k==='lj'&&!a.tapped&&S.cueDelay<=0){ a.tapped=1; a.tapU=Math.min(1,a.t/a.T); a.q2=stretchQ(a.tapU); S.cue=null; tone(700,.1,'triangle',.05); judge(a.q2);
      a.mark=Math.max(.5,a.base+LJ_NOPUSH+LJ_PUSH*a.q2); a.xs=S.x; a.x1=ev.line+a.mark; }
    return;
  }
  if(S.phase!=='run'||!S.zone) return;
  S.cue=null;
  const d=Math.max(0,foulX(ev)-S.x), v=S.v;  // foot to the board
  if(ev.kind==='lj'){
    const base=Math.max(.5,.80*v-.25*d), T=.6+.03*v, h=.45+.055*v, mark=Math.max(.5,base+LJ_NOPUSH);
    S.act={k:'lj',t:0,T,x0:S.x,x1:ev.line+mark,base,mark,h,q2:0};
    // footprint where the foot took off (stays for the next rounds, see prints)
    S.print=S.x+LJ_FOOT; S.prints=(S.prints||[]).filter(p=>p.round!==S.round).concat({x:S.print,round:S.round});
    judge(1-d/ev.zone); noise(.12,.15); S.cueDelay=.12;
  }
  S.phase='act';
}
// pole vault: the pole goes into the box; how far down it was (the star on it) sets the height
export function plantPole(){
  const v=S.v, q1=qOf(S.meter.p); S.meter.hit=S.meter.p; judge(q1); S.cue=null;
  S.act={k:'pv',t:0,q1,v,pushed:0,stage:'plant',H:1.0+.44*v*(.72+.28*q1)}; tone(300,.15,'triangle',.05);
  S.phase='act';
}
export function javThrow(){
  if(S.phase!=='run'||!S.meter) return;
  const q=S.meter.p>=1.2?0:qOf(S.meter.p); S.meter.hit=S.meter.p; judge(q);
  S.act={k:'jav',t:.15,R:Math.max(8,9.0*S.v*(.72+.28*q))}; S.jv={held:true,x:S.x,y:1.9,a:.55}; S.v=Math.min(S.v,5.5); S.phase='act'; S.cue=null;
  setTimeout(()=>{ if(S&&S.meter&&S.meter.k==='jav') S.meter=null; },300);
}
export function updateAct(dt){
  const ev=S.ev, a=S.act; a.t+=dt;
  if(a.k==='lj'){
    if(S.cueDelay>0){ S.cueDelay-=dt; if(S.cueDelay<=0&&!a.tapped) bothCue(); }
    const u=Math.min(1,a.t/a.T);
    // after the air push the jumper speeds forward to the new mark and gets a little lift
    if(a.tapU!=null&&a.tapU<1){ const k=(u-a.tapU)/(1-a.tapU); S.x=a.xs+(a.x1-a.xs)*k; S.y=4*a.h*u*(1-u)+.35*a.q2*Math.sin(Math.PI*k); }
    else { S.x=a.x0+(a.x1-a.x0)*u; S.y=4*a.h*u*(1-u); } S.pose=u<.15?POSE.hurdle:(a.tapped?{...POSE.ljAir,legs:[{a:1.75,b:.05},{a:1.65,b:.1}]}:POSE.ljAir);
    if(u>=1&&!a.tapped){ a.tapped=1; a.q2=0; S.cue=null; judge(0); }
    if(u>=1){ S.y=0; S.pose=a.q2>.5?POSE.sit:POSE.lie; S.landX=S.x; sand(S.x); S.meter=null; landed(Math.floor(a.mark*100)/100); }
  } else if(a.k==='ljfoul'){
    // stepped over the board: stumbles to a stop just past it (not into the sand)
    S.x+=a.v*Math.max(0,1-a.t*8)*dt; S.pose=POSE.stumble;
    if(a.t>.7){ S.pose=POSE.sit; landed(null); }
  } else if(a.k==='pv'){
    if(a.stage==='plant'){ S.x+=S.v*dt*.8; S.pose=POSE.pvPlant; if(a.t>.22){ a.stage='rise'; a.t=0; a.xs=S.x; a.Trise=.75+a.H*.035; S.meter={k:'rise',p:0}; S.cue={type:'both',hold:true,release:true,t:0}; } }
    else if(a.stage==='rise'){
      const u=Math.min(1,a.t/a.Trise), e=1-Math.pow(1-u,2);
      S.x=a.xs+(ev.line+.25-a.xs)*e; S.y=(a.H-.9)*e; S.rot=-Math.PI*e*.95; S.pose=POSE.pvSwing;
      // let go of both buttons at the top (star at the end of the pole); holding on too long = no push
      if(S.meter&&S.meter.k==='rise'&&!a.pushed){ S.meter.p=a.t/(a.Trise*.7);  // star at the end in ~.7 s
        if(!S.held2||S.meter.p>1.25){ a.pushed=1; a.q2=S.meter.p>1.25?0:qOf(S.meter.p); S.meter.hit=S.meter.p; S.cue=null; tone(700,.1,'triangle',.05); judge(a.q2); } }
      if(a.pushed&&a.t>=Math.max(a.Trise*.7,.5)||a.t>a.Trise+.35){ S.cue=null; S.meter=null; a.stage='over'; a.t=0; a.yo=S.y; a.bonus=.7*(a.q2||0)-.25; }
    } else if(a.stage==='over'){
      const u=Math.min(1,a.t/.45); S.y=a.yo+Math.max(0,a.bonus+.4)*Math.sin(u*Math.PI/2); S.x+=dt*1.2; S.rot=-Math.PI*.95-Math.PI*.55*u; S.pose=POSE.pvOver;
      if(u>=1){ a.stage='fall'; a.t=0; a.vy=0; a.peak=S.y; }
    } else if(a.stage==='fall'){
      a.vy+=GRAV*dt; S.y-=a.vy*dt; S.x+=dt*.8; S.rot=-Math.PI*1.5; S.pose=POSE.pvOver;
      if(S.y<=.85){ S.y=.85; S.rot=0; S.pose=POSE.lie; const m=Math.floor((a.H+a.bonus+.1)*100)/100; S.bar=m; landed(m); }
    }
  } else if(a.k==='pvfoul'){
    S.x+=a.v*Math.max(0,1-a.t*1.2)*dt; S.pose=POSE.stumble; if(S.x>ev.line+.6) S.y=Math.min(.85,S.y+dt*3);
    if(a.t>1){ S.pose=POSE.lie; landed(null); }
  } else if(a.k==='jav'){
    if(S.jv.held){
      S.x+=S.v*dt; S.pose=a.t<.22?POSE.javBack:POSE.javRel;
      if(S.x>=ev.line){ S.x=ev.line; S.jv=null; S.act=null; S.phase='run'; fieldFoul(); return; }
      if(a.t>=.3){ S.jv.held=false; a.T=1.5+.045*a.R; S.jv.x=S.x+.4; S.jv.x0=S.jv.x; S.jv.t=0; noise(.25,.12,2500); tone(300,.3,'triangle',.04,.5); }
    } else {
      S.v=Math.max(0,S.v-S.v*2*dt); S.x+=S.v*dt; S.pose=POSE.javRel;  // ~3.5 m forward after letting go
      // still carried forward after letting go: crossing the line makes the throw a foul (shown when it lands)
      if(!a.over&&S.x>ev.line){ a.over=true; tone(160,.45,'sawtooth',.06); S.pops.push({text:'¡PISASTE!',t:0,dur:1,col:'#ff5a3c',sub:'',big:.6,small:true}); }
      if(!S.jv.stuck){
        S.jv.t+=dt; const u=Math.min(1,S.jv.t/a.T), top=a.R*.16;
        S.jv.x=S.jv.x0+a.R*u; S.jv.y=1.9*(1-u)+4*top*u*(1-u); S.jv.a=Math.atan2(-1.9+4*top*(1-2*u),a.R);
        S.ppm+=(16-S.ppm)*Math.min(1,dt*1.6);
        if(u>=1){ S.jv.stuck=true; S.jv.y=0; S.jv.a=Math.min(S.jv.a,-.5); S.landX=S.jv.x; tone(140,.12,'square',.05); landed(a.over?null:Math.floor((S.jv.x-ev.line)*100)/100); }
      }
    }
  } else if(a.k==='javfoul'){ S.v=Math.max(0,S.v-S.v*3*dt); S.x+=S.v*dt; S.pose=POSE.stumble; if(a.t>.8) landed(null); }
}
export function landed(mark){
  const ev=S.ev; if(S.phase!=='act') return;
  if(!S.foul) S.marks[0].push(mark);
  S.mark=mark; S.phase='post'; S.postT=2.0;
  if(mark==null){ pop('NULO',{col:'#ff5a3c',dur:2,big:1.2,sub:'¡AY!'}); tone(130,.4,'sawtooth',.05); }
  else {
    // the record is only saved when the event ends, so earlier attempts of this event count too
    const prev=S.marks[0].slice(0,-1).filter(m=>m!=null), best=Math.max(rec[ev.id]??-Infinity,...prev);
    const isRec=mark>best;
    pop(mark.toFixed(2)+' m',{dur:2,big:1.1,sub:isRec?'¡NUEVO RÉCORD!':(!prev.length||mark>Math.max(...prev)?'¡GENIAL!':'')});
    cheer();
  }
}
export function sand(x){ for(let i=0;i<14;i++) S.fx.push({k:'sand',wx:x+rand(-.3,.5),wy:rand(0,.2),vx:rand(-1.5,2.5),vy:rand(1,3.5),t:0}); }
