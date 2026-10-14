// Image assets. Yo: assets/characters/yo/{rig,sprites}/<name>.png (manifest below).
// Everyone else: assets/characters/<id>/<piece>.png, listed in js/roster.js by tools/build_characters.py.
import {CHARS} from './config.js';

// rig parts: w,h = image size; px,py = pivot (joint) in image px
// sprites:   w,h = image size; hx = hip x in image px (feet are the bottom edge)
const BASE=new URL('../assets/characters/',import.meta.url);
const YO_RIG={
  uarm:{w:49,h:153,px:28.0,py:15.3},
  head:{w:149,h:193,px:72.5,py:183.3},
  torso:{w:110,h:166,px:59.7,py:152.7},
  shorts:{w:139,h:134,px:69.5,py:16.1},
  farm:{w:42,h:166,px:19.2,py:16.6},
  thigh:{w:72,h:159,px:27.4,py:9.5},
  shin:{w:96,h:164,px:23.6,py:9.8}
};
const YO_SPRITES={
  crouch:{w:119,h:116,hx:94.4},
  set:{w:136,h:114,hx:110.9},
  run1:{w:95,h:139,hx:53.6},
  run2:{w:84,h:140,hx:47.5},
  run3:{w:92,h:138,hx:50.7},
  run4:{w:109,h:123,hx:79.8},
  run5:{w:99,h:119,hx:67.7},
  hurdle:{w:114,h:104,hx:65.3},
  dip:{w:146,h:97,hx:120.8},
  stand:{w:43,h:144,hx:18.5},
  cheer:{w:66,h:156,hx:28.9},
  face:{w:96,h:96,hx:48}
};
const url=(who,kind,k)=>new URL(`${who}/${kind}/${k}.png`,BASE).href;

export const SPR={};
export const PARTS={};
// rig parts per athlete id: {head:{im,dark,w,h,px,py}, ...}
export const RIGS={yo:PARTS};
// resolves once every image has loaded (or failed); drawing code falls back to vector art for anything missing
export function loadAssets(){
  const waits=[];
  const load=(im,src)=>{ waits.push(new Promise(res=>{ im.addEventListener('load',res,{once:true}); im.addEventListener('error',res,{once:true}); })); im.src=src; };
  Object.entries(YO_SPRITES).forEach(([k,v])=>{ const im=new Image(); SPR[k]={im,w:v.w,h:v.h,hx:v.hx}; load(im,url('yo','sprites',k)); });
  const rigPart=(set,k,v,src)=>{ const im=new Image(); const P={im,dark:null,w:v.w,h:v.h,px:v.px,py:v.py}; set[k]=P;
    // darker copy for the far-side limbs
    im.addEventListener('load',()=>{ const c=document.createElement('canvas'); c.width=v.w; c.height=v.h; const g=c.getContext('2d'); g.drawImage(im,0,0); g.globalCompositeOperation='source-atop'; g.fillStyle='rgba(20,10,30,.28)'; g.fillRect(0,0,v.w,v.h); P.dark=c; });
    load(im,src); };
  Object.entries(YO_RIG).forEach(([k,v])=>rigPart(PARTS,k,v,url('yo','rig',k)));
  CHARS.forEach(C=>{ if(!C.parts) return; const set=RIGS[C.id]={};
    Object.entries(C.parts).forEach(([k,v])=>rigPart(set,k,v,new URL(v.file,BASE).href)); });
  return Promise.all(waits);
}
