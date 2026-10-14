// Static game data: characters, events, scenery palettes
import {ROSTER} from './roster.js';

// athletes from assets/characters/characters.json (via js/roster.js); the extra fields are for the vector fallback
// sprite:true draws that athlete with full-body sprites in 100 m / hurdles / podium (only Yo has them, off for now)
const LOOK={yo:{hair:'curly'}};
export const CHARS=ROSTER.map(r=>{ const p=r.palette;
  return {id:r.id,name:r.name,own:r.own,parts:r.parts||null,anims:r.anims||{},skin:p.piel,hc:p.pelo,j:p.musculosa,j2:p.franja,sh:p.short,shoe:p.zapatillas,hair:'short',...LOOK[r.id]}; });
export const EVENTS=[
 {id:'100',name:'100 metros',tag:'100 M',type:'sprint',dist:100,wr:8.90,
  help:'Tocá el <b>botón verde</b> del lado donde aparece: izquierda o derecha. Cada acierto te da velocidad y cada error te frena. Cerca de la meta aparecen <b>dos botones rojos</b>: tocá los dos a la vez para tirarte de cabeza. Si lo hacés justo al llegar, ganás unas centésimas.'},
 {id:'lj',name:'Salto en largo',tag:'LARGO',type:'field',kind:'lj',line:42,zone:10,wr:9.50,ref:7.9,
  help:'Tocá los <b>botones verdes</b> para tomar carrera. Al llegar a la <b>zona amarilla</b> ya no ganás velocidad: tocá los <b>dos rojos</b> para despegar, lo más cerca posible de la tabla. En el aire, una <b>estrellita</b> recorre el salto: tocá los dos rojos cuando llegue al final. Si pasás la tabla, es <b>nulo</b>. Tenés 3 rondas.'},
 {id:'110h',name:'110 m con vallas',tag:'VALLAS',type:'sprint',hurdles:true,dist:110,wr:12.00,
  help:'Para cada valla aparecen <b>tres botones numerados</b> (salen apenas saltás la anterior). Tocalos en orden: 1, 2 y 3. Al completar los tres, tu atleta salta la valla. Si llegás a la valla sin terminar la tirás, y si tocás el número equivocado perdés velocidad. Cerca de la meta, <b>dos rojos</b>: tocalos juntos para tirarte de cabeza.'},
 {id:'pv',name:'Salto con garrocha',tag:'GARROCHA',type:'field',kind:'pv',line:40,zone:9,wr:6.80,ref:5.5,
  help:'Tocá los <b>botones verdes</b> para correr. En la <b>zona amarilla</b> bajás la garrocha y una <b>estrellita</b> la recorre hasta la punta: tocá los <b>dos rojos</b> cuando llegue al final para clavarla. Al subir, la estrellita va desde el piso hasta arriba: tocá de nuevo cuando llegue arriba para soltarte. Cuanto más cerca de las puntas, más alto. Tenés 3 rondas.'},
 {id:'jav',name:'Lanzamiento de jabalina',tag:'JABALINA',type:'field',kind:'jav',line:38,zone:8,wr:99.00,ref:80,
  help:'Tocá los <b>botones verdes</b> para tomar carrera. En la <b>zona amarilla</b> preparás la jabalina: <b>mantené apretado</b> y unas <b>chispitas</b> recorren la jabalina desde atrás hasta la punta. Soltá lo más cerca posible de la punta. Si pisás la línea, es <b>nulo</b>. Tenés 3 rondas.'}
];
export const HURDLES=Array.from({length:10},(_,i)=>13.72+9.14*i);
export const FAN_SHIRTS=['#e8262d','#2f6fd6','#ffd23a','#1f9e54','#ffffff','#ff8a1f','#8e4fd6','#8fd0f5','#f05a9c'];
export const SKINS=['#f6d0b0','#e9c09a','#c88d63','#8a5a3b','#5e3b26'];
export const HAIRS=['#141414','#5a3a22','#ffd94a','#c46a2a','#9aa0ad','#2b1a12'];
export const BOARDS=[['#ffffff','#e8262d','PISTAZO'],['#e8262d','#ffffff','SUPER JUGO'],['#ffffff','#2f6fd6','TURBO ZAPAS'],['#14284f','#ffd23a','OLIMPIADA'],['#ffffff','#1f9e54','MATE YA'],['#ffd23a','#16161d','CHAMPI']];
export const INK='#16161d', GRAV=9.81;
