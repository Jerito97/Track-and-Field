// Stickman animation: poses from the game state, every movement keyframed and eased by its own progress
// (hurdle jump, take-off, flight, throw, vault...). Angles as in poses.js: limbs from straight down, positive =
// forward; legs[0]/arms[0] = near side. Every pose carries `kind` (which movement it belongs to): drawStick blends
// from one kind to the next, and plays a kind's own motion straight through.
import {POSE,runPose} from './poses.js';

const P=(hip,lean,l0,l1,a0,a1)=>({hip,lean,legs:[{a:l0[0],b:l0[1]},{a:l1[0],b:l1[1]}],arms:[{a:a0[0],b:a0[1]},{a:a1[0],b:a1[1]}]});
const mix=(x,y,t)=>x+(y-x)*t;
const ease=t=>t*t*(3-2*t);
export function lerpPose(A,B,t){
  const L=(p,q)=>({a:mix(p.a,q.a,t),b:mix(p.b,q.b,t)});
  return {hip:mix(A.hip,B.hip,t),lean:mix(A.lean,B.lean,t),legs:[L(A.legs[0],B.legs[0]),L(A.legs[1],B.legs[1])],arms:[L(A.arms[0],B.arms[0]),L(A.arms[1],B.arms[1])]};
}
// pose at progress u along keys [[u0,pose0],[u1,pose1],...], eased between neighbours
function track(kind,keys,u){
  let i=0; while(i<keys.length-2&&u>keys[i+1][0]) i++;
  const [u0,A]=keys[i], [u1,B]=keys[i+1], t=Math.max(0,Math.min(1,(u-u0)/(u1-u0||1)));
  return {...lerpPose(A,B,ease(t)),kind};
}
const clamp01=x=>Math.max(0,Math.min(1,x));
const tag=(J,kind)=>({...J,kind});
// standing: slow breathing, a little sway (ph: per-athlete offset)
function breathe(base,t,ph=0){ const b=Math.sin(t*2.1+ph);
  return {...base,kind:'stand',hip:base.hip-.008*(1+b),lean:base.lean+.02*b,arms:base.arms.map((a,i)=>({a:a.a+.05*Math.sin(t*2.1+ph+i),b:a.b+.04*b}))}; }
const run=(p,amp,arms)=>runPose(p,amp,arms);  // continuous: runPose marks itself run:true

// ---- sprints ----
const HURDLE=[
  [0,P(.8,.3,[.9,1.6],[-.5,.2],[-.6,.8],[1.0,.4])],      // take-off: lead knee up, trail leg pushing
  [.3,P(.8,.62,[1.5,.1],[-.6,1.2],[-.5,1.0],[1.5,.2])],   // lead leg straight over, far arm reaching
  [.62,P(.8,.5,[1.15,.1],[.55,1.9],[.4,.9],[.8,.5])],     // trail knee coming through
  [1,P(.8,.32,[.2,.1],[1.15,1.6],[1.0,1.2],[-.6,1.0])]];  // landing, trail knee high: back to running
const DIP=[[0,P(.78,.45,[.5,.6],[-.6,.5],[.6,1.2],[-.7,1.1])],[.18,P(.72,.85,[-.55,.35],[.75,.45],[-1.3,.3],[-1.0,.2])],[.6,P(.74,.7,[-.3,.3],[.5,.6],[-1.0,.4],[-.8,.3])]];
const TRIP=[[0,P(.66,.95,[.5,1.2],[-.6,.6],[1.6,.3],[1.2,.5])],[.45,P(.52,1.3,[.35,1.3],[-.5,.7],[2.0,.2],[1.5,.3])],[1,P(.76,.5,[.6,1.0],[-.4,.6],[.8,1.2],[-.6,1.1])]];
// o: {blocks,setStage,airU,dipT,tripT,cheer,running,legP,v,clock,lane}
export function sprintPose(o){
  if(o.blocks) return o.setStage>=1?tag(POSE.set,'set'):tag(POSE.crouch,'crouch');
  if(o.airU!=null) return track('hurdle',HURDLE,o.airU);
  if(o.dipT!=null) return track('dip',DIP,o.dipT);
  if(o.tripT>0) return track('trip',TRIP,clamp01(1-o.tripT/.42));
  if(o.cheer) return cheerPose(o.clock,o.lane);
  if(o.running) return run(o.legP,Math.min(1,o.v/4));
  return breathe(POSE.stand,o.clock,o.lane);
}
// celebrating: arms pumping, knees bouncing
export function cheerPose(t,ph=0){ const s=Math.sin(t*7+ph), b=Math.abs(Math.sin(t*3.5+ph));
  return {...P(.8-.05*b,.02,[.1,.08+.25*b],[-.1,.08+.25*b],[2.75+.25*s,.25],[-2.75+.25*s,-.3]),kind:'cheer'}; }
// podium: front-on celebration, one fist up and pumping
export function podiumPose(up,t,ph=0){ if(!up) return breathe(POSE.stand,t,ph);
  const s=Math.sin(t*6+ph); return {...P(.8,0,[.12,.05],[-.12,.05],[2.9+.15*s,.35+.25*s],[-.25,.3]),kind:'podium'}; }

// ---- field events ----
const runPhase=V=>(V.x||0)*2.4;   // same stride as the game's legP
const amp=V=>Math.min(1,(V.v||0)/4);
// long jump
const LJ_TAKE=[[0,P(.78,.25,[.15,.3],[-.7,1.0],[-.8,.6],[.9,.8])],[.5,P(.82,.2,[1.1,1.5],[-.6,.1],[2.0,.3],[1.4,.5])],[1,P(.82,.25,[1.0,1.2],[-.2,1.2],[2.6,.2],[2.4,.3])]];
const LJ_FLY=[[0,LJ_TAKE[2][1]],[.35,P(.82,.05,[.1,1.0],[-.1,1.3],[2.9,.1],[2.7,.1])],[.7,P(.82,.45,[1.0,.5],[.9,.6],[1.6,.2],[1.4,.3])],[1,P(.8,.7,[1.6,.1],[1.5,.15],[.6,.2],[.4,.3])]];
// the push in the air: arms swing up and forward, the legs straighten out in front little by little, the body folds
// toward them only at the end (ready for the sand)
const LJ_STRETCH=[[0,P(.82,.3,[1.2,.8],[1.0,.9],[2.2,.3],[2.0,.3])],[.25,P(.82,.2,[1.35,.2],[1.25,.25],[2.5,.2],[2.3,.25])],[.7,P(.8,.4,[1.5,.1],[1.4,.15],[1.7,.15],[1.5,.2])],[1,P(.72,.7,[1.6,.05],[1.5,.1],[.9,.15],[.7,.2])]];
// landing: from the last flight pose (heels first) sinking into the sand, then sitting, then a fist up
const LJ_LAND=[[0,P(.62,.72,[1.6,.05],[1.5,.1],[.9,.15],[.7,.2])],[.08,P(.4,.78,[1.55,.15],[1.45,.2],[1.1,.2],[.9,.3])],[.15,P(.3,.8,[1.5,.25],[1.4,.3],[1.5,.2],[1.3,.3])],[.45,P(.34,.45,[1.45,.4],[1.35,.5],[.9,.4],[.6,.4])],[1.1,P(.34,.3,[1.4,.5],[1.3,.6],[2.8,.3],[.4,.4])]];
// triple jump bound (hop, step): push off, legs split wide in the air, front foot reaching down for the contact
const TJ_BOUND=[[0,P(.8,.25,[.9,1.4],[-.7,.3],[-.7,.6],[1.0,.6])],[.4,P(.82,.2,[1.1,.6],[-.8,.9],[-.9,.5],[1.3,.4])],[1,P(.8,.25,[.4,.2],[-.6,1.1],[.8,.6],[-.7,.6])]];
// high jump, Fosbury: knee drive at the take-off; then the athlete has turned its back to the bar (drawn facing the
// run-up) and tips over backwards, so lying over the bar "forward" is up: first arched (hips up: body and legs bent
// back, knees hanging), then once the hips are over, folded the other way (legs straight up, chin in) and it comes down
// on its back like that; on the mat the legs come down. The hip stays at the same height (the game moves the body)
const HJ_TAKE=[[0,P(.8,.15,[.2,.3],[-.6,.9],[-.6,.8],[.8,.6])],[1,P(.8,0,[1.2,1.6],[-.3,.2],[2.0,.4],[1.8,.4])]];
const HJ_OVER=[[0,P(.8,-.1,[.3,.5],[-.1,.6],[2.4,.3],[2.2,.4])],[.3,P(.8,-.75,[-.6,1.3],[-.5,1.4],[-.2,.3],[-.3,.3])],[.5,P(.8,-.75,[-.6,1.3],[-.5,1.4],[-.2,.3],[-.3,.3])],
  [.75,P(.8,.35,[1.4,.1],[1.3,.15],[.8,.3],[.6,.3])],[1,P(.8,.35,[1.5,.05],[1.4,.1],[.9,.3],[.7,.3])]];
const HJ_MATP=[[0,HJ_OVER[4][1]],[.25,P(.8,.3,[1.7,.1],[1.6,.15],[1.2,.3],[1.0,.3])],[.75,P(.8,.05,[.25,.4],[.15,.5],[1.6,.3],[1.3,.3])],[1.2,P(.8,.05,[.25,.4],[.15,.5],[1.6,.1],[.9,.3])]];
// javelin (arm 0 holds it)
const JAV_ARM={a:-2.4,b:.55};
const JAV_THROW=[[0,P(.78,-.28,[.55,.1],[-.6,.4],[-2.0,.05],[1.0,.5])],[.45,P(.79,.05,[.5,.05],[-.5,.6],[-3.25,.25],[.4,.8])],[1,P(.78,.4,[.55,.05],[-.35,.8],[-3.9,.1],[-.7,.6])]];
const JAV_FOLLOW=[[0,JAV_THROW[2][1]],[.3,P(.76,.55,[.6,.2],[.3,1.0],[-5.15,.2],[-.9,.5])],[1,P(.78,.3,[.4,.4],[.1,.6],[-5.5,.4],[-.5,.6])]];
// pole vault (both hands on the pole)
const PV_PLANT=[[0,P(.8,.12,[.5,.9],[-.5,.6],[1.8,.6],[1.6,.7])],[.5,P(.82,-.05,[.3,.5],[-.4,.3],[2.8,.1],[2.6,.15])],[1,P(.84,-.1,[.9,1.6],[-.5,.1],[2.9,.05],[2.75,.1])]];
const PV_RISE=[[0,P(.85,0,[.1,.3],[-.2,.4],[2.95,.05],[2.85,.08])],[.35,P(.85,.1,[2.0,2.2],[1.9,2.0],[2.9,.05],[2.8,.1])],[.7,P(.85,-.05,[.05,.1],[-.05,.15],[2.9,.05],[2.8,.1])],[1,P(.85,-.15,[-.2,.1],[.1,.3],[2.5,0],[2.3,.1])]];
const PV_OVER=[[0,P(.85,-.5,[-1.2,-.4],[-1.0,-.6],[2.6,.1],[2.4,.2])],[1,P(.85,-.3,[-.5,.3],[-.3,.4],[3.3,.2],[3.1,.2])]];
// falling and on the mat the body is turned a quarter (head away from the pole, feet toward it) and lies on its back:
// in that turn "backward" is up, so the legs lift with negative angles; arms reaching past the head
const PV_FALL=P(.3,0,[-1.1,.3],[-1.0,.4],[2.9,.1],[2.7,.2]);
const PV_MAT=[[0,PV_FALL],[.3,P(.25,.05,[-.4,.5],[-.3,.6],[2.6,.2],[2.4,.3])],[.9,P(.25,.05,[-.3,.6],[-.2,.7],[-1.7,.3],[2.4,.3])]];

export function fieldPose(V){
  const ev=V.ev, a=V.act, t=V.clock||0, k=ev.kind;
  if(a&&/foul$/.test(a.k)) return a.t>.7&&k!=='jav'?tag(k==='lj'||k==='tj'?POSE.sit:POSE.lie,'foulend'):tag(POSE.stumble,'foul');
  if(k==='hj'){
    if(a&&a.k==='hj'&&a.u!=null){
      if(a.pt!=null) return track('hjmat',HJ_MATP,a.pt);
      if(a.u<.2) return track('hjtake',HJ_TAKE,a.u/.2);
      return track('hjover',HJ_OVER,(a.u-.2)/.8); }
    if((V.v||0)>.2) return run(runPhase(V),amp(V));
    return breathe(POSE.stand,t);
  }
  if(k==='tj'&&a&&a.k==='tj'){
    if(a.stage==='hop'||a.stage==='step') return track('tjbound',TJ_BOUND,a.u??0);
    if(a.stage==='contact') return run(runPhase(V),.6);
  }
  if(k==='lj'||k==='tj'){
    if(a&&(a.k==='lj'||a.stage==='jump')&&a.u!=null){
      if(a.pt!=null) return track('ljland',LJ_LAND,a.pt);
      if(a.u<.3) return track('ljtake',LJ_TAKE,a.u/.3);
      if(a.tapU!=null) return track('ljstretch',LJ_STRETCH,(a.u-a.tapU)/Math.max(.05,1-a.tapU));
      return track('ljfly',LJ_FLY,(a.u-.3)/.7);
    }
    if((V.v||0)>.2) return run(runPhase(V),amp(V));
    return breathe(POSE.stand,t);
  }
  if(k==='jav'){
    if(a&&a.k==='jav'&&V.jv){
      if(V.jv.held) return track('javthrow',JAV_THROW,clamp01((a.t||0)/.3));
      if(V.jv.t<.6) return track('javfollow',JAV_FOLLOW,V.jv.t/.6);
      if((V.v||0)>.6){ const J=run(runPhase(V),.45); return {...J,kind:'javrec',run:false}; }
      if(V.jv.stuck&&V.landX!=null) return cheerPose(t);
      return breathe(P(.8,.02,[.08,.05],[-.08,.05],[2.55,2.3],[.2,.3]),t);  // hand on the forehead, watching it fly
    }
    if(V.meter&&V.meter.k==='jav'){ const p=clamp01(V.meter.p), J=run(runPhase(V),.7);
      const arm0=p<1?{a:mix(JAV_ARM.a,-1.75,ease(p)),b:mix(JAV_ARM.b,.05,ease(p))}:{a:-1.75,b:.05};
      return {...J,run:false,kind:'javpull',lean:mix(J.lean,-.25,ease(p)),arms:[arm0,{a:mix(J.arms[1].a,1.0,p),b:mix(J.arms[1].b,.5,p)}]}; }
    if((V.v||0)>.2) return run(runPhase(V),amp(V),'jav');
    return breathe({...POSE.stand,arms:[JAV_ARM,{a:.3,b:.4}]},t);
  }
  if(k==='pv'){
    if(a&&a.k==='pv'){
      if(a.stage==='plant') return track('pvplant',PV_PLANT,clamp01((a.t||0)/.22));
      if(a.stage==='rise') return track('pvrise',PV_RISE,a.r??0);
      if(a.stage==='over') return track('pvover',PV_OVER,clamp01((a.t||0)/.45));
      if(a.stage==='fall'&&a.pt==null) return tag(PV_FALL,'pvfall');
      if(a.stage==='fall') return track('pvmat',PV_MAT,a.pt);
    }
    if((V.v||0)>.2) return run(runPhase(V),amp(V),'pole');
    return breathe({...POSE.stand,arms:[{a:.9,b:1.3},{a:.6,b:1.5}]},t);
  }
  return V.pose||POSE.stand;
}
