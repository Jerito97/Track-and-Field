// Canvas text helper
import {ctx} from '../canvas.js';
import {INK} from '../config.js';

export function txt(t,x,y,col,size,{align='center',stroke=INK,lw=3}={}){
  ctx.font=`${size}px Bangers, Impact, sans-serif`; ctx.textAlign=align; ctx.textBaseline='middle';
  if(stroke){ ctx.lineWidth=lw; ctx.strokeStyle=stroke; ctx.lineJoin='round'; ctx.strokeText(t,x,y); }
  ctx.fillStyle=col; ctx.fillText(t,x,y);
}
