// Tournament podium ceremony (logic)
import {cheer,tone} from '../audio.js';
import {EVENTS} from '../config.js';
import {S,setS,setScreen} from '../state.js';
import {hideOv,showFinalTable} from '../ui/screens.js';

export function startPodium(order){
  setScreen('play'); hideOv();
  setS({ev:EVENTS[0],phase:'podium',clock:0,pops:[],fx:[],cue:null,replay:null,podium:{order,step:0}});
  cheer();
}
export function podiumNext(){ const p=S.podium; p.step++; tone(660,.08,'triangle',.05); if(p.step>3) showFinalTable(); else cheer(); }
