// Touch / keyboard input
import {tone,unlockAudio} from './audio.js';
import {cv,LW,OX,OY,SC,SW} from './canvas.js';
import {addRing,addX,bad,COMBO_K,comboQ,gH,gS,judge,NUM_DX,sideCue,startRun} from './game/core.js';
import {fieldAction,javThrow} from './game/field.js';
import {podiumNext} from './game/podium.js';
import {endReplay} from './game/replay.js';
import {S,screen} from './state.js';
import {showPause} from './ui/screens.js';

export function zoneOf(clientX,three){ const f=clientX/SW;
  if(three){ const lx=(clientX-OX)/SC, h=NUM_DX()/2; return lx<LW/2-h?'L':(lx<LW/2+h?'C':'R'); }
  return f<.5?'L':'R'; }
export function onTap(pos){
  unlockAudio();
  if(screen!=='play'||!S) return;
  if(S.replay){ endReplay(); return; }
  const ph=S.phase;
  if(ph==='podium'){ podiumNext(); return; }
  if(ph==='set') return;
  if(ph==='ready'){ startRun(); return; }
  if(!S.cue||S.cue.type==='hold') return;
  const cue=S.cue;
  if(cue.type==='side'){
    if(pos==='C'||pos==='B') return;  // Space/Enter is for the red buttons
    if(pos===cue.side){ S.v+=gS(S.v); S.lastTap=S.clock; addRing(pos); tone(pos==='L'?330:392,.04,'triangle',.035); sideCue(); }
    else { addX(pos); bad(); }
  } else if(cue.type==='num'){
    if(S.stumble>0||pos==='B') return;
    const want=cue.order[cue.next];
    // the three numbers are one combo: no speed per tap, one boost when the 3 lands, bigger the faster 1-2-3 went
    if(pos===want){ if(cue.next===0) cue.t0=S.clock; addRing(pos); tone(440+cue.next*110,.05,'triangle',.04); cue.next++;
      if(cue.next>=3){ const q=comboQ(S.clock-cue.t0); S.v+=COMBO_K*gH(S.v)*q; judge(Math.min(1,q)); S.armed=true; S.cue=null; } }
    else { addX(pos); bad(); }
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
  if(S.ev.type==='sprint'){ S.cue=null; S.dip=.5; S.dipT=0; tone(300,.15,'triangle',.05); }
  else fieldAction();
}
export let holdN=0;
let kbHold=false;
// javelin and pole vault hold BOTH buttons: a finger on each half of the screen, or Space/Enter
const down=new Map();  // pointerId -> 'L' / 'R'
const setHeld2=()=>{ const v=[...down.values()]; if(S) S.held2=kbHold||(v.includes('L')&&v.includes('R')); };
export function holdStart(){ setHeld2(); if(screen!=='play'||!S||!S.held2) return; if(S.phase==='run'&&S.zone&&S.ev.kind==='jav'&&!S.meter){ S.meter={k:'jav',p:0}; S.cue=null; tone(500,.06,'triangle',.04); } }
// letting go of either button throws
export function holdEnd(){ setHeld2(); if(screen==='play'&&S&&!S.held2&&S.phase==='run'&&S.meter&&S.meter.k==='jav') javThrow(); }
export function initInput(){
  cv.addEventListener('pointerdown',e=>{ e.preventDefault(); if(screen==='play'&&S&&S.phase!=='podium'&&backHit(e)) return; const three=!!(S&&S.cue&&S.cue.type==='num'); onTap(zoneOf(e.clientX,three)); holdN++; down.set(e.pointerId,e.clientX<SW/2?'L':'R'); holdStart(); },{passive:false});
  const relHold=e=>{ holdN=Math.max(0,holdN-1); down.delete(e.pointerId); holdEnd(); };
  addEventListener('pointerup',relHold); addEventListener('pointercancel',relHold);
  addEventListener('keyup',e=>{ if(e.key===' '||e.key==='Enter'){ kbHold=false; holdEnd(); } });
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('keydown',e=>{
    if(screen!=='play'||e.repeat) return; const k=e.key.toLowerCase();
    if((k==='escape'||k==='p')&&S&&S.phase!=='podium'&&!S.replay){ e.preventDefault(); showPause(); return; }
    let pos=null;
    if(k==='arrowleft'||k==='a'||k==='z') pos='L';
    else if(k==='arrowright'||k==='d'||k==='x') pos='R';
    else if(k==='arrowdown'||k==='arrowup'||k==='s') pos='C';
    else if(k===' '||k==='enter') pos='B';
    if(!pos) return; e.preventDefault(); onTap(pos); if(pos==='B'){ kbHold=true; holdStart(); }
  });
}
// pause button (bottom left): the game stops and asks to resume or go back to the menu (not during a replay)
export function backHit(e){ const lx=(e.clientX-OX)/SC, ly=(e.clientY-OY)/SC;
  if(lx>0&&lx<38&&ly>284&&ly<322&&!S.replay){ showPause(); return true; } return false; }
