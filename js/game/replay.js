// Instant replay of field attempts
import {ATH,S} from '../state.js';
import {endDemo} from './demo.js';
import {showRoundStandings} from '../ui/screens.js';
import {rand} from '../utils.js';

export function snap(){ return {x:S.x,y:S.y,rot:S.rot,turn:S.turn,pose:S.pose,cam:S.cam,camY:S.camY,ppm:S.ppm,landX:S.landX,print:S.print,prints:(S.prints||[]).slice(),bar:S.bar,v:S.v,
  jv:S.jv?{...S.jv}:null,act:S.act?{k:S.act.k,t:S.act.t,stage:S.act.stage,r:S.act.Trise?Math.min(1,S.act.t/S.act.Trise):null,u:S.act.T?Math.min(1,S.act.t/S.act.T):null,tapU:S.act.tapU,phi:S.act.phi,fk:S.act.fk,pt:S.phase==='post'?2-S.postT:null}:null,meter:S.meter?{...S.meter}:null,zone:S.zone}; }
export function startReplay(){
  if(S.demo){ endDemo(); return; }  // the tutorial ends after its one attempt
  if(S.snaps.length<10){ afterAttempt(); return; }
  let i0=S.snaps.findIndex(s=>s.act); i0=Math.max(0,i0-70);
  S.replay={frames:S.snaps.slice(i0),acc:0,i:0}; S.pops=[];
}
export function updateReplay(dt){ const r=S.replay; r.acc+=dt*30; r.i=Math.floor(r.acc); if(r.i>=r.frames.length-1) endReplay(); }
export function endReplay(){ S.replay=null; afterAttempt(); }
export function afterAttempt(){
  const ev=S.ev;
  ATH.forEach((a,i)=>{ if(a.me) return;
    // around the event's middle machine mark (ev.cpu), by skill; a machine with a set mark (survival) jumps or throws close to it
    const m=Math.random()<(a.target?.1:ev.kind==='pv'?.15:.12)?null:Math.floor((a.target?a.target[ev.id]*(1+rand(-.035,.015)):ev.cpu*Math.pow(a.sk,1.6)*(1+rand(-.04,.04)))*100)/100;
    S.marks[i].push(m); });
  showRoundStandings();
}
