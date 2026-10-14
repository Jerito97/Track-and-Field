// Canvas and letterboxed logical layout (LH=320 logical px tall)
import {clamp} from './utils.js';

export const $=id=>document.getElementById(id);
export const cv=$('game'), ctx=cv.getContext('2d'), OV=$('ov');
export const LH=320;
export let LW=480, SC=1, OX=0, OY=0, DPR=1, SW=480, SH=320;
export function resize(){
  SW=innerWidth; SH=innerHeight; DPR=Math.min(2,devicePixelRatio||1);
  cv.width=Math.round(SW*DPR); cv.height=Math.round(SH*DPR); cv.style.width=SW+'px'; cv.style.height=SH+'px';
  const asp=SW/SH; LW=Math.round(clamp(LH*asp,400,720));
  SC=Math.min(SW/LW,SH/LH); OX=(SW-LW*SC)/2; OY=(SH-LH*SC)/2;
  $('rot').hidden=asp>=1;
}
