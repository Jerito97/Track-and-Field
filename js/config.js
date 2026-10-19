// Static game data: characters, events, scenery palettes
import {ROSTER} from './roster.js';

// athletes from assets/characters/characters.json (via js/roster.js); the extra fields are for the vector fallback
// sprite:true draws that athlete with full-body sprites in 100 m / hurdles / podium (only Yo has them, off for now)
const LOOK={yo:{hair:'curly'}};
export const CHARS=ROSTER.map(r=>{ const p=r.palette;
  return {id:r.id,name:r.name,own:r.own,parts:r.parts||null,anims:r.anims||{},skin:p.piel,hc:p.pelo,j:p.musculosa,j2:p.franja,sh:p.short,shoe:p.zapatillas,hair:'short',...LOOK[r.id]}; });
// cpu: the middle machine's mark (about a casual player's); the others spread around it by their skill (sk)
export const EVENTS=[
 {id:'100',name:'100 metros',tag:'100 M',type:'sprint',dist:100,cpu:12.2,
  help:'Tocá el <b>botón verde</b> del lado donde aparece: izquierda o derecha. Cada acierto te da velocidad y cada error te frena. Si dejás de tocar, vas <b>perdiendo velocidad</b> de a poco. Cerca de la meta aparecen <b>dos botones rojos</b>: tocá los dos a la vez para tirarte de cabeza. Si lo hacés justo al llegar, ganás unas centésimas.'},
 {id:'lj',name:'Largo',tag:'LARGO',type:'field',kind:'lj',line:55,zone:4,bands:[14,9,4],cpu:7.3,
  help:'<b>1. Correr:</b> tocá los <b>botones verdes</b> para tomar velocidad. <b>2. Saltar:</b> antes de la tabla el piso se pinta de <b>verde, amarillo y rojo</b>. Desde el verde ya no hay botones: mantenés la velocidad y te preparás. En el rojo aparecen <b>dos botones rojos</b>: tocalos juntos para despegar, lo más pegado posible a la tabla. Si la pisás, es <b>nulo</b>. <b>3. Impulso en el aire:</b> tocá de nuevo los dos rojos <b>en el punto más alto</b> del salto para darte un empujón y llegar más lejos. Cuanto más cerca del punto más alto, más empuja. Tenés 3 rondas.'},
 {id:'110h',name:'110 m con vallas',tag:'VALLAS',type:'sprint',hurdles:true,dist:110,cpu:15.0,
  help:'Para cada valla aparecen <b>tres botones numerados</b> (salen apenas saltás la anterior). Tocalos en orden: 1, 2 y 3. Los tres son un conjunto: <b>cuanto más rápido los toques, más velocidad ganás</b> al completar el 3, y tu atleta salta la valla. Si llegás a la valla sin terminar, la tirás; si tocás el número equivocado, perdés velocidad. Cerca de la meta, <b>dos rojos</b>: tocalos juntos para tirarte de cabeza.'},
 {id:'pv',name:'Garrocha',tag:'GARROCHA',type:'field',kind:'pv',line:60,zone:18,bands:[18,12,6],cpu:5.2,
  help:'Tocá los <b>botones verdes</b> para correr. Antes del cajón el piso se pinta de <b>verde, amarillo y rojo</b> (ahí ya no hay botones verdes). La garrocha <b>baja sola</b> y una <b>estrellita</b> la recorre hasta la punta: cuando llegue a la punta, <b>apretá y mantené los dos botones naranjas</b> (dos dedos, o Espacio) para clavarla. Cuanto más cerca de la punta, más impulso. Seguí apretando mientras subís y <b>soltá</b> cuando la estrellita llegue a la otra punta. Si llegás al cajón sin clavarla, es nulo. Tenés 3 rondas.'},
 {id:'jav',name:'Jabalina',tag:'JABALINA',type:'field',kind:'jav',line:57,zone:18,bands:[18,12,6],cpu:72,
  help:'Tocá los <b>botones verdes</b> para tomar carrera. Antes de la línea el piso se pinta de <b>verde, amarillo y rojo</b>: desde el verde ya no hay botones verdes y mantenés la velocidad. Cuando quieras, <b>mantené apretados los dos botones</b> (un dedo en cada uno, o Espacio) y unas <b>chispitas</b> recorren la jabalina desde atrás hasta la punta: soltá lo más cerca posible de la punta. Después de soltar seguís avanzando unos metros: si pasás la línea, aunque ya la hayas tirado, es <b>nulo</b>. Tenés 3 rondas.'},
 {id:'tj',name:'Salto triple',tag:'TRIPLE',type:'field',kind:'tj',line:55,zone:4,bands:[14,9,4],cpu:16,extra:true,
  help:'<b>1. Correr y despegar:</b> igual que en largo: <b>botones verdes</b> para tomar velocidad y, en el rojo, los <b>dos rojos</b> juntos lo más pegado posible a la tabla. Si la pisás, es <b>nulo</b>. <b>2. Dos apoyos:</b> la arena está lejos, así que antes de llegar apoyás dos veces. Aparece un <b>botón naranja</b> del lado del pie que apoya: primero el <b>derecho</b> y después el <b>izquierdo</b>. Tocalo <b>justo cuando el pie toca la pista</b>: cuanto más justo, <b>más impulso</b> para el salto siguiente; si te apurás, llegás tarde o tocás el otro lado, <b>trastabillás</b> y el siguiente salto sale corto. <b>3. El salto final:</b> como en largo, tocá los dos rojos <b>en el punto más alto</b> para estirarte. La marca se mide desde la tabla. Tenés 3 rondas.'},
 {id:'ham',name:'Martillo',tag:'MARTILLO',type:'field',kind:'ham',line:1.07,cpu:50,extra:true,
  help:'Tres partes. <b>1. Girar:</b> como en los 100 metros, tocá los <b>botones verdes</b> del lado donde aparecen: cada acierto gira más rápido y cada error te frena; si dejás de tocar, vas perdiendo velocidad. <b>2. Giro final:</b> aparece <b>¡TOCÁ RÁPIDO!</b>: durante un segundo y medio tocá <b>lo más rápido que puedas</b>, cualquier botón. Cada toque suma distancia. <b>3. Puntería:</b> después de un instante aparece <b>¡AHORA APUNTÁ!</b>: <b>mantené apretados los dos botones</b> (un dedo en cada uno, o Espacio): arriba de tu atleta una <b>estrellita</b> recorre una barra; <b>soltá cuando llegue al círculo</b> de la punta. Si soltás muy temprano pega en la <b>red</b> y si te pasás cae <b>afuera del sector</b>: es nulo. Tenés 3 rondas.'}
];
// the classic five: survival and the tournament against the machines (the newer ones, extra:true, are on their
// own, in the online tournaments and on the boards)
export const CLASSIC=EVENTS.filter(e=>!e.extra);
// 9 hurdles 11.3 m apart (more time than the real 10 x 9.14 m to tap the three numbers at full speed); the last one 7 m before the line
// events still being tried out: only the admin sees them (in the events screen, tagged EN PRUEBA); they're not in
// tournaments, survival, the world boards or profiles. To publish one, move it into EVENTS.
export const BETA=[
 {id:'hj',name:'Salto en alto',tag:'ALTO',type:'field',kind:'hj',line:55,zone:4,bands:[14,9,4],cpu:2.05,beta:true,
  help:'Como el largo. <b>1. Correr:</b> tocá los <b>botones verdes</b> para tomar velocidad; antes de la tabla de despegue el piso se pinta de <b>verde, amarillo y rojo</b>. <b>2. Picar:</b> en el rojo, tocá los <b>dos rojos</b> juntos con el pie en el <b>centro de la tabla</b> (lo verde): cuanto más rápido venís y más al centro picás, más alto. Antes o pasado del centro saltás menos (no hay nulo). <b>3. Arquearte:</b> te das vuelta y pasás de espaldas sobre la varilla: tocá los dos rojos de nuevo <b>justo cuando tu espalda está arriba de la varilla</b> para arquearte y sumar centímetros. Tenés 3 rondas.'},
 {id:'sp',name:'Lanzamiento de bala',tag:'BALA',type:'field',kind:'sp',line:1.07,cpu:11.5,beta:true,
  help:'Tres partes. <b>1. Impulso:</b> como en los 100 metros, tocá los <b>botones verdes</b> del lado donde aparecen mientras tu atleta se desliza por el círculo: cuanto más rápido, más fuerza. <b>2. Ángulo:</b> después de una pausita aparece un <b>medidor</b> y la aguja <b>sube sola y no vuelve</b>: <b>apretá y mantené los dos botones</b> (un dedo en cada uno, o Espacio) cuando esté en la <b>zona verde</b> (39° a 41°, lo mejor); el <b>naranja</b> de los costados también sirve, pero un poco menos. Si llega arriba sin que aprietes, es <b>nulo</b>. <b>3. Suelta:</b> sin soltar, arriba de tu atleta una <b>estrellita</b> recorre una barra: <b>soltá cuando llegue al círculo</b>. Si te pasás, te salís del círculo y es <b>nulo</b>. Tenés 3 rondas.'}
];
// an event by index: EVENTS first, then BETA
export const evAt=i=>i<EVENTS.length?EVENTS[i]:BETA[i-EVENTS.length];
export const HURDLES=Array.from({length:9},(_,i)=>12.5+11.3*i);
export const FAN_SHIRTS=['#e8262d','#2f6fd6','#ffd23a','#1f9e54','#ffffff','#ff8a1f','#8e4fd6','#8fd0f5','#f05a9c'];
export const SKINS=['#f6d0b0','#e9c09a','#c88d63','#8a5a3b','#5e3b26'];
export const HAIRS=['#141414','#5a3a22','#ffd94a','#c46a2a','#9aa0ad','#2b1a12'];
export const BOARDS=[['#ffffff','#e8262d','PISTAZO'],['#e8262d','#ffffff','SUPER JUGO'],['#ffffff','#2f6fd6','TURBO ZAPAS'],['#14284f','#ffd23a','TRACK & FIELD'],['#ffffff','#1f9e54','MATE YA'],['#ffd23a','#16161d','CHAMPI']];
export const INK='#16161d', GRAV=9.81;
