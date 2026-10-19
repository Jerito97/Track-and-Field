// World record lap: after an event with a new world record, before the results table, your athlete runs along the
// track with a flag under «¡NUEVO RÉCORD MUNDIAL!» (as in the original game). Tap to go on.
import {cheer,tone} from '../audio.js';
import {S,setS,setScreen} from '../state.js';
import {hideOv} from '../ui/screens.js';

export function startLap(ev,mark,then){
  setScreen('play'); hideOv();
  setS({ev,phase:'lap',clock:0,pops:[],fx:[],cue:null,replay:null,lap:{mark,then}});
  cheer(); tone(880,.2,'triangle',.06); setTimeout(()=>tone(1175,.3,'triangle',.06),180);
}
// taps count after a moment (so the last tap of the event doesn't skip it)
export function lapNext(){ if(S.clock<1) return; const then=S.lap.then; tone(660,.08,'triangle',.05); then(); }
