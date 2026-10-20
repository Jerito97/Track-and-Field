// Touch / keyboard input
import {tone,unlockAudio} from './audio.js';
import {cv,LH,LW,OX,OY,PORTRAIT,SC,SH,SW} from './canvas.js';
import {addRing,addX,bad,badNum,COMBO_K,comboQ,gH,gS,judge,sideCue,speedUp,startRun} from './game/core.js';
import {fieldAction,footTap,javThrow} from './game/field.js';
import {demoTap,endDemo} from './game/demo.js';
import {hamRush} from './game/hammer.js';
import {swimBeatHit,swimDiveHit,swimTurnHit} from './game/swim.js';
import {relayHit} from './game/relay.js';
import {laserShoot,scope} from './game/laser.js';
import {lapNext} from './game/lap.js';
import {podiumNext} from './game/podium.js';
import {endReplay} from './game/replay.js';
import {S,screen} from './state.js';
import {showPause} from './ui/screens.js';

export function zoneOf(clientX,three,clientY=0){ const f=clientX/SW;
  // (upright, on the three buttons below the game: the screen's thirds, as they're drawn)
  if(three&&PORTRAIT&&clientY>OY+LH*SC) return f<1/3?'L':(f<2/3?'C':'R');
  if(three){ const lx=(clientX-OX)/SC; return lx<LW/3?'L':(lx<LW*2/3?'C':'R'); }
  return f<.5?'L':'R'; }
// laser run: which arrow a touch is, from where it is around the sight (upright, below the game: around the pad there)
export function arrowOf(x,y){ let cx,cy;
  if(PORTRAIT&&y>OY+LH*SC){ cx=SW/2; cy=(OY+LH*SC+14+SH-18)/2; }
  else { const o=scope(); cx=OX+o.cx*SC; cy=OY+o.cy*SC; }
  const dx=x-cx, dy=y-cy; return Math.abs(dx)>Math.abs(dy)?(dx<0?'L':'R'):(dy<0?'U':'D'); }
export function onTap(pos){
  unlockAudio();
  if(screen!=='play'||!S) return;
  // the tutorial plays itself: a tap of the player's own leaves it
  if(S.demo&&!demoTap){ endDemo(); return; }
  if(S.replay){ endReplay(); return; }
  const ph=S.phase;
  if(ph==='podium'){ podiumNext(); return; }
  if(ph==='lap'){ lapNext(); return; }
  if(ph==='set') return;
  if(ph==='ready'){ startRun(); return; }
  if(!S.cue||S.cue.type==='hold'||S.cue.type==='hamhold'||S.cue.type==='pedal') return;
  const cue=S.cue;
  // laser run: the arrows
  if(cue.type==='shoot'){ laserShoot(pos); return; }
  if(cue.type==='side'){
    if(pos==='C'||pos==='B') return;  // Space/Enter is for the red buttons
    if(pos===cue.side){ speedUp(gS(S.v)); S.lastTap=S.clock; addRing(pos); tone(pos==='L'?330:392,.04,'triangle',.035); sideCue(); }
    else { addX(pos); bad(); }
  } else if(cue.type==='foot'){
    // triple jump: the side of the foot that touches down
    if(pos!=='L'&&pos!=='R') return;
    if(footTap(pos)==='x'){ addX(pos); tone(160,.2,'sawtooth',.04); } else addRing(pos);
  } else if(cue.type==='rush'){
    // hammer's last turn: any button, as fast as you can
    if(hamRush()) addRing(pos==='R'?'R':'L');
  } else if(cue.type==='num'){
    if(S.stumble>0||pos==='B') return;
    const want=cue.order[cue.next];
    // the three numbers are one combo: no speed per tap, one boost when the 3 lands, bigger the faster 1-2-3 went
    if(pos===want){ if(cue.next===0) cue.t0=S.clock; addRing(pos); tone(440+cue.next*110,.05,'triangle',.04); cue.next++;
      if(cue.next>=3){ const q=comboQ(S.clock-cue.t0); speedUp(COMBO_K*gH(S.v)*q); judge(Math.min(1,q)); S.armed=true; S.cue=null; } }
    else { addX(pos); badNum(); }
  } else if(cue.type==='both'){
    if(cue.hold) return;  // pole vault: held, not tapped (see holdStart)
    if(pos==='B'){ addRing('L'); addRing('R'); bothHit(); return; }
    if(pos==='C') return;
    if(S.pend&&S.pend.side!==pos&&S.clock-S.pend.t<.35){ addRing(pos); bothHit(); }
    else { S.pend={side:pos,t:S.clock}; addRing(pos); }
  }
}
export function bothHit(){
  S.pend=null; tone(520,.07,'square',.05);
  // swimming: by the far wall the red buttons are the turn
  if(S.ev.swim&&(swimDiveHit()||swimTurnHit()||swimBeatHit())) return;
  if(S.ev.relay&&relayHit()) return;
  if(S.ev.type==='sprint'){ S.cue=null; S.dip=.5; S.dipT=0; tone(300,.15,'triangle',.05); }
  else fieldAction();
}
export let holdN=0;
let kbHold=false;
// each side held on its own (track cycling's pedals): a finger on that half, or its arrow key
const kbSide={L:false,R:false};
// javelin and pole vault hold BOTH buttons: a finger on each half of the screen, or Space/Enter
const down=new Map();  // pointerId -> 'L' / 'R'
// held2At: the exact moment it changed (the game checks once a frame; timing parts use it to be exact)
const setHeld2=()=>{ const v=[...down.values()], h=kbHold||(v.includes('L')&&v.includes('R')); if(!S) return;
  if(h!==!!S.held2) S.held2At=performance.now(); S.held2=h;
  S.press=S.press||{}; S.pressAt=S.pressAt||{};
  ['L','R'].forEach(k=>{ const on=kbSide[k]||v.includes(k); if(on!==!!S.press[k]) S.pressAt[k]=performance.now(); S.press[k]=on; }); };
export function holdStart(){ setHeld2(); if(screen!=='play'||!S||!S.held2) return; if(S.phase==='run'&&S.zone&&S.ev.kind==='jav'&&!S.meter){ S.meter={k:'jav',p:0}; S.cue=null; tone(500,.06,'triangle',.04); } }
// letting go of either button throws
export function holdEnd(){ setHeld2(); if(screen==='play'&&S&&!S.held2&&S.phase==='run'&&S.meter&&S.meter.k==='jav') javThrow(); }
export function initInput(){
  cv.addEventListener('pointerdown',e=>{ e.preventDefault(); if(screen==='play'&&S&&S.phase!=='podium'&&S.phase!=='lap'&&backHit(e)) return; const c=S&&S.cue; onTap(c&&c.type==='shoot'?arrowOf(e.clientX,e.clientY):zoneOf(e.clientX,!!c&&c.type==='num',e.clientY)); holdN++; down.set(e.pointerId,e.clientX<SW/2?'L':'R'); holdStart(); },{passive:false});
  const relHold=e=>{ holdN=Math.max(0,holdN-1); down.delete(e.pointerId); holdEnd(); };
  addEventListener('pointerup',relHold); addEventListener('pointercancel',relHold);
  addEventListener('keyup',e=>{ if(e.key===' '||e.key==='Enter'){ kbHold=false; holdEnd(); }
    const k=e.key.toLowerCase(), side=k==='arrowleft'||k==='a'||k==='z'?'L':k==='arrowright'||k==='d'||k==='x'?'R':null; if(side){ kbSide[side]=false; setHeld2(); } });
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('keydown',e=>{
    if(screen!=='play'||e.repeat) return; const k=e.key.toLowerCase();
    if((k==='escape'||k==='p')&&S&&S.phase!=='podium'&&S.phase!=='lap'&&!S.replay){ e.preventDefault(); showPause(); return; }
    let pos=null;
    if(S&&S.cue&&S.cue.type==='shoot'&&(k==='arrowup'||k==='w'||k==='arrowdown'||k==='s')) pos=k==='arrowup'||k==='w'?'U':'D';
    else if(k==='arrowleft'||k==='a'||k==='z') pos='L';
    else if(k==='arrowright'||k==='d'||k==='x') pos='R';
    else if(k==='arrowdown'||k==='arrowup'||k==='s') pos='C';
    else if(k===' '||k==='enter') pos='B';
    if(!pos) return; e.preventDefault(); onTap(pos); if(pos==='B'){ kbHold=true; holdStart(); }
    if(pos==='L'||pos==='R'){ kbSide[pos]=true; setHeld2(); }
  });
}
// pause button (bottom left): the game stops and asks to resume or go back to the menu (not during a replay)
export function backHit(e){ const lx=(e.clientX-OX)/SC, ly=(e.clientY-OY)/SC;
  if(lx>0&&lx<38&&ly>284&&ly<322&&!S.replay){ showPause(); return true; } return false; }
