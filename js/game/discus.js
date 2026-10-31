// Discus throw, in three parts. Swings: three times a ring closes around the discus; tap both buttons (or Space) right
// as it closes: the better the timing, the more speed the spin starts with. After a moment, the spin: SPIN_T s of the green buttons as in
// the 100 m while the athlete turns across the circle (more speed). Angle: as in the shot put a needle rises on a
// gauge and doesn't come back; press both buttons in the green and the discus goes right then (no release bar). If the
// needle reaches the top first, no mark.
import {noise,tone} from '../audio.js';
import {POSE} from '../poses.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {FLY_PPM,judge,sideCue,sinceHold} from './core.js';
import {landed} from './field.js';
import {angleQ,SP_MAX,SP_RATE} from './shot.js';

// the three swings: seconds for each ring to close (a little quicker each time), the pause between them; a tap with
// the ring within RING_OK of closed (share of its time) is perfect, nothing RING_W away; past RING_LATE it's missed
export const RINGS=[.75,.66,.57];
const RING_GAP=.25, RING_OK=.07, RING_W=.35, RING_LATE=1.35;
// the speed the spin starts with (m/s of tapping speed) for three perfect swings; then a pause before the spin (s)
const V0=7, READY=.5;
// tapping time (s), then the pause before the needle
const SPIN_T=3, GAP=.5, LAG=.03;
// not tapping: as in the 100 m
const IDLE_GRACE=.5, IDLE_DECAY=.3;
// throw length (m) per m/s of speed at the best angle
const DIS_K=4.9;
// the athlete: at the back of the circle for the swings, across it while spinning (hip, m from the circle's centre)
const FROM=-.8, TO=.45;
const TAU=Math.PI*2;
// how good a tap is, by where the ring was (p: 1 = closed)
export const ringQ=p=>{ const e=Math.abs(p-1); return e<=RING_OK?1:clamp(1-(e-RING_OK)/(RING_W-RING_OK),0,1); };

// swinging the discus back and forth at the back of the circle (u: the swing's progress, the arm furthest back as the
// ring closes); spinning: turning round and round, the throwing arm trailing behind; the throw: the arm sweeping
// through at the release angle
const SWING=u=>{ const w=Math.sin(Math.PI*clamp(u,0,1)); return {kind:'disswing',hip:.82,lean:.1-.2*w,legs:[{a:.3,b:.25},{a:-.3,b:.3}],arms:[{a:1.2-2.4*w,b:.1},{a:-.6+.8*w,b:.4}]}; };
const SPIN=ph=>{ const c=Math.cos(ph), f=.35*Math.sin(ph); return {kind:'disspin',hip:.76,lean:.15,legs:[{a:.25+f,b:.4},{a:-.2-f,b:.35}],arms:[{a:-1.4+.9*c,b:.08},{a:1.1-.6*c,b:.3}]}; };
const THROW=d=>{ const r=d*Math.PI/180; return {kind:'disthrow',hip:.82,lean:.2,legs:[{a:.45,b:.15},{a:-.5,b:.45}],arms:[{a:Math.PI/2+r,b:.05},{a:-.9,b:.5}]}; };

export function startDiscus(){ S.v=0; S.x=FROM; S.act={k:'dis',stage:'swing',t:0,n:0,qs:[],free:!S.held2}; S.phase='act'; ring(); }
function ring(){ const a=S.act; a.t=0; a.free=a.free||!S.held2; S.meter={k:'disring',p:0}; S.cue={type:'hamhold',label:'TOCÁ LOS DOS CUANDO SE CIERRE',t:0}; }
// pausing during the swings: a fresh tap is needed after Resume (the fingers come off to tap it)
export function discusPause(){ const a=S&&S.act; if(a&&a.k==='dis') a.free=false; }
export function updateDiscus(dt){
  const a=S.act; a.t+=dt;
  if(a.stage==='swing'){
    const T=RINGS[a.n], m=S.meter; S.pose=SWING(a.t/T);
    if(!m){ if(a.t>=RING_GAP){ a.t=0; ring(); } return; }
    m.p=a.t/T;
    if(!S.held2) a.free=true;
    let q=null;
    if(S.held2&&a.free){ a.free=false; q=ringQ(m.p-(sinceHold()+LAG)/T); judge(q); tone(420+260*q,.07,'triangle',.05); }
    else if(m.p>=RING_LATE){ q=0; S.pops.push({text:'¡TARDE!',t:0,dur:.6,col:'#fff',sub:'',big:.55,small:true}); tone(160,.15,'sawtooth',.04); }
    if(q==null) return;
    a.qs.push(q); a.n++; S.meter=null; S.cue=null; a.t=0;
    if(a.n>=RINGS.length){ a.stage='ready'; a.t=0; S.v=V0*a.qs.reduce((s,x)=>s+x,0)/RINGS.length; S.pops.push({text:'¡A GIRAR!',t:0,dur:READY+.3,col:'#ffd23a',sub:'',big:.6,small:true}); }
  } else if(a.stage==='ready'){
    S.pose=SWING(0);
    if(a.t>=READY){ a.stage='spin'; a.t=0; a.ph=0; S.lastTap=S.clock; sideCue(); tone(600,.06,'triangle',.04); }
  } else if(a.stage==='spin'){
    if(S.cue&&S.cue.type==='side'&&S.clock-(S.lastTap||0)>IDLE_GRACE) S.v-=S.v*IDLE_DECAY*dt;
    const k=clamp(a.t/SPIN_T,0,1); S.x=FROM+(TO-FROM)*k; a.ph+=dt*(TAU*.9+.25*S.v); S.pose=SPIN(a.ph);
    if(a.t>=SPIN_T){ a.stage='gap'; a.t=0; a.v=S.v; S.cue=null; S.pops.push({text:'¡ATENTO AL ÁNGULO!',t:0,dur:GAP+.4,col:'#ffd23a',sub:'',big:.6,small:true}); }
  } else if(a.stage==='gap'){
    a.ph+=dt*(TAU*.9+.25*a.v); S.pose=SPIN(a.ph);
    if(a.t>=GAP){ a.stage='angle'; a.t=0; a.free=!S.held2; S.meter={k:'disang',p:0}; S.cue={type:'hamhold',label:'APRETÁ LOS DOS EN LO VERDE',t:0}; tone(500,.06,'triangle',.04); }
  } else if(a.stage==='angle'){
    const m=S.meter; a.ph+=dt*(TAU*.9+.25*a.v); S.pose=SPIN(a.ph);
    // a fresh press: fingers still down from the taps don't count
    if(!S.held2) a.free=true;
    m.p=Math.min(SP_MAX,m.p+SP_RATE*dt);
    if(S.held2&&a.free){ a.d=clamp(m.p-(sinceHold()+LAG)*SP_RATE,0,SP_MAX); m.hit=a.d; throwIt(a); }
    else if(m.p>=SP_MAX) foul(a,'¡TE PASASTE DE ÁNGULO!');
  } else if(a.stage==='fly') flight(dt,a);
  else if(a.stage==='out'){ S.x+=dt*1.2*Math.max(0,1-a.t*1.5); S.pose=POSE.stumble; if(a.t>.8){ a.stage='done'; landed(null); } }
}
function throwIt(a){
  const g=angleQ(a.d); judge(g); S.cue=null; noise(.25,.12,2200); tone(300,.3,'triangle',.05);
  setTimeout(()=>{ if(S&&S.meter&&S.meter.k==='disang') S.meter=null; },700);
  const R=Math.max(5,DIS_K*a.v*(.35+.65*g)), r=a.d*Math.PI/180, x0=S.x+.7, y0=1.6;
  a.stage='fly'; a.t=0; a.R=R-(x0-S.ev.line); a.T=1.3+.03*R; a.top=Math.max(1,a.R*Math.tan(r)/4*.6);
  S.jv={held:false,x:x0,y:y0,x0,y0,t:0,ham:true,disc:true};
}
function foul(a,text){
  a.stage='out'; a.t=0; S.cue=null; if(S.meter) S.meter.hit=S.meter.p;
  setTimeout(()=>{ if(S&&S.meter&&S.meter.k==='disang') S.meter=null; },700);
  S.pops.push({text,t:0,dur:1.2,col:'#ff5a3c',sub:'',big:.6,small:true}); tone(160,.45,'sawtooth',.06);
}
// the discus' flight (a long, flat glide); the athlete follows through, then cheers when it lands
function flight(dt,a){
  const j=S.jv; S.pose=j.stuck?POSE.cheer:THROW(a.d);
  if(j.stuck) return;
  j.t+=dt; const u=Math.min(1,j.t/a.T); j.spin=(j.spin||0)+dt*14;
  j.x=j.x0+a.R*u; j.y=j.y0*(1-u)+4*a.top*u*(1-u); S.ppm+=(FLY_PPM()-S.ppm)*Math.min(1,dt*1.6);
  if(u>=1){ j.stuck=true; j.y=.05; S.landX=j.x; tone(130,.15,'square',.05); noise(.12,.2,700); landed(Math.floor((j.x-S.ev.line)*100)/100); }
}
