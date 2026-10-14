// Shared mutable game state
import {CHARS} from './config.js';
import {store} from './storage.js';

export let myChar=store.get('odb-char2','yo'); if(!CHARS.find(c=>c.id===myChar)) myChar='yo';
export const ME=()=>CHARS.find(c=>c.id===myChar);
export function setMyChar(id){ myChar=id; store.set('odb-char2',myChar); }

export let ATH=[];
export function buildAthletes(){
  const sk=[1.03,1.0,.985,.965,.945,.93].sort(()=>Math.random()-.5);
  ATH=[{C:ME(),me:true,name:'Vos',sk:1}].concat(CHARS.filter(c=>c.id!==myChar).map((C,i)=>({C,me:false,name:C.name,sk:sk[i]})));
}
export const G={mode:'single',evIdx:0,res:{},pts:{},total:{}};
export let S=null;
export let screen='menu';
export const setS=v=>{ S=v; };
export const setScreen=v=>{ screen=v; };
