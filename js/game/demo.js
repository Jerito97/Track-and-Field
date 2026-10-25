// "Cómo se juega": the event plays itself for one attempt (a normal-to-good player: not perfect, not a machine), with a caption for each part and a
// finger showing where to tap or hold. Nothing is saved; touching the screen (or any key) leaves it.
import {CUEPOS} from './core.js';
import {javThrow} from './field.js';
import {DIRS,scope} from './laser.js';
import {LW} from '../canvas.js';
import {onTap} from '../input.js';
import {S} from '../state.js';

// the demo's own taps, so onTap knows they aren't the player's (a player's tap ends the demo)
export let demoTap=false;
let f=0, back=null;
export function startDemo(onEnd){ back=onEnd; f=0; S.demo=true; S.fingers=[]; }
export function endDemo(){ const b=back; back=null; if(S) S.demo=false; if(b) b(); }
const press=pos=>{ demoTap=true; try{ onTap(pos); } finally{ demoTap=false; }
  const o=scope(), [x,y]=S.shot&&DIRS[pos]?[o.cx+DIRS[pos][0]*o.R-10,o.cy+DIRS[pos][1]*o.R-10]:pos==='B'?[LW/2,150]:CUEPOS[pos]?CUEPOS[pos]():[LW/2,150]; S.fingers.push({x,y,t:0}); };
const hold=on=>{ if(!!S.held2===on) return; S.held2=on; S.held2At=performance.now(); };
// one side held (track cycling's pedals)
const holdSide=(k,on)=>{ S.press=S.press||{}; S.pressAt=S.pressAt||{}; if(!!S.press[k]===on) return; S.press[k]=on; S.pressAt[k]=performance.now(); if(on){ const [x,y]=CUEPOS[k](); S.fingers.push({x,y,t:0}); } };

// what to say now, from the game's state
function caption(){
  const ev=S.ev, k=ev.kind, c=S.cue, a=S.act, m=S.meter;
  if(S.phase==='ready'||S.phase==='set') return ev.type==='sprint'?'ESPERÁ EL DISPARO':'TOCÁ PARA EMPEZAR';
  if(ev.swim&&(c&&c.dive||S.dive!=null&&S.dive<.6)) return 'AL DISPARO, LOS DOS ROJOS PARA TIRARTE DEL BLOQUE';
  if(c&&c.type==='pedal') return 'MANTENÉ EL NARANJA DE ESE LADO Y SOLTÁ CUANDO EL ANILLO SE COMPLETA';
  if(ev.cycle&&c&&c.type==='both') return 'AL FINAL, TOCÁ LOS DOS ROJOS JUNTOS PARA TIRAR LA BICI';
  if(c&&c.type==='shoot') return 'EN EL BLANCO APARECE UNA FLECHITA: CUANDO LA VEAS, TOCÁ ESA FLECHA';
  if(ev.relay&&S.chCued) return 'LOS DOS ROJOS CUANDO EL TESTIMONIO LLEGA AL CENTRO VERDE DE LA TABLA';
  if(c&&c.beat) return 'LOS DOS ROJOS JUSTO CUANDO EL ANILLO SE CIERRA SOBRE LA CABEZA';
  if(ev.stroke==='fly'&&m&&m.k==='fly') return 'SOLTÁ CUANDO LA ESTRELLA LLEGUE AL CÍRCULO';
  if(ev.stroke==='fly'&&c&&c.type==='hamhold') return 'MANTENÉ LOS DOS PARA LA BRAZADA';
  if(c&&c.type==='both'&&ev.swim) return S.turned?'AL FINAL, LOS DOS ROJOS PARA TOCAR LA PARED':'LOS DOS ROJOS JUSTO ANTES DE LA PARED PARA DAR LA VUELTA';
  if(c&&c.type==='both'&&ev.type==='sprint') return 'AL FINAL, TOCÁ LOS DOS ROJOS JUNTOS PARA TIRARTE';
  if(c&&c.type==='num') return 'TOCÁ 1, 2 Y 3 BIEN RÁPIDO PARA SALTAR LA VALLA';
  if(k==='ham'){ if(a&&a.stage==='turn') return 'TOCÁ EL VERDE DE CADA LADO: CUANTO MÁS RÁPIDO, MÁS GIRA';
    if(a&&a.stage==='rush') return '¡TOCÁ A LO LOCO, CUALQUIER BOTÓN!';
    if(a&&a.stage==='final') return 'MANTENÉ LOS DOS Y SOLTÁ CUANDO LA ESTRELLA LLEGUE AL CÍRCULO'; }
  if(k==='sp'){ if(a&&a.stage==='power') return 'TOCÁ EL VERDE DE CADA LADO PARA TOMAR FUERZA';
    if(a&&(a.stage==='gap'||a.stage==='angle')) return 'LA AGUJA SUBE: APRETÁ LOS DOS EN LO VERDE';
    if(a&&a.stage==='aim') return 'SIN SOLTAR... SOLTÁ CUANDO LA ESTRELLA LLEGUE AL CÍRCULO'; }
  if(k==='dis'){ if(a&&a.stage==='swing') return 'LOS DOS JUNTOS JUSTO CUANDO EL ANILLO SE CIERRA: ASÍ ARRANCÁS CON MÁS VELOCIDAD';
    if(a&&a.stage==='spin') return 'TOCÁ EL VERDE DE CADA LADO MIENTRAS GIRA';
    if(a&&(a.stage==='gap'||a.stage==='angle')) return 'LA AGUJA SUBE: APRETÁ LOS DOS EN LO VERDE Y SALE EL DISCO'; }
  if(c&&c.type==='foot') return 'TOCÁ EL NARANJA JUSTO CUANDO EL PIE TOCA LA PISTA';
  if(k==='pv'){ if(m&&m.k==='pole'&&m.on) return 'MANTENÉ LOS DOS CUANDO LA ESTRELLA LLEGUE A LA PUNTA';
    if(m&&m.k==='rise') return 'SOLTÁ CUANDO LA ESTRELLA LLEGUE A LA OTRA PUNTA'; }
  if(k==='jav'&&(m&&m.k==='jav'||S.zone&&S.phase==='run')) return 'MANTENÉ LOS DOS Y SOLTÁ CUANDO LAS CHISPAS LLEGUEN A LA PUNTA';
  if(k==='hj'&&a&&a.k==='hj') return 'CUANDO TU ESPALDA ESTÉ SOBRE LA VARILLA, LOS DOS DE NUEVO';
  if((k==='lj'||k==='tj')&&a&&(a.k==='lj'||a.stage==='jump')) return 'EN EL PUNTO MÁS ALTO, LOS DOS DE NUEVO PARA ESTIRARTE';
  if(k==='hj'&&S.zone&&!a) return 'LOS DOS JUNTOS CON EL PIE EN EL VERDE DE LA TABLA';
  if((k==='lj'||k==='tj')&&S.zone) return 'EN EL ROJO, LOS DOS JUNTOS PARA SALTAR PEGADO A LA TABLA';
  if(ev.type==='field'&&S.prep&&S.phase==='run') return 'DESDE EL VERDE NO HAY BOTONES: PREPARATE';
  if(c&&c.type==='side') return ev.swim?'TOCÁ EL VERDE DEL LADO QUE APARECE: CADA ACIERTO ES UNA BRAZADA':ev.type==='sprint'?'TOCÁ EL VERDE DEL LADO QUE APARECE: CADA ACIERTO SUMA VELOCIDAD':'TOCÁ EL VERDE DEL LADO QUE APARECE PARA TOMAR VELOCIDAD';
  return '';
}
// one frame of the autopilot (before the game's update)
export function demoStep(dt){
  f++; S.demoCaption=caption(); S.fingers=S.fingers.filter(x=>(x.t+=dt)<.35);
  const ev=S.ev, k=ev.kind, c=S.cue, a=S.act, m=S.meter;
  if(S.phase==='ready'&&f>40){ press('L'); return; }
  // run-up taps a normal player's pace (sprints a bit faster), the timing parts close but not perfect
  const pace=ev.type==='sprint'?14:k==='sp'||k==='dis'?10:17;
  if(c&&c.type==='side'&&f%pace===0) press(c.side);
  if(c&&c.type==='num'&&f%15===0) press(c.order[c.next]);
  if(c&&c.dive&&c.t>=.25) press('B');
  // cycling: hold the pedal's side, let go close to the end of the ring (now and then a little early; it lets go a
  // frame after deciding, the ring going on ~.03 meanwhile)
  if(c&&c.type==='pedal'&&S.ped){ const f=S.ped; if(f.st==='wait'){ holdSide(f.side==='L'?'R':'L',false); if(f.free){ f.tgt=Math.random()<.6?.97:.86+Math.random()*.06; holdSide(f.side,true); } } else if(f.p>=(f.tgt||.985)) holdSide(f.side,false); }
  if(ev.cycle&&c&&c.type==='both'){ holdSide('L',false); holdSide('R',false); if(ev.dist-S.x<=S.v*.22) press('B'); }
  if(c&&c.type==='shoot'&&S.shot.st==='show'&&S.shot.t>=.75) press(S.shot.dir);
  if(ev.relay&&S.chCued&&c&&c.type==='both'&&S.x+.35>=ev.dist/ev.legs*(S.leg+1)-1.5-.2) press('B');
  if(c&&c.beat&&c.t>=c.T+.04) press('B');
  else if(ev.stroke==='fly'&&!S.dipCued&&!S.turning){ if(c&&c.type==='hamhold') hold(true); else if(m&&m.k==='fly'&&m.hit==null&&m.p>=.9) hold(false); }
  if(c&&c.type==='both'&&!c.beat&&ev.swim&&!S.turned&&ev.pool-S.x<=1.5){ hold(false); press('B'); }
  else if(c&&c.type==='both'&&ev.type==='sprint'&&!ev.cycle&&ev.dist-S.x<=1.2) press('B');
  if((k==='lj'||k==='tj'||k==='hj')&&c&&c.type==='both'){
    if(!a&&ev.line-S.x<=.4) press('B');
    if(a&&a.T&&a.t/a.T>=.36) press('B'); }
  if(k==='tj'&&c&&c.type==='foot'&&a&&(a.stage==='contact'||a.T-a.t<=-.04)) press(c.side);
  if(k==='pv'){ if(m&&m.k==='pole'&&m.on&&m.p>=.92) hold(true); if(m&&m.k==='rise'&&m.p>=.92) hold(false); }
  if(k==='jav'){ if(S.phase==='run'&&S.zone&&ev.line-S.x<15&&!m) hold(true); if(m&&m.k==='jav'&&m.p>=.92&&S.held2){ hold(false); javThrow(); } }
  if(k==='ham'&&a){ if(c&&c.type==='rush'&&f%7===0) press(f%8?'L':'R');
    if(a.stage==='final'&&!m) hold(true); if(m&&m.k==='ham'&&m.p>=.92) hold(false); }
  if(k==='sp'&&a){ if(a.stage==='angle'&&m&&m.p>=44.5) hold(true); if(a.stage==='aim'&&m&&m.p>=.92) hold(false); }
  // discus: a tap as each ring closes (let go in between), the angle a little past the green
  if(k==='dis'&&a){ if(a.stage==='swing'){ if(m&&m.k==='disring'&&m.p>=.97&&!S.held2) hold(true); else if(S.held2&&(!m||m.p<.5)) hold(false); }
    if(a.stage==='spin'&&S.held2) hold(false);
    if(a.stage==='angle'&&m&&m.p>=41.5&&!S.held2) hold(true); if(a.stage==='fly'&&S.held2) hold(false); }
}
