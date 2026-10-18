// Image assets. Rig pieces: assets/characters/<id>/<piece>.png, listed in js/roster.js by tools/build_characters.py.
// Optional full-body sprites (only Yo has them): assets/characters/yo/sprites/<name>.png, manifest below.
import {CHARS} from './config.js';
import {STYLE} from './storage.js';

// sprites: w,h = image size; hx = hip x in image px (feet are the bottom edge)
const BASE=new URL('../assets/characters/',import.meta.url);
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
// the javelin on its own (assets/javelin.png): flying, stuck in the grass, and under the drawn frames
export const JAV_ART=new Image();
// the pole on its own (assets/pole.png, grip on the left): bent and drawn by the pole vault
export const POLE_ART=new Image();
// rig parts per athlete id: {head:{im,dark,w,h,px,py}, ...}
export const RIGS={};
// animations per athlete id: {run:{im (strip of frames side by side), frames (count), w,h,hx,feet,scale}, start:{...}, ...}
export const ANIMS={};
// resolves once every image has loaded (or failed); drawing code falls back to vector art for anything missing
export function loadAssets(){
  const waits=[];
  const load=(im,src)=>{ waits.push(new Promise(res=>{ im.addEventListener('load',res,{once:true}); im.addEventListener('error',res,{once:true}); })); im.src=src; };
  if(CHARS.some(C=>C.sprite)) Object.entries(YO_SPRITES).forEach(([k,v])=>{ const im=new Image(); SPR[k]={im,w:v.w,h:v.h,hx:v.hx}; load(im,url('yo','sprites',k)); });
  const rigPart=(set,k,v,src)=>{ const im=new Image(); const P={im,dark:null,w:v.w,h:v.h,px:v.px,py:v.py}; set[k]=P;
    // darker copy for the far-side limbs
    im.addEventListener('load',()=>{ const c=document.createElement('canvas'); c.width=v.w; c.height=v.h; const g=c.getContext('2d'); g.drawImage(im,0,0); g.globalCompositeOperation='source-atop'; g.fillStyle='rgba(20,10,30,.28)'; g.fillRect(0,0,v.w,v.h); P.dark=c; });
    load(im,src); };
  // stickman style: the drawn characters' images aren't needed
  if(!STYLE.stick) CHARS.forEach(C=>{ if(!C.parts) return; const set=RIGS[C.id]={};
    Object.entries(C.parts).forEach(([k,v])=>rigPart(set,k,v,new URL(v.file,BASE).href)); });
  if(!STYLE.stick) CHARS.forEach(C=>{ const set=ANIMS[C.id]={};
    Object.entries(C.anims).forEach(([name,{file,...meta}])=>{ const im=new Image(); load(im,new URL(file,BASE).href); set[name]={...meta,im}; }); });
  load(JAV_ART,new URL('../assets/javelin.png',import.meta.url).href);
  load(POLE_ART,new URL('../assets/pole.png',import.meta.url).href);
  return Promise.all(waits);
}
