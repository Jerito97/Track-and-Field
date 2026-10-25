// 100 m and 110 m hurdles, and on top of them swimming (swim.js), the 4x100 relay (relay.js), the laser run (laser.js)
// and track cycling (cycle.js)
import {cheer,noise,tone} from '../audio.js';
import {HURDLES} from '../config.js';
import {endDemo} from './demo.js';
import {POSE,runPose} from '../poses.js';
import {ATH,S} from '../state.js';
import {rec} from '../storage.js';
import {endEvent} from '../ui/screens.js';
import {clamp,rand,secs} from '../utils.js';
import {bothCue,HURDLE_SLIP,judge,numCue,pop,sideCue} from './core.js';
import {REACH,SWIM_K,swimGun,swimStep,touchAt} from './swim.js';
import {GAIN,relayStep,rivalChanges,rivalRelay} from './relay.js';
import {laserRival,laserRivalStop,laserStep} from './laser.js';
import {cycleGun,cycleStep} from './cycle.js';

// seconds without a correct tap before slowing down, and how fast (fraction of speed per second)
const IDLE_GRACE=.5, IDLE_DECAY=.3;
export function resetRivals(){
  const ev=S.ev;
  S.rivals.forEach(r=>{
    // reaction to the gun; now and then a sleepy start
    let react=rand(.13,.24); if(!r.a.target&&Math.random()<.1) react+=rand(.25,.45);
    // a machine with a set mark (survival) runs close to it, without sleepy starts or trips
    // (swimming: the spread is spread s instead of 16, the races being longer)
    const k=(ev.spread||16)/16, T=r.a.target?r.a.target[ev.id]*(1+rand(-.012,.012)):ev.cpu+(1-r.a.sk)*16*k+rand(-.3,.3)*k;  // around the middle machine's time (100 m ~11.7-13.1 s, vallas ~14.5-15.9 s)
    // flat sprint: about one in three rivals trips somewhere mid-race (not in the water)
    const trip=!ev.hurdles&&!ev.swim&&!ev.relay&&!ev.laser&&!ev.cycle&&!r.a.target&&Math.random()<.3?rand(15,85):null;
    const chT=ev.relay?rivalChanges(r,ev):0;
    Object.assign(r,{T,react,trip,tripT:0,vmax:(ev.dist-(ev.swim?2*REACH:ev.relay?(ev.legs-1)*GAIN:0))/(T-(ev.tau||2)-react-chT),x:0,v:0,t:0,legP:rand(0,6),air:0,airT:.4,y:0,final:null,done:0,slow:1,knocked:new Set(),turned:false}); if(ev.laser) laserRival(r,ev); });
}
// the dip at the line (both red buttons): the line reached DIP_BEST s after pressing them (the lean all the way
// forward) takes DIP_MAX s off the time; DIP_W s earlier or later, nothing (in between, in proportion). The track shows
// where to press (dipSpot)
export const DIP_BEST=.25, DIP_W=.2, DIP_MAX=.2;
const dipBonus=t=>DIP_MAX*clamp(1-Math.abs(t-DIP_BEST)/DIP_W,0,1);
// metres before the line to press them, at the speed one goes now
export const dipSpot=()=>S.v*DIP_BEST*(S.ev&&S.ev.swim?SWIM_K:1);

export function updateSprint(dt){
  const ev=S.ev;
  if(S.phase==='set'){
    const st=S.phaseT<1.1?0:(S.phaseT<1.1+S.hold?1:2);
    if(st!==S.setStage){ S.setStage=st;
      if(st===0){ S.pops=[]; pop('PREPARADOS',{hold:true}); tone(392,.12); }
      else if(st===1){ S.pops=[]; pop('LISTOS',{hold:true}); tone(392,.12); }
      else { S.pops=[]; pop('¡YA!',{col:'#ffd23a',dur:.9,big:1.3}); noise(.35,.35); S.smoke=0; S.phase='run'; S.phaseT=0; S.t=0; S.lastTap=S.clock;
        if(ev.hurdles) numCue(); else if(ev.swim) swimGun(); else if(ev.cycle) cycleGun(); else sideCue(); } }
    S.pose=st===0?POSE.crouch:POSE.set;
    return;
  }
  if(S.smoke!=null) S.smoke+=dt;
  S.rivals.forEach(r=>rivalStep(r,dt));
  if(S.phase!=='run') return;
  if(!S.finished) S.t+=dt;
  // 100 m: no top speed, but stop tapping the green buttons for a moment and you slowly lose speed
  if(!ev.hurdles&&!S.finished&&S.cue&&S.cue.type==='side'&&S.clock-(S.lastTap||0)>IDLE_GRACE) S.v-=S.v*IDLE_DECAY*dt;
  if(ev.swim) swimStep(dt);
  else if(S.stumble>0){ S.stumble-=dt; S.x+=S.v*.6*dt; S.pose=POSE.stumble; }
  else { S.x+=S.v*dt; S.legP+=S.v*dt*2.4; }
  if(ev.laser) laserStep(dt);
  if(ev.cycle) cycleStep(dt);
  if(ev.relay){ relayStep();
    // the runner who handed the baton over slows down to a stop
    const p=S.prev; if(p){ p.t+=dt; p.v=Math.max(0,p.v-p.v*1.8*dt); p.x+=p.v*dt; p.legP=(p.legP||0)+p.v*dt*2.4; } }
  if(ev.hurdles){
    if(S.air>0){ S.air-=dt; S.y=S.air>0?1.05*Math.sin(Math.PI*(1-S.air/S.airT)):0; if(S.air<=0){ S.y=0; S.hk++; S.v*=.93; } }
    else if(S.hk<HURDLES.length&&S.stumble<=0){
      const h=HURDLES[S.hk], take=clamp(.2*S.v,1.6,2.6);
      if(S.armed&&S.x>=h-take){ S.armed=false; S.slips=0; S.airT=clamp(3.4/Math.max(S.v,4),.26,.6); S.air=S.airT; tone(600,.05,'triangle',.04); if(S.hk+1<HURDLES.length) numCue(); }
      // hit: the rest of each wrong number's 14% (see badNum), and the knock itself
      else if(!S.armed&&S.x>=h-.35){ S.knocked.add(S.hk); S.v*=Math.pow(.86/HURDLE_SLIP,S.slips||0)*.7; S.slips=0; S.stumble=.35; S.hk++; S.cue=null; S.armed=false; noise(.2,.3); tone(110,.18,'square',.05);
        pop('¡UY!',{col:'#ff5a3c',dur:.8}); S.renum=.35; }
    }
    if(S.renum>0){ S.renum-=dt; if(S.renum<=0&&S.hk<HURDLES.length&&!S.cue) numCue(); }
    if(S.hk>=HURDLES.length&&!S.finished&&!S.cue&&!S.dipCued&&S.air<=0&&S.stumble<=0) sideCue();
  }
  // final: red buttons = head dip at the line (no extra speed)
  // the dip buttons come about 1.1 s before the line (at least 8 m), so there's time to press both after the last taps
  // (hurdles: only once the last hurdle's numbers are done, or they'd take their place)
  // (swimming: the touch at the wall, once the turn is done; cycling: a second before, the rider coasting meanwhile)
  if(!S.finished&&!S.dipCued&&S.x>=ev.dist-(ev.swim?touchAt():ev.cycle?Math.max(8,S.v*1.0):Math.max(8,S.v*1.1))&&S.air<=0&&(!ev.swim||S.turned)&&(!ev.hurdles||S.hk>=HURDLES.length||S.hk===HURDLES.length-1&&S.armed)){ S.dipCued=true; bothCue(); }
  if(S.dip>0) S.dipT+=dt;
  if(S.stumble>0){}
  else if(ev.hurdles&&S.air>0) S.pose=POSE.hurdle;
  else if(S.dip>0){ S.dip-=dt; S.pose=POSE.dip; if(S.dip<=0&&!S.finished) S.pops.push({text:'¡MUY TEMPRANO!',t:0,dur:.8,col:'#fff',sub:'',big:.55,small:true}); }
  else S.pose=S.v>.3?runPose(S.legP,Math.min(1,S.v/4)):(S.finished?POSE.cheer:POSE.stand);
  if(!S.finished&&S.x>=ev.dist){
    S.finished=true; const over=(S.x-ev.dist)/Math.max(S.v*(ev.swim?SWIM_K:1),.5); let bonus=0; if(S.dip>0){ bonus=dipBonus(S.dipT); judge(bonus/DIP_MAX); const j=S.pops[S.pops.length-1]; if(j&&bonus>=.005) j.sub=`−${bonus.toFixed(2)} s`; } else if(!S.dipCued||S.cue){ S.pops.push({text:ev.swim?'SIN TOQUE':'SIN CABEZAZO',t:0,dur:.8,col:'#fff',sub:'',big:.55,small:true}); }
    if(ev.swim) S.x=ev.dist;
    S.final=Math.ceil((S.t-over-bonus+(S.pen||0))*100)/100; S.cue=null; if(!(S.dip>0)) S.dip=.3;
    tone(880,.3,'triangle',.06); cheer();
  }
  if(S.finished){
    S.after+=dt; S.v=Math.max(0,S.v-S.v*1.2*dt);
    const allIn=S.rivals.every(r=>r.final!=null);
    if((allIn&&S.after>1.2)||S.after>3.5){
      S.phase='wait'; S.wait=2.2;
      const rank=1+S.rivals.filter(r=>r.final!=null&&r.final<S.final).length;
      const isRec=rec[ev.id]==null||S.final<rec[ev.id];
      pop(secs(S.final)+(S.final<59.995?' s':''),{dur:2.2,big:1.1,sub:isRec?'¡RÉCORD PERSONAL!':(rank===1?'¡GENIAL!':rank+'º PUESTO')});
      S.next=finishSprintEvent;
    }
  } else if(S.t>(ev.swim||ev.cycle?90:ev.relay||ev.laser?120:40)){ S.final=null; S.cue=null; S.phase='wait'; S.wait=1; S.next=finishSprintEvent; }
}
export function rivalStep(r,dt){
  if(r.vmax==null) return;
  const d=S.ev.dist; r.t+=dt; r.slow+=(1-r.slow)*dt*.9;
  if(r.trip!=null&&r.x>=r.trip){ r.trip=null; r.slow=.6; r.tripT=.4; }
  if(r.tripT>0) r.tripT-=dt;
  // swimming: a turn at the far wall costs a little
  if(S.ev.swim&&!r.turned&&r.x>=S.ev.pool){ r.turned=true; r.slow=.8; r.x+=2*REACH; }
  // relay: the changes
  if(S.ev.relay&&r.chq&&r.final==null) rivalRelay(r,dt);
  // laser run: stopped at a range, then off again from a standstill
  if(S.ev.laser&&r.final==null&&laserRivalStop(r,S.ev)) return;
  let v=r.vmax*(1-Math.exp(-Math.max(0,r.t-(r.go??r.react))/(S.ev.tau||2)))*r.slow;
  if(r.final!=null){ r.done+=dt; v*=Math.max(0,1-r.done*.6); }
  r.v=v; r.x+=v*dt; r.legP+=v*dt*2.4;
  if(r.final==null&&r.x>=d) r.final=Math.ceil((r.t-(r.x-d)/Math.max(v,.5)+(r.pen||0))*100)/100;
  if(S.ev.hurdles){
    if(r.air>0){ r.air-=dt; r.y=r.air>0?1.05*Math.sin(Math.PI*(1-r.air/r.airT)):0; }
    else { const i=HURDLES.findIndex(h=>h>r.x); if(i>=0&&!r.knocked.has(i)&&HURDLES[i]-r.x<clamp(.2*v,1.6,2.6)){ if(Math.random()<.5*(1.05-r.a.sk)){ r.knocked.add(i); r.slow=.6; r.tripT=.35; } else { r.airT=clamp(3.4/Math.max(v,4),.26,.6); r.air=r.airT; } } }
  }
}
export function finishSprintEvent(){ if(S.demo){ endDemo(); return; }  // the tutorial ends at the line
  const ev=S.ev; const res=ATH.map(a=>{ if(a.me) return S.final; const r=S.rivals.find(r=>r.a===a); return r.final!=null?r.final:Math.ceil((r.t+(ev.dist-r.x)/Math.max(r.vmax,1))*100)/100; }); endEvent(res); }
