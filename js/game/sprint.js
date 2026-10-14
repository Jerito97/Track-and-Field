// 100 m and 110 m hurdles
import {cheer,noise,tone} from '../audio.js';
import {HURDLES} from '../config.js';
import {POSE,runPose} from '../poses.js';
import {ATH,S} from '../state.js';
import {rec} from '../storage.js';
import {endEvent} from '../ui/screens.js';
import {clamp,rand} from '../utils.js';
import {bothCue,judge,numCue,pop,sideCue} from './core.js';

// seconds without a correct tap before slowing down, and how fast (fraction of speed per second)
const IDLE_GRACE=.5, IDLE_DECAY=.3;
export function resetRivals(){
  const ev=S.ev;
  S.rivals.forEach(r=>{
    // reaction to the gun; now and then a sleepy start
    let react=rand(.13,.24); if(Math.random()<.1) react+=rand(.25,.45);
    const T=ev.hurdles? 15.6+(1.03-r.a.sk)*20+rand(-.3,.3) : 12.6+(1.03-r.a.sk)*20+rand(-.35,.35);  // field ~12.6-14.3 s (vallas ~15.6-17.3 s): beatable with a decent run
    // flat sprint: about one in three rivals trips somewhere mid-race
    const trip=!ev.hurdles&&Math.random()<.3?rand(15,85):null;
    Object.assign(r,{T,react,trip,tripT:0,vmax:ev.dist/(T-2.0-react),x:0,v:0,t:0,legP:rand(0,6),air:0,airT:.4,y:0,final:null,done:0,slow:1,knocked:new Set()}); });
}
export function updateSprint(dt){
  const ev=S.ev;
  if(S.phase==='set'){
    const st=S.phaseT<1.1?0:(S.phaseT<1.1+S.hold?1:2);
    if(st!==S.setStage){ S.setStage=st;
      if(st===0){ S.pops=[]; pop('PREPARADOS',{hold:true}); tone(392,.12); }
      else if(st===1){ S.pops=[]; pop('LISTOS',{hold:true}); tone(392,.12); }
      else { S.pops=[]; pop('¡YA!',{col:'#ffd23a',dur:.9,big:1.3}); noise(.35,.35); S.smoke=0; S.phase='run'; S.phaseT=0; S.t=0; S.lastTap=S.clock;
        if(ev.hurdles) numCue(); else sideCue(); } }
    S.pose=st===0?POSE.crouch:POSE.set;
    return;
  }
  if(S.smoke!=null) S.smoke+=dt;
  S.rivals.forEach(r=>rivalStep(r,dt));
  if(S.phase!=='run') return;
  if(!S.finished) S.t+=dt;
  // 100 m: no top speed, but stop tapping the green buttons for a moment and you slowly lose speed
  if(!ev.hurdles&&!S.finished&&S.cue&&S.cue.type==='side'&&S.clock-(S.lastTap||0)>IDLE_GRACE) S.v-=S.v*IDLE_DECAY*dt;
  if(S.stumble>0){ S.stumble-=dt; S.x+=S.v*.6*dt; S.pose=POSE.stumble; }
  else { S.x+=S.v*dt; S.legP+=S.v*dt*2.4; }
  if(ev.hurdles){
    if(S.air>0){ S.air-=dt; S.y=S.air>0?1.05*Math.sin(Math.PI*(1-S.air/S.airT)):0; if(S.air<=0){ S.y=0; S.hk++; S.v*=.93; } }
    else if(S.hk<10&&S.stumble<=0){
      const h=HURDLES[S.hk], take=clamp(.2*S.v,1.6,2.6);
      if(S.armed&&S.x>=h-take){ S.armed=false; S.airT=clamp(3.4/Math.max(S.v,4),.26,.6); S.air=S.airT; tone(600,.05,'triangle',.04); if(S.hk+1<10) numCue(); }
      else if(!S.armed&&S.x>=h-.35){ S.knocked.add(S.hk); S.v*=.55; S.stumble=.35; S.hk++; S.cue=null; S.armed=false; noise(.2,.3); tone(110,.18,'square',.05);
        pop('¡UY!',{col:'#ff5a3c',dur:.8}); S.renum=.35; }
    }
    if(S.renum>0){ S.renum-=dt; if(S.renum<=0&&S.hk<10&&!S.cue) numCue(); }
    if(S.hk>=10&&!S.finished&&!S.cue&&!S.dipCued&&S.air<=0&&S.stumble<=0) sideCue();
  }
  // final: red buttons = head dip at the line (no extra speed)
  if(!S.finished&&!S.dipCued&&S.x>=ev.dist-8&&S.air<=0){ S.dipCued=true; bothCue(); }
  if(S.dip>0) S.dipT+=dt;
  if(S.stumble>0){}
  else if(ev.hurdles&&S.air>0) S.pose=POSE.hurdle;
  else if(S.dip>0){ S.dip-=dt; S.pose=POSE.dip; if(S.dip<=0&&!S.finished) S.pops.push({text:'¡MUY TEMPRANO!',t:0,dur:.8,col:'#fff',sub:'',big:.55,small:true}); }
  else S.pose=S.v>.3?runPose(S.legP,Math.min(1,S.v/4)):(S.finished?POSE.cheer:POSE.stand);
  if(!S.finished&&S.x>=ev.dist){
    S.finished=true; const over=(S.x-ev.dist)/Math.max(S.v,.5); let bonus=0; if(S.dip>0){ const f=S.dipT/.5; bonus=.12*clamp(1-Math.abs(f-.55)/.55,0,1); judge(bonus/.12); } else if(!S.dipCued||S.cue){ S.pops.push({text:'SIN CABEZAZO',t:0,dur:.8,col:'#fff',sub:'',big:.55,small:true}); }
    S.final=Math.ceil((S.t-over-bonus)*100)/100; S.cue=null; if(!(S.dip>0)) S.dip=.3;
    tone(880,.3,'triangle',.06); cheer();
  }
  if(S.finished){
    S.after+=dt; S.v=Math.max(0,S.v-S.v*1.2*dt);
    const allIn=S.rivals.every(r=>r.final!=null);
    if((allIn&&S.after>1.2)||S.after>3.5){
      S.phase='wait'; S.wait=2.2;
      const rank=1+S.rivals.filter(r=>r.final!=null&&r.final<S.final).length;
      const isRec=rec[ev.id]==null||S.final<rec[ev.id];
      pop(S.final.toFixed(2)+' s',{dur:2.2,big:1.1,sub:isRec?'¡NUEVO RÉCORD!':(rank===1?'¡GENIAL!':rank+'º PUESTO')});
      S.next=finishSprintEvent;
    }
  } else if(S.t>40){ S.final=null; S.cue=null; S.phase='wait'; S.wait=1; S.next=finishSprintEvent; }
}
export function rivalStep(r,dt){
  if(r.vmax==null) return;
  const d=S.ev.dist; r.t+=dt; r.slow+=(1-r.slow)*dt*.9;
  if(r.trip!=null&&r.x>=r.trip){ r.trip=null; r.slow=.6; r.tripT=.4; }
  if(r.tripT>0) r.tripT-=dt;
  let v=r.vmax*(1-Math.exp(-Math.max(0,r.t-r.react)/2.0))*r.slow;
  if(r.final!=null){ r.done+=dt; v*=Math.max(0,1-r.done*.6); }
  r.v=v; r.x+=v*dt; r.legP+=v*dt*2.4;
  if(r.final==null&&r.x>=d) r.final=Math.ceil((r.t-(r.x-d)/Math.max(v,.5))*100)/100;
  if(S.ev.hurdles){
    if(r.air>0){ r.air-=dt; r.y=r.air>0?1.05*Math.sin(Math.PI*(1-r.air/r.airT)):0; }
    else { const i=HURDLES.findIndex(h=>h>r.x); if(i>=0&&!r.knocked.has(i)&&HURDLES[i]-r.x<clamp(.2*v,1.6,2.6)){ if(Math.random()<.5*(1.05-r.a.sk)){ r.knocked.add(i); r.slow=.6; r.tripT=.35; } else { r.airT=clamp(3.4/Math.max(v,4),.26,.6); r.air=r.airT; } } }
  }
}
export function finishSprintEvent(){ const ev=S.ev; const res=ATH.map(a=>{ if(a.me) return S.final; const r=S.rivals.find(r=>r.a===a); return r.final!=null?r.final:Math.ceil((r.t+(ev.dist-r.x)/Math.max(r.vmax,1))*100)/100; }); endEvent(res); }
