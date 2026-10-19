// Shot put, in two parts. Rhythm: from the back of the circle, three green buttons (left, right, left), each with a ring
// closing on it: tap as the ring reaches the button; the closer, the more power. Angle: then hold both buttons and a
// needle rises on a gauge beside the athlete; let go in the green (about 40°). Too low it hits the grass soon, too high
// it goes up and comes down close. Not holding in time: the athlete loses balance and steps out of the circle (no mark).
import {noise,tone} from '../audio.js';
import {POSE} from '../poses.js';
import {S} from '../state.js';
import {clamp} from '../utils.js';
import {judge} from './core.js';
import {landed} from './field.js';

// the beats: the first FIRST s after starting, then every BEAT s; each button shows LEAD s before its beat
const BEATS=['L','R','L'], FIRST=.9, BEAT=.55, LEAD=.6;
// tap window (s): perfect within OK, nothing left EARLY before / LATE after the beat
const OK=.06, EARLY=.22, LATE=.16, LAG=.03;
// the needle: degrees per second, where it stops (and the shot goes off), the best angle and the green around it
export const SP_RATE=70, SP_MAX=80, SP_BEST=40, SP_GREEN=6;
// without holding, the athlete steps out after this long (s); a hold shorter than BLIP s doesn't count
const WAIT=2, BLIP=.12;
// throw length (m): full power at the best angle
const SP_K=21.5;
// the athlete glides across the circle with the beats (hip from FROM to TO, m from the circle's centre)
const FROM=-.6, TO=.35;
const qWin=e=>Math.abs(e)<=OK?1:e<0?clamp(1+(e+OK)/(EARLY-OK),0,1):clamp(1-(e-OK)/(LATE-OK),0,1);
const beatAt=k=>FIRST+k*BEAT;
// how good an angle (degrees) is: 1 at SP_BEST, nothing at 0 and at twice it
export const angleQ=d=>Math.max(0,Math.sin(Math.PI*clamp(d/(2*SP_BEST),0,1)));

// crouched with the shot at the neck, sliding back to front; then the put: arm straight out at the release angle
const GLIDE=k=>({kind:'spglide',hip:.62+.06*k,lean:.55-.35*k,legs:[{a:.5+.3*k,b:1.1-.5*k},{a:-.5,b:.6}],arms:[{a:-.35,b:2.7},{a:.9,b:.6}]});
const PUT=d=>{ const r=d*Math.PI/180; return {kind:'spput',hip:.8,lean:.25,legs:[{a:.45,b:.1},{a:-.55,b:.5}],arms:[{a:Math.PI/2+r,b:.05},{a:-.8,b:.6}]}; };

export function startShot(){ S.cue=null; S.v=0; S.x=FROM; S.act={k:'sp',stage:'beats',t:0,n:0,q:0}; S.phase='act'; tone(600,.06,'triangle',.04); }
export function updateShot(dt){
  const a=S.act; a.t+=dt;
  if(a.stage==='beats'){
    const at=beatAt(a.n);
    if(!S.cue&&a.n<BEATS.length&&a.t>=at-LEAD) S.cue={type:'beat',side:BEATS[a.n],at,t:0};
    // not tapped in time: no power from this beat
    if(S.cue&&S.cue.type==='beat'&&a.t>at+LATE+LAG) beat(0);
    S.x=FROM+(TO-FROM)*clamp(a.t/beatAt(BEATS.length-1),0,1); S.pose=GLIDE(clamp(a.t/beatAt(BEATS.length-1),0,1));
  } else if(a.stage==='aim'){
    const m=S.meter;
    // a fresh hold: fingers still down from the beats don't start it
    if(!S.held2) a.free=true;
    if(!m&&S.held2&&a.free){ S.meter={k:'sp',p:0,t:0}; S.cue=null; tone(500,.06,'triangle',.04); }
    else if(m&&m.hit==null){ m.t+=dt; m.p=Math.min(SP_MAX,m.p+SP_RATE*dt);
      if(!S.held2&&m.t<BLIP){ S.meter=null; S.cue={type:'hamhold',t:0}; }
      else if(!S.held2||m.p>=SP_MAX) put(a); }
    else if(!m&&a.t>WAIT) out(a);
    S.pose=GLIDE(1);
  } else if(a.stage==='fly') flight(dt,a);
  else if(a.stage==='out'){ S.x+=dt*1.2*Math.max(0,1-a.t*1.5); S.pose=POSE.stumble; if(a.t>.8){ a.stage='done'; landed(null); } }
}
// a beat's button
export function shotTap(side){
  const a=S.act, c=S.cue; if(S.phase!=='act'||!a||a.k!=='sp'||a.stage!=='beats'||!c||c.type!=='beat') return;
  if(side!==c.side){ beat(0); return 'x'; }
  const e=a.t-c.at-LAG; beat(e<-EARLY?0:qWin(e)); return 'ok';
}
function beat(q){
  const a=S.act; S.cue=null; a.q+=q; a.n++; judge(q); tone(380+a.n*90,.07,'triangle',.05);
  if(a.n>=BEATS.length){ a.stage='aim'; a.t=0; a.free=!S.held2; S.cue={type:'hamhold',t:0}; }
}
function put(a){
  const m=S.meter, d=clamp(m.p-LAG*SP_RATE,0,SP_MAX), g=angleQ(d), power=.55+.15*a.q;
  m.hit=m.p; judge(g); noise(.2,.12,1800); tone(260,.25,'triangle',.05);
  setTimeout(()=>{ if(S&&S.meter&&S.meter.k==='sp') S.meter=null; },700);
  const R=Math.max(3,SP_K*power*(.35+.65*g)), r=d*Math.PI/180, x0=S.x+.55, y0=2.1;
  a.stage='fly'; a.t=0; a.d=d; a.R=R-(x0-S.ev.line); a.T=.8+.045*R; a.top=Math.max(.3,a.R*Math.tan(r)/4);
  S.jv={held:false,x:x0,y:y0,x0,y0,t:0,ham:true};
}
function out(a){
  a.stage='out'; a.t=0; S.cue=null;
  S.pops.push({text:'¡TE SALISTE DEL CÍRCULO!',t:0,dur:1.2,col:'#ff5a3c',sub:'',big:.6,small:true}); tone(160,.45,'sawtooth',.06);
}
// the shot's flight; the athlete follows through, then cheers when it lands
function flight(dt,a){
  const j=S.jv; S.pose=j.stuck?POSE.cheer:PUT(a.d);
  if(j.stuck) return;
  j.t+=dt; const u=Math.min(1,j.t/a.T);
  j.x=j.x0+a.R*u; j.y=j.y0*(1-u)+4*a.top*u*(1-u);
  if(u>=1){ j.stuck=true; j.y=.1; S.landX=j.x; tone(120,.15,'square',.06); noise(.15,.2,600); landed(Math.floor((j.x-S.ev.line)*100)/100); }
}
