// Event setup, cues, popups and the per-frame update dispatcher
import {tone} from '../audio.js';
import {LW} from '../canvas.js';
import {evAt} from '../config.js';
import {POSE,runPose} from '../poses.js';
import {ATH,S,setS,setScreen} from '../state.js';
import {loadTop} from '../ui/board.js';
import {hideOv} from '../ui/screens.js';
import {clamp,rand} from '../utils.js';
import {demoStep} from './demo.js';
import {updateField} from './field.js';
import {snap,updateReplay} from './replay.js';
import {finishSprintEvent,resetRivals,rivalStep,updateSprint} from './sprint.js';
import {hipX,isBack} from './swim.js';

export function newEvent(idx){
  const ev=evAt(idx);
  // the world top 10 as it is before you play, ready for the end (a cold server can take seconds to answer then)
  if(!ev.beta) ['','year','month'].forEach(sp=>loadTop(ev.id,false,null,sp).catch(()=>{}));
  setS({ev,phase:'idle',t:0,x:0,y:0,v:0,legP:0,cam:-6,camY:0,ppm:ppmOf(ev),
     cue:null,last:null,streak:0,pend:null,fx:[],pops:[],clock:0,rot:0,fs:0,
     round:1,marks:ATH.map(()=>[]),snaps:[],replay:null});
  if(ev.type==='sprint'){
    S.plLane=3;
    const lanes=ATH.length===2?[2]:[0,1,2,4,5];  // a single rival runs right next to you
    S.rivals=ATH.filter(a=>!a.me).map((a,i)=>({a,lane:lanes[i]}));
  }
}
export function resetAttempt(){
  const ev=S.ev;
  Object.assign(S,{t:0,x:0,y:0,v:0,legP:0,cue:null,last:null,streak:0,pend:null,rot:0,turn:0,pose:null,
    hk:0,armed:false,air:0,airT:.4,knocked:new Set(),stumble:0,finished:false,final:null,after:0,nextBoth:0,smoke:null,
    act:null,jv:null,landX:null,print:null,prints:[],bar:null,zone:false,prep:false,meter:null,dipCued:false,dipT:0,mark:undefined,foul:false,snaps:[],snapAcc:0,replay:null,peak:0,slips:0,ppm:ppmOf(ev),camY:0,dip:0,dive:null,turning:null,turned:false,turnCued:false,prepWall:false,prepTouch:false,beat:null,fly:null,strokeAt:null,strokeQ:0,strokePh:0,va:null});
  S.cam=camTo();
}
// camera zoom (logical px per metre): sprints, field events
export const SPRINT_PPM=29, FIELD_PPM=41, SWIM_PPM=24;
const ppmOf=ev=>ev.swim?SWIM_PPM:ev.type==='sprint'?SPRINT_PPM:FIELD_PPM;
export const camLead=()=>LW*.36/S.ppm;
// where the camera goes: the athlete a third of the way in (swimming: in the pool, and from the other side on the way back)
const camTo=()=>S.ev.swim?hipX(S.ev,S.x)-(isBack(S.ev,S.x)?LW-LW*.36:LW*.36)/S.ppm:S.x-camLead();
export const CUEPOS={L:()=>[64,150],C:()=>[LW/2,150],R:()=>[LW-64,150]};
// hurdle numbers: the screen in three equal columns, a number in the middle of each (a tap anywhere in a column is
// that number); NUM_DX = gap between neighbours (logical px)
export const NUM_DX=()=>LW/3, NUM_Y=108;
export const NUMPOS={L:()=>[LW/2-NUM_DX(),NUM_Y],C:()=>[LW/2,NUM_Y],R:()=>[LW/2+NUM_DX(),NUM_Y]};
export const cuePos=p=>(S.cue&&S.cue.type==='num'?NUMPOS:CUEPOS)[p]();
export function sideCue(){
  let n; if(S.streak>=2) n=S.last==='L'?'R':'L'; else n=Math.random()<.5?'L':'R';
  S.streak=(n===S.last)?S.streak+1:1; S.last=n; S.cue={type:'side',side:n,t:0};
}
export function numCue(){ const p=['L','C','R'].sort(()=>Math.random()-.5); S.cue={type:'num',order:p,next:0,t:0}; }
// seconds since both buttons were pressed or let go (between frames: the game notices it on the next one), at most 0.05
export const sinceHold=()=>S.held2At==null?0:Math.max(0,Math.min(.05,(performance.now()-S.held2At)/1000));
export function bothCue(){ S.cue={type:'both',t:0}; S.pend=null; tone(760,.05,'triangle',.03); }
export function addRing(pos){ const [x,y]=cuePos(pos); S.fx.push({k:'ring',x,y,t:0}); }
export function addX(pos){ const [x,y]=cuePos(pos); S.fx.push({k:'x',x,y,t:0}); }
export function pop(text,o={}){ S.pops.push({text,t:0,dur:o.dur||1.4,col:o.col||'#fff',sub:o.sub||'',big:o.big||1,hold:!!o.hold}); }

export const gS=v=>.42/(1+v/10)+1.3*Math.exp(-v/3);
export const gH=v=>1.0/(1+v/6)+2.0*Math.exp(-v/3);
// hurdles: quality of a 1-2-3 combo from the time between the first and third tap
// (0.35 s -> 1.22, 0.55 s -> 1.0, 1 s -> 0.5, 1.3 s or slower -> 0.25)
export const COMBO_K=2.1; // boost of a perfect combo, in single-tap units
export const comboQ=dt=>clamp(1+(.55-dt)*1.1,.25,1.25);
export function bad(){ S.v*=.86; tone(120,.12,'sawtooth',.05); }
// hurdles: a wrong number only costs a little at once; the rest of the 14% only if that hurdle gets hit (sprint.js)
export const HURDLE_SLIP=.97;
export function badNum(){ S.v*=HURDLE_SLIP; S.slips=(S.slips||0)+1; tone(120,.12,'sawtooth',.05); }
// recovery after a mistake: below the best speed of this run, good taps add more (the further below, the more), up to
// that best speed and never past it; once back there it's the normal gain again
export function speedUp(gain){
  const peak=S.peak||0, deficit=peak>0?Math.max(0,(peak-S.v)/peak):0, v=S.v+gain;
  S.v=deficit>0?Math.max(v,Math.min(peak,S.v+gain*Math.min(3,1+12*deficit))):v;
  S.peak=Math.max(peak,S.v);
}
export function startPlay(){
  setScreen('play'); hideOv(); resetAttempt(); S.pops=[]; S.fx=[];
  if(S.ev.type==='sprint'){ S.phase='set'; S.phaseT=0; S.setStage=-1; S.hold=rand(.9,1.8); resetRivals(); }
  else { S.phase='ready'; S.phaseT=0; pop(`RONDA ${S.round}`,{dur:1.6,col:'#ffd23a'}); }
  S.cam=camTo();
}
export function startRun(){ S.phase='run'; S.phaseT=0; sideCue(); tone(600,.06,'triangle',.04); }
export function falseStart(){
  S.fs++; tone(160,.45,'sawtooth',.06); S.pops=[];
  S.phase='wait'; S.wait=1.8;
  if(S.fs>=2){ pop('¡DESCALIFICADO!',{col:'#ff5a3c',sub:'Dos salidas en falso',dur:1.8}); S.next=()=>{ S.final=null; finishSprintEvent(); }; }
  else { pop('¡SALIDA EN FALSO!',{col:'#ff5a3c',sub:'Una más y quedás afuera',dur:1.8}); S.next=()=>startPlay(); }
}
export function update(dt){
  S.clock+=dt; S.phaseT=(S.phaseT||0)+dt;
  S.fx=S.fx.filter(f=>(f.t+=dt)<(f.k==='sand'?1.2:.45));
  S.pops=S.pops.filter(p=>{ p.t+=dt; return p.hold||p.t<p.dur; });
  if(S.phase==='podium'||S.phase==='lap') return;
  if(S.cue) S.cue.t+=dt;
  if(S.pend&&S.clock-S.pend.t>.35){ S.pend=null; }
  if(S.replay){ updateReplay(dt); return; }
  if(S.demo) demoStep(dt);
  if(S.phase==='wait'){ coast(dt); if(S.ev.type==='sprint'&&S.rivals) S.rivals.forEach(r=>rivalStep(r,dt)); S.wait-=dt; if(S.wait<=0){ const n=S.next; S.next=null; S.phase='idle'; n&&n(); } }
  else if(S.ev.type==='sprint') updateSprint(dt);
  else updateField(dt);
  if(!S||S.phase==='podium') return;
  const ev=S.ev;
  let tx=camTo(), k=ev.swim?3:6;
  if(S.jv&&!S.jv.held){ tx=S.jv.x-LW*.55/S.ppm; k=8; }
  S.cam+=(tx-S.cam)*Math.min(1,dt*k);
  if(ev.kind==='pv'){ const ty=Math.max(0,S.y-2.2); S.camY+=(ty-S.camY)*Math.min(1,dt*5); }
  if(ev.kind==='jav'||ev.kind==='ham'||ev.kind==='sp'){ const ty=(S.jv&&!S.jv.held)?Math.max(0,S.jv.y-3):0; S.camY+=(ty-S.camY)*Math.min(1,dt*5); }
  // replay snapshots on a fixed 1/60 s step (played back at 30 per second: half speed), whatever the screen's refresh rate
  if(ev.type==='field'&&(S.phase==='run'||S.phase==='act'||S.phase==='post')){ S.snapAcc=(S.snapAcc||0)+dt;
    while(S.snapAcc>=1/60){ S.snapAcc-=1/60; S.snaps.push(snap()); } if(S.snaps.length>900) S.snaps.splice(0,S.snaps.length-900); }
}
export function coast(dt){ if(S.ev.type==='field') return; S.v=Math.max(0,S.v-S.v*1.6*dt); S.x+=S.v*dt; S.legP+=S.v*dt*2.4; if(S.phase!=='set') S.pose=S.v>.3?runPose(S.legP,Math.min(1,S.v/4)):(S.finished?POSE.cheer:POSE.stand); }
export function armsFor(){ const k=S.ev.kind; return k==='jav'?'jav':(k==='pv'?'pole':null); }
export function judge(q){ const t=q>=.9?'¡PERFECTO!':q>=.7?'¡BIEN!':q>=.4?'REGULAR':'¡FLOJO!'; S.pops=S.pops.filter(p=>!p.small); S.pops.push({text:t,t:0,dur:.8,col:q>=.7?'#ffd23a':'#fff',sub:'',big:.55,small:true}); }
