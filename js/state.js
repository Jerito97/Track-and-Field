// Shared mutable game state
import {CHARS} from './config.js';
import {player} from './storage.js';

// your athlete: the base character ('yo') in your player's colour and name (cached until those change)
let meC=null, meKey='';
export const ME=()=>{ const p=player(), base=CHARS.find(c=>c.id==='yo'), key=p?p.id+p.color+p.name:'';
  if(!meC||key!==meKey){ meC={...base,...(p?{j:p.color,name:p.name}:{})}; meKey=key; } return meC; };
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const colorDist=(a,b)=>{ const x=rgb(a), y=rgb(b); return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]); };

export let ATH=[];
// solo: only you (races of a tournament with friends: nobody else on the track)
export function buildAthletes(solo){
  // 6 athletes per event: you + 5 rivals; of the other 6 athletes, the one whose colour is closest to yours sits out
  const sk=[1.03,1.0,.985,.965,.945].sort(()=>Math.random()-.5), me=ME();
  const pool=CHARS.filter(c=>c.id!=='yo').sort((a,b)=>colorDist(b.j,me.j)-colorDist(a.j,me.j)).slice(0,5);
  const others=pool.sort((a,b)=>CHARS.indexOf(a)-CHARS.indexOf(b));
  ATH=[{C:me,me:true,name:me.name||'Vos',sk:1}].concat(solo?[]:others.map((C,i)=>({C,me:false,name:C.name,sk:sk[i]})));
}
export const G={mode:'single',evIdx:0,res:{},pts:{},total:{}};
export let S=null;
export let screen='menu';
export const setS=v=>{ S=v; };
export const setScreen=v=>{ screen=v; };
