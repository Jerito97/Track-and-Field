// Canvas and letterboxed logical layout (LH=320 logical px tall)
import {clamp} from './utils.js';

export const $=id=>document.getElementById(id);
export const cv=$('game'), ctx=cv.getContext('2d'), OV=$('ov');
export const LH=320;
export let LW=480, SC=1, OX=0, OY=0, DPR=1, SW=480, SH=320, PORTRAIT=false;
// how many times the canvas was resized (resizing clears it)
export let SIZED=0;
// phone upright: the share of the screen's height the game takes (the buttons, the rest)
const PORTRAIT_GAME=.6;
// safe area of the screen (iPhone camera island / notch, home bar), in CSS px
function insets(){ const el=$('safe'); if(!el) return {t:0,r:0,b:0,l:0}; const s=getComputedStyle(el), n=v=>parseFloat(v)||0;
  return {t:n(s.paddingTop),r:n(s.paddingRight),b:n(s.paddingBottom),l:n(s.paddingLeft)}; }
// the screen's safe area at the bottom (the home bar), in CSS px
export const safeBottom=()=>insets().b;
// phone upright: the band below the game that holds the big buttons (CSS px from the top)
export const padArea=()=>({top:OY+LH*SC+12,bot:SH-safeBottom()-10});
export function resize(){
  SW=innerWidth; SH=innerHeight; DPR=Math.min(2,devicePixelRatio||1); SIZED++;
  cv.width=Math.round(SW*DPR); cv.height=Math.round(SH*DPR); cv.style.width=SW+'px'; cv.style.height=SH+'px';
  // the game is laid out inside the safe area, so nothing (name, buttons) goes under the camera or the screen's edge
  const S=insets(), AW=SW-S.l-S.r, AH=SH-S.t-S.b, asp=AW/AH;
  // phone upright: the game as wide as the screen, at the top, taking PORTRAIT_GAME of the height (a narrower view,
  // drawn bigger); the rest below holds the big buttons for the thumbs (render/frame.js drawPads)
  PORTRAIT=asp<.9;
  LW=Math.round(PORTRAIT?clamp(AW/(AH*PORTRAIT_GAME/LH),240,300):clamp(LH*asp,400,720));
  SC=Math.min(AW/LW,AH/LH); OX=S.l+(AW-LW*SC)/2; OY=PORTRAIT?S.t+4:S.t+(AH-LH*SC)/2;
  $('rot').hidden=true;
}
