// Shot put, in three parts. Power: tap the green buttons as in the 100 m while the athlete glides across the circle
// (POWER_T s). Angle: after a short pause a needle rises on a gauge beside the athlete, and doesn't come back: press and
// hold both buttons when it's in the green (about 40°) to fix the angle; if it reaches the top first, no mark. Release:
// keep holding and a star runs along a bar over the athlete (as in the hammer); let go when it reaches the circle at
// its end (past it, the athlete steps out of the circle: no mark).
import {noise,tone} from '../audio.js';
import {POSE} from '../poses.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {judge,sideCue} from './core.js';
import {landed,qPole} from './field.js';

// tapping time (s), then the pause before the needle
const POWER_T=2.2, GAP=.5;
// the needle: degrees per second, the top (no mark if it gets there), the best angle and the green around it
export const SP_RATE=55, SP_MAX=80, SP_BEST=40, SP_GREEN=6;
// the star: seconds to reach the circle; past LATE (of the way) = out of the circle
const STAR_T=.45, LATE=1.25, LAG=.03;
// a hold shorter than BLIP s (fingers left over from the taps) doesn't count
const BLIP=.12;
// not tapping: as in the 100 m
const IDLE_GRACE=.5, IDLE_DECAY=.3;
// throw length (m) per m/s of tapping speed, at the best angle and a perfect release
const SP_K=1.9;
// the athlete glides across the circle while tapping (hip from FROM to TO, m from the circle's centre)
const FROM=-.6, TO=.35;
// how good an angle (degrees) is: 1 at SP_BEST, nothing at 0 and at twice it
export const angleQ=d=>Math.max(0,Math.sin(Math.PI*clamp(d/(2*SP_BEST),0,1)));

// crouched with the shot at the neck, sliding back to front; then the put: arm straight out at the release angle
const GLIDE=k=>({kind:'spglide',hip:.62+.06*k,lean:.55-.35*k,legs:[{a:.5+.3*k,b:1.1-.5*k},{a:-.5,b:.6}],arms:[{a:-.35,b:2.7},{a:.9,b:.6}]});
const PUT=d=>{ const r=d*Math.PI/180; return {kind:'spput',hip:.8,lean:.25,legs:[{a:.45,b:.1},{a:-.55,b:.5}],arms:[{a:Math.PI/2+r,b:.05},{a:-.8,b:.6}]}; };

// pausing while aiming: the fingers come off to tap Resume, so the star starts over with a fresh hold
export function shotPause(){ const a=S&&S.act; if(!a||a.k!=='sp'||a.stage!=='aim'||!S.meter) return;
  a.wait=true; a.free=false; S.meter.p=0; S.cue={type:'hamhold',t:0}; }
export function startShot(){ S.v=0; S.x=FROM; S.act={k:'sp',stage:'power',t:0}; S.phase='act'; S.lastTap=S.clock; sideCue(); tone(600,.06,'triangle',.04); }
export function updateShot(dt){
  const a=S.act; a.t+=dt;
  if(a.stage==='power'){
    if(S.cue&&S.cue.type==='side'&&S.clock-(S.lastTap||0)>IDLE_GRACE) S.v-=S.v*IDLE_DECAY*dt;
    const k=clamp(a.t/POWER_T,0,1); S.x=FROM+(TO-FROM)*k; S.pose=GLIDE(k);
    if(a.t>=POWER_T){ a.stage='gap'; a.t=0; a.v=S.v; S.cue=null; S.pops.push({text:'¡ATENTO AL ÁNGULO!',t:0,dur:GAP+.4,col:'#ffd23a',sub:'',big:.6,small:true}); }
  } else if(a.stage==='gap'){
    S.pose=GLIDE(1);
    if(a.t>=GAP){ a.stage='angle'; a.t=0; a.free=!S.held2; S.meter={k:'spang',p:0}; S.cue={type:'hamhold',label:'APRETÁ LOS DOS EN LO VERDE',t:0}; tone(500,.06,'triangle',.04); }
  } else if(a.stage==='angle'){
    const m=S.meter; S.pose=GLIDE(1);
    // a fresh hold: fingers still down from the taps don't count
    if(!S.held2) a.free=true;
    m.p=Math.min(SP_MAX,m.p+SP_RATE*dt);
    if(S.held2&&a.free){ a.d=clamp(m.p-LAG*SP_RATE,0,SP_MAX); judge(angleQ(a.d)); tone(700,.08,'triangle',.05); a.stage='aim'; a.t=0; S.cue=null; S.meter={k:'sp',p:0,t:0,ang:a.d}; }
    else if(m.p>=SP_MAX) foul(a,'¡TE PASASTE DE ÁNGULO!');
  } else if(a.stage==='aim'){
    const m=S.meter; S.pose=GLIDE(1);
    // back from a pause: the star waits for a fresh hold
    if(a.wait){ if(!S.held2) a.free=true; if(S.held2&&a.free){ a.wait=false; m.t=0; m.p=0; S.cue=null; } return; }
    m.t+=dt; m.p+=dt/STAR_T;
    if(!S.held2&&m.t<BLIP){ a.stage='angle'; a.t=0; S.meter={k:'spang',p:a.d}; S.cue={type:'hamhold',t:0}; }
    else if(m.p>=LATE) foul(a,'¡TE SALISTE DEL CÍRCULO!');
    else if(!S.held2) put(a);
  } else if(a.stage==='fly') flight(dt,a);
  else if(a.stage==='out'){ S.x+=dt*1.2*Math.max(0,1-a.t*1.5); S.pose=POSE.stumble; if(a.t>.8){ a.stage='done'; landed(null); } }
}
function put(a){
  const m=S.meter, q=qPole(m.p-LAG/STAR_T), g=angleQ(a.d);
  m.hit=m.p; judge(q); noise(.2,.12,1800); tone(260,.25,'triangle',.05);
  setTimeout(()=>{ if(S&&S.meter&&S.meter.k==='sp') S.meter=null; },700);
  const R=Math.max(3,SP_K*a.v*(.35+.65*g)*(.7+.3*q)), r=a.d*Math.PI/180, x0=S.x+.55, y0=2.1;
  a.stage='fly'; a.t=0; a.R=R-(x0-S.ev.line); a.T=.8+.045*R; a.top=Math.max(.3,a.R*Math.tan(r)/4);
  S.jv={held:false,x:x0,y:y0,x0,y0,t:0,ham:true};
}
function foul(a,text){
  a.stage='out'; a.t=0; S.cue=null; if(S.meter) S.meter.hit=S.meter.p;
  setTimeout(()=>{ if(S&&S.meter&&(S.meter.k==='sp'||S.meter.k==='spang')) S.meter=null; },700);
  S.pops.push({text,t:0,dur:1.2,col:'#ff5a3c',sub:'',big:.6,small:true}); tone(160,.45,'sawtooth',.06);
}
// the shot's flight; the athlete follows through, then cheers when it lands
function flight(dt,a){
  const j=S.jv; S.pose=j.stuck?POSE.cheer:PUT(a.d);
  if(j.stuck) return;
  j.t+=dt; const u=Math.min(1,j.t/a.T);
  j.x=j.x0+a.R*u; j.y=j.y0*(1-u)+4*a.top*u*(1-u);
  if(u>=1){ j.stuck=true; j.y=.1; S.landX=j.x; tone(120,.15,'square',.06); noise(.15,.2,600); landed(Math.floor((j.x-S.ev.line)*100)/100); }
}
