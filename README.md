# Track and Field

Juego de atletismo para el navegador: 100 m, salto en largo, 110 m con vallas, salto con garrocha, jabalina y modo torneo.

## Cómo correrlo

El JS usa módulos ES, así que el navegador no lo carga con doble clic (`file://`). Hay que servir la carpeta con cualquier servidor estático:

```sh
python3 -m http.server 8000
# o
npx serve .
```

y abrir <http://localhost:8000>.

## Estructura

```
index.html              página (canvas + overlay de menús)
css/styles.css          estilos de los menús y tablas
assets/characters/
  characters.json       atletas: id, nombre y paleta (lo editás vos)
  base/*.png            personaje base en piezas (de él salen todos los rivales)
  base/<anim>/          animaciones del base: run, start, cheer, dip, trip, stand, hurdle, ljtakeoff, ljflight, ljstretch, ljland, javstand, javrun, javpull, javthrow, javafter, pvstand, pvrun, pvplant, pvswing, pvover, pvland; cuadros + meta.json
  <id>/*.png            piezas de cada atleta (generadas o propias)
  <id>/<anim>.png       animaciones de cada atleta: todos los cuadros en fila en una imagen (generadas;
                        un cuadro propio va en <id>/<anim>/<anim>N.png y reemplaza al generado)
  yo/sprites/*.png      sprites viejos de cuerpo entero de Yo (desactivados)
assets/source/          hojas originales del personaje base (piezas, vistas, carrera)
tools/
  build_characters.py   genera las piezas de cada atleta y js/roster.js
  cut_base_sheet.py     recorta la hoja del personaje base en piezas
  cut_sprite_sheet.py   recorta una hoja de animación (fondo blanco) en cuadros alineados
  javelin_split.py      separa figuras cuyas jabalinas cruzan a los vecinos (lo usa cut_sprite_sheet.py)
js/
  main.js               arranque y loop principal
  config.js             datos: pruebas, colores; arma los atletas desde roster.js
  roster.js             GENERADO por tools/build_characters.py
  state.js              estado compartido (S, G, pantalla, atletas)
  storage.js            localStorage y récords
  audio.js              sonidos
  canvas.js             canvas y escalado (320 px lógicos de alto)
  assets.js             carga de imágenes (piezas de cada atleta, sprites opcionales)
  input.js              toques y teclado
  poses.js              poses del esqueleto
  rig.js                dibujo con piezas (drawAthlete) y sprites
  draw/character.js     muñeco vectorial (respaldo si una imagen no carga)
  game/                 lógica: core, sprint, field, replay, podium, scoring
  render/               dibujo: escenario, pista, campo, HUD, podio
  ui/screens.js         pantallas HTML (menú, ficha de la prueba, tablas)
```

## Jugabilidad

- **100 m:** cada toque verde correcto suma velocidad (sin tope). Si pasa medio segundo sin un toque correcto, frenás de a poco. Errarle al lado te saca un 14%.
- **110 m con vallas:** 10 vallas cada 9,7 m (un poco más separadas que las reales). Los tres números de cada valla son un conjunto. Los toques sueltos no suman; al completar el 3 recibís un impulso que depende de cuánto tardaste del 1 al 3 (0,55 s = normal, 0,35 s o menos = máximo, 1,3 s o más = mínimo). Errarle a un número te frena.

- **Salto en largo** (como la app original): 1) correr con los verdes (41 m); 2) a 14 m de la tabla el piso se pinta de verde (14 a 9 m), amarillo (9 a 4 m) y rojo (últimos 4 m); desde el verde ya no hay botones, mantenés la velocidad y te preparás; en el rojo aparecen los dos botones rojos: despegar lo más pegado a la tabla (es nulo cuando el pie de adelante pasa la tabla, unos 35 cm delante de la cadera; el atleta se frena ahí y aparece ¡PISASTE LA TABLA!); 3) en el aire, los dos rojos otra vez para el impulso: lo ideal es en el punto más alto (entre el 44% y el 56% del vuelo, +1,40 m); se va perdiendo hasta no sumar nada antes del 20% o después del 80%. Al apretar, el atleta se estira, sube un poco y acelera hacia la marca nueva.

- **Garrocha y jabalina:** semáforo más largo que el del largo (verde 18 a 12 m, amarillo 12 a 6 m, rojo últimos 6 m). Desde el verde no hay botones verdes y mantenés la velocidad; la acción se puede empezar en cualquier momento del semáforo. Garrocha (como la app original): la garrocha baja sola y la estrellita la recorre en 1 s, calculado para llegar a la punta a unos 3,5 m del cajón; apretar y mantener los dos botones naranjas (dos dedos, o Espacio) la clava, y cuanto más cerca de la punta esté la estrellita, más alto. Arriba, soltar cuando la estrellita llega a la otra punta. Jabalina: mantener apretados los dos botones, un dedo en cada mitad de la pantalla o Espacio (las chispitas recorren la jabalina en 0,7 s) y soltar cerca de la punta; con un solo dedo no arranca y levantar cualquiera de los dos lanza. Después de soltar el atleta sigue avanzando unos 3,5 m: si pasa la línea, el tiro es nulo aunque la jabalina ya esté en el aire. En las dos, llegar a la tabla o la línea sin terminar es nulo.
- **Salto triple:** Carrera y pique como en largo, pero la arena está a 11,5 m de la tabla: en el aire aparece un botón naranja del lado del pie que apoya (primero el derecho, después el izquierdo) que se toca justo cuando el pie toca la pista; cuanto más justo, más impulso y uno malo (apurado, tarde o del otro lado) hace trastabillar y acorta el salto siguiente. El último salto es como en largo, con la estirada en el punto más alto. La marca se mide desde la tabla. Puntos: 1000 con 17 m (120 por metro).
- **Martillo** (`js/game/hammer.js`): sin carrera, en el círculo con la jaula atrás, en tres partes. Tres giros y medio tocando los botones verdes como en los 100 m (cada acierto gira más rápido, cada error frena, sin tocar se pierde velocidad). Un giro final de 1,5 s para tocar lo más rápido posible, cualquier botón: cada toque suma distancia (hasta un 30%). Medio segundo sin botones ("¡AHORA APUNTÁ!") y la puntería, como en jabalina (un toque de los dos de menos de 0,12 s no cuenta como suelta): se mantienen los dos botones y arriba del atleta una estrellita recorre una barra; hay que soltar cuando llega al círculo de la punta. Muy temprano pega en la red y pasado cae afuera del sector: nulo. La marca se mide desde el borde del círculo. Puntos: 1000 con 70 m (14 por metro).
- **Pruebas clásicas y nuevas:** triple y martillo (`extra:true` en `js/config.js`) se juegan sueltas, tienen Top 10 y se pueden elegir en los torneos con amigos (vienen sin marcar al crear uno). Supervivencia usa solo las 5 clásicas (`CLASSIC`).
- **Récords por período:** en Récords, debajo de Mundial y los grupos, se elige **Histórico**, **Este año** o **Este mes**. El servidor guarda la mejor marca de cada jugador en cada año y cada mes (tabla `pmarks`, hora de Argentina), aunque no sea su récord personal: el celular la manda cuando mejora su mejor del año o del mes. Al terminar una prueba, si tu marca le gana a todos los demás de ese período, la tabla dice **¡Récord del año!** o **¡Récord del mes!** (el mundial sigue siendo el de toda la historia, con su vuelta). Las tablas de año y mes arrancan vacías desde que se publicó esto.
- **Récords:** el récord mundial es el primero del **Top 10** de cada prueba (botón *Récords* del menú): la mejor marca de cada jugador registrado, con nombre y fecha, guardada en el servidor. Solo cuentan las personas, no las máquinas. Sin conexión se ven los jugadores del celular.
- **Huella en el largo:** donde despegaste queda una huella en la pista, con la distancia a la tabla (solo la del intento actual).
- **Zoom:** carreras a 29 px por metro (atletas de 72 px), pruebas de campo a 41 px por metro (`SPRINT_PPM` y `FIELD_PPM` en `js/game/core.js`).
- **Participantes:** 6 por prueba, vos y 5 rivales sorteados entre los otros atletas.

## Cómo se juega (tutoriales)

En la pantalla de Pruebas, cada prueba tiene **Cómo se juega** (`js/game/demo.js`): la prueba se juega sola un intento, como un buen jugador, con un cartel abajo que dice qué hacer en cada parte y un dedito que marca cada toque (y los dos botones mientras se mantienen). No guarda marcas ni historial; tocar la pantalla (o cualquier tecla) vuelve a Pruebas, y termina sola al final del intento.

## Menú

El menú principal tiene tres modos: **Pruebas** (la prueba elegida en grande y el carrusel de pruebas, que se desliza con el dedo o las flechas rojas), **Torneos** (con amigos o contra la máquina) y **Supervivencia**. Para agregar una prueba alcanza con sumarla a `EVENTS` en `js/config.js`; con `nueva:true` su tarjeta muestra la etiqueta NUEVA. Cada prueba tiene su ilustración en `assets/thumbs/` (`<id>.jpg` arriba, `<id>-sm.jpg` en la tarjeta; en `THUMBS` de `js/ui/screens.js` va dónde está el atleta para que el recorte no lo corte). Una prueba sin ilustración muestra el stickman dibujado.

## Grupos

Para compararse solo entre amigos. En Récords, arriba se elige **Mundial** o uno de tus grupos (en un grupo se ven todos sus integrantes con marca, no solo 10). **Grupos ›** abre tus grupos: crear uno con nombre, sumar jugadores ya registrados buscándolos por nombre (cualquiera del grupo puede sumar), salir. Quien lo creó puede sacar gente; si se va, el grupo pasa al siguiente, y el último en irse lo borra. Hasta 50 jugadores por grupo y 20 grupos por jugador.

## Administrador

Solo para el jugador administrador (Jero): en su perfil aparece el botón **Administrador**. Muestra números del juego (jugadores, nuevos de la semana, récords, torneos, grupos) y la lista de jugadores con buscador; en cada uno: **código nuevo** (si se lo olvidó; también lo desbloquea), desbloquear, cerrar sus sesiones, renombrar, borrar un récord y borrar el jugador. El permiso queda atado a la cuenta (no al nombre): la primera vez que entra el jugador «Jero» y no hay administrador, pasa a serlo; si se cambia el nombre lo conserva, y alguien nuevo que use «Jero» no lo obtiene.

## Pruebas en prueba

En la pantalla de Pruebas, arriba del carrusel hay pestañas: Todas, Carreras (100 m, vallas), Saltos (largo, garrocha, triple, alto) y Lanzamientos (jabalina, martillo, bala). La pestaña elegida se recuerda; si la prueba elegida no es de esa clase, pasa a la primera de la pestaña.

Una prueba nueva se agrega primero a `BETA` en `js/config.js` (con `beta:true`): solo el administrador la ve, en el carrusel de Pruebas con la etiqueta EN PRUEBA, y la puede jugar. No aparece en torneos, supervivencia, Récords ni perfiles, y sus marcas no se mandan al Top 10. Para publicarla, se pasa de `BETA` a `EVENTS` (con su tabla de puntos en `POINTS`, `js/game/scoring.js`, y sus marcas posibles en `RANGE` de `api/t.js`).

Publicadas después: **Salto en alto** (como el largo: carrera con los verdes y el piso de colores, pique con los dos rojos en una tabla de despegue centrada en la marca: solo el pie justo en la marca (±3 cm) es perfecto; desde ahí pierde altura de a poco (unos 4 cm al borde del verde, ±12 cm; amarillo y naranja hasta 1,42 m antes o pasado, donde pierde 55 cm); no hay nulo: si no picás, salta solo al final de la tabla, lo peor posible; en el aire, estilo Fosbury (se da vuelta, pasa de espaldas arqueado, después levanta las piernas y cae de espalda en la colchoneta), los dos rojos de nuevo cuando la espalda está sobre la varilla para arquearse y sumar centímetros; la marca es la altura pasada y la varilla queda dibujada ahí) y **Lanzamiento de bala** (`js/game/shot.js`). En el círculo (sin jaula, con la tabla de pie adelante), en tres partes. Impulso: 3,7 s de botones verdes como en los 100 m mientras el atleta se desliza por el círculo (la velocidad que junta es la fuerza). Ángulo: tras medio segundo, una aguja sube de 0° a 80° (70° por segundo) y no vuelve; se aprietan y mantienen los dos botones en lo verde (39° a 41°, lo mejor 40°; naranja 37°–38° y 42°–43°, un poco menos); si llega arriba, nulo. Suelta: sin soltar, la barra con la estrellita como en martillo; se suelta al llegar al círculo, y pasarse es nulo (se sale del círculo). La marca se mide desde el borde del círculo. Puntos: alto 1000 con 2,20 m (800 por metro); bala 1000 con 13 m (80 por metro). Al publicarlas se borraron una sola vez las marcas que tenían de prueba (servidor: migración `reset-hj-sp-1`; en cada teléfono: `hj-sp-1`).

## Supervivencia

Las 5 pruebas clásicas (sin triple ni martillo) en orden al azar contra una sola máquina; cada ronda de 5 la máquina mejora (sus marcas por ronda en `LEVELS` de `js/ui/survival.js`, medidas con jugadores simulados: ronda 1 fácil, 4 como un jugador casual, 8 como uno bueno, 12 casi experto, 16 experto y 0.5% más difícil cada ronda después). Hay que ganarle o empatarle en cada prueba (en largo, garrocha y jabalina, el mejor de 3 intentos); la primera que se pierde termina la partida. Cada prueba ganada suma sus puntos (la tabla de los torneos). La mejor partida queda en el perfil y en el Top 10 mundial (pestaña Supervivencia de Récords), con la ronda a la que llegó.

## Jugadores

La primera vez que se abre el juego hay que crear un jugador: nombre único, color del stickman y un código de 4 a 6 números (si el nombre ya existe, se entra con su código). Cada jugador guarda sus récords, sus 5 mejores marcas por prueba, el historial de pruebas (marca, puesto, fecha) y los torneos. Desde el menú (abajo, **Jugador**) se abre el perfil: cambiar nombre y color, ver el récord de cada prueba, o cambiar de jugador / crear otro para jugar con amigos en el mismo celular. Cada récord personal nuevo se manda al Top 10 mundial (si no hay conexión, se manda después). Abajo en el menú, **Jugadores** muestra a todos los registrados; tocando uno se ve su perfil: mejor marca de cada prueba, fecha y puesto en el mundo.

Todo se guarda en el navegador (`localStorage`, clave `odb-players`; ver `js/storage.js`). Cada jugador tiene un id único y su historial queda listo para subirlo a un servidor cuando haya torneos con otra gente.

## Torneos online

En el menú, tarjeta **Torneos** (solo con amigos; el torneo contra la máquina ya no está en el menú): crear un torneo (nombre y pruebas: las 5 clásicas vienen marcadas, triple y martillo se suman tildándolos) da un código de 5 letras; el botón **Invitar** comparte el código y un link (`?t=CÓDIGO`) que abre el juego directo en el torneo (si es la primera vez, primero se crea el jugador). Cada uno juega cada prueba **una sola vez**, cuando quiere; salir a la mitad cuenta como nulo. La tabla suma los puntos de cada prueba como en el torneo contra la máquina.

Cómo funciona: el juego está publicado en **Vercel**; `api/t.js` es una función de Vercel que guarda torneos, jugadores y resultados en **Neon** (Postgres). La conexión la pone la integración de Neon en Vercel (variable `DATABASE_URL`); las tablas se crean solas la primera vez. La función valida lo que recibe (pruebas del torneo, marcas posibles, un resultado por prueba). Si no hay conexión al terminar una prueba, el resultado queda guardado y se manda la próxima vez que se abre el torneo.


Un torneo terminado tiene el botón **Repetir torneo**: pregunta las pruebas (vienen tildadas las mismas, se pueden sumar o sacar) y cuánto dura, y arma uno nuevo con el mismo nombre y los mismos jugadores ya anotados (les aparece en *En juego*, sin pasar el código). Cada prueba del torneo se juega solo, sin máquinas: cuentan únicamente los resultados de los amigos. Un torneo **no** termina porque los que están adentro jugaron todo (alguien más puede sumarse): termina cuando se cumple el plazo que se eligió al crearlo (1 día, 3 días o 1 semana) o cuando quien lo creó lo termina a mano. Terminado, nadie más puede sumarse ni jugar y las pruebas no jugadas cuentan 0. En *Con amigos*, **En juego** lista los torneos abiertos (nombre, jugadores, cuánto falta) y **Historial de torneos** los terminados (fecha, ganador y tu puesto); la lista viene del servidor, así se ve desde cualquier celular.
## Estilo stickman

El juego usa stickmen dibujados con código (`drawStick` en `js/draw/character.js`): líneas gruesas y cabeza rellena, del color de la musculosa de cada atleta, sobre el mismo esqueleto y las mismas poses (`js/poses.js`). Los personajes dibujados (piezas y tiras de animación en `assets/characters/`) quedan guardados pero desactivados: para volver a usarlos, poné `stick:false` en `STYLE` (`js/storage.js`); recién ahí se cargan sus imágenes.

Los movimientos del stickman están en `js/stick.js`: cada momento (valla, llegada, tropezón, despegue y vuelo del largo, lanzamiento de jabalina, salto con garrocha, caídas, festejos) tiene 3 o 4 poses clave y el stickman pasa suave entre ellas según el avance real del movimiento. Al cambiar de movimiento, la pose se transforma en 0,16 s; parado respira y en el podio festeja.

## Atletas

Todos los atletas se dibujan con piezas sobre el mismo esqueleto: cabeza, musculosa, short, brazo, antebrazo, muslo y pierna con zapatilla.

Para agregar o cambiar un atleta:

1. Editá `assets/characters/characters.json` (id, nombre y paleta: piel, pelo, musculosa, franja, short, zapatillas).
2. Corré `python3 tools/build_characters.py` (necesita `pip install pillow numpy`).

El script recolorea las piezas del personaje base por zonas de color, guarda los PNG en `assets/characters/<id>/` y actualiza `js/roster.js` con el tamaño y el pivote (articulación) de cada pieza.

**Piezas propias:** si ponés un PNG tuyo en la carpeta de un atleta (por ejemplo `assets/characters/santi/head.png`), el script no lo pisa y el juego usa ese en lugar del recoloreado. El pivote se calcula solo: cuello en la cabeza, cadera en la musculosa, cintura en el short, hombro en el brazo, codo en el antebrazo, cadera en el muslo y rodilla en la pierna. Para volver a la pieza generada, borrá tu archivo y corré el script de nuevo.

Yo tiene `"recolorear": false`: usa las piezas del personaje base tal cual. Su paleta solo se usa para el muñeco de respaldo. Un atleta con `"propio": true` no se genera (todas sus piezas tienen que estar en su carpeta).

Si una imagen no carga, ese atleta se dibuja con el muñeco vectorial de antes.

## Animaciones

En los 100 m y los 110 m con vallas todos los atletas usan animaciones dibujadas, recoloreadas para cada uno:
- `run`: ciclo de carrera de 8 cuadros.
- `start`: "en sus marcas" y "listos".
- `cheer`: cuadro 1 de frente parado y cuadro 4 de frente con el brazo arriba (para el podio); cuadros 2 y 3 de perfil saltando (festejo en la pista al terminar).
- `dip`: inclinación y cabezazo en la meta.
- `trip`: tropezón y recuperación (rivales en 100 m; cualquiera que tira una valla).
- `hurdle`: despegue, paso por encima de la valla y caída.
- `stand`: parado de perfil, respirando (después del disparo, hasta el primer toque; antes de arrancar en el salto en largo).
- `ljtakeoff`: último paso, empuje, despegue y subida del salto en largo.
- `ljflight`: vuelo del salto en largo (se usan los cuadros 2 a 4: brazos arriba, bajando, rodillas arriba).
- `ljstretch`: estirarse al dar el impulso en el aire (cuadro 1 un instante, después el 2; el 3 no se usa).
- `ljland`: caída en la arena (talones, deslizarse, sentado).
- `javstand`: parado con la jabalina antes de arrancar (la jabalina viene en el dibujo).
- `javrun`: carrera con la jabalina al hombro, 6 cuadros (hasta empezar el lanzamiento).
- `javpull`: llevar la jabalina atrás, 4 cuadros, mientras mantenés apretado; la estrellita recorre la jabalina dibujada (el `meta.json` guarda la cola y la punta de cada cuadro).
- `javthrow`: lanzamiento (cuadro 2 brazo atrás, 3 jabalina arriba de la cabeza, 4 seguimiento ya sin la jabalina; el 1, de frente, no se usa).
- La jabalina sola (`assets/javelin.png`, de `assets/source/javelin.jpg`) es la que vuela y queda clavada, y se dibuja debajo de cada cuadro con la punta sobre la punta dibujada: así se ve siempre entera aunque la hoja la dibuje más corta o cortada (`--javelin-lines` guarda dónde está en hojas que no necesitan `--javelins`).
- `javafter`: después del tiro (paso de recuperación mientras frena, mirando el vuelo con la mano en la frente, puño arriba cuando se clava).
- `pvstand`: parado antes de la garrocha. Las hojas de garrocha vienen sin la garrocha (la dibuja el juego, doblada); `--hands="x0,y0,x1,y1;..."` marca la mano de atrás y la de adelante de cada cuadro y la garrocha pasa por las dos.
- `pvrun`: carrera con la garrocha, 6 cuadros (también mientras se baja la garrocha; la garrocha sale del puño de adelante).
- `pvplant`: clavar la garrocha y despegar, 4 cuadros (último paso, brazos arriba, despegue, colgado al empezar a subir).
- `pvswing`: subida colgado de la garrocha, 4 cuadros (colgado, rodillas arriba, cabeza abajo, girando).
- `pvover`: pasar la varilla (cuadro 1) y caer de espaldas (cuadro 3; el 2 no se usa).
- `pvland`: en el colchón (acostado, piernas bajando, sentado con el puño arriba).
- En el aire, los cuadros de garrocha se ubican por la cadera (`hipy` en el `meta.json`), no por el punto más bajo, porque el atleta se da vuelta. La garrocha es `assets/pole.png` (de `assets/source/pole.jpg`), doblada en tramos.

El salto en largo ya va todo con dibujos; solo el nulo (pisar la tabla) sigue con piezas.

Si una animación no carga, ese momento se dibuja con piezas.

Para recortar todas las hojas de nuevo y regenerar a todos los atletas: `./tools/cut_all_sheets.sh` (ahí están los ajustes de cada hoja).

Para agregar o cambiar una animación con una hoja nueva (figuras sobre fondo blanco, de perfil mirando a la derecha). El último argumento iguala el tamaño del personaje con la carrera:

```sh
python3 tools/cut_sprite_sheet.py assets/source/base_start_sheet.jpg assets/characters/base/start start assets/characters/base/run
python3 tools/build_characters.py
```

La carrera es la referencia de tamaño: si se cambia, va sin el último argumento. Para animaciones con saltos agregá `--keep-height`, así los cuadros en el aire no se apoyan en el piso. El tamaño se iguala con la carrera por la mediana de cuatro medidas (pelo, musculosa + short, zapatillas y silueta), porque cada hoja generada dibuja el cuerpo con proporciones un poco distintas. `--measure=2,3` mide solo con esos cuadros (para hojas que mezclan vistas) y `--adjust=0.95` corrige a ojo. `--javelin` separa la cola de cada jabalina del atleta de al lado (en las hojas de jabalina se tocan). Si las jabalinas cruzan por delante o por detrás de los vecinos, `--javelins="x0,y0,x1,y1;..."` da cada jabalina a mano (cola y punta en px de la hoja, una por figura, de izquierda a derecha, vacía para una figura sin jabalina; alcanza con aproximado): se ajusta la línea, se separan las figuras y a cada una se le devuelve su jabalina, redibujando la parte que quedaba tapada.

## Sprites de Yo

Los sprites de cuerpo entero de antes siguen en `assets/characters/yo/sprites/` pero no se usan. Para volver a activarlos, poné `sprite:true` en `LOOK.yo` (`js/config.js`): se usan en 100 m, vallas, podio y menú. El manifiesto (tamaño y cadera `hx` de cada uno) está en `js/assets.js`.

## Ícono y pantalla de inicio

El juego se puede instalar como app (en iPhone: Safari → Compartir → *Agregar a inicio*; en Android: Chrome → menú → *Instalar app* / *Agregar a la pantalla principal*). El ícono y el logo de la pantalla de inicio están en `assets/icons/` (`manifest.webmanifest` describe la app: pantalla completa y horizontal). Al abrir el juego se ve el logo un momento (tocando se saltea).

## Escenario de las pruebas

La tribuna (`assets/scene/stands.webp`, transparente arriba de la baranda) y el cielo (`sky.jpg`) son tiras que se repiten de costado sin espejar; el cielo se mueve menos que la tribuna y se ve cuando la cámara sube (garrocha, jabalina). Supervivencia tiene su estadio oscuro (`stands-surv.webp`, `sky-surv.jpg`) con pista y pasto apagados (`setTheme` en `js/render/scenery.js`). El largador son dos imágenes recortadas (`starter0.png` listo, `starter1.png` disparando). Si falta alguna imagen, se dibuja la versión anterior en código.

Natación (en preparación): el natatorio tiene su tribuna (`stands-swim.webp`, transparente arriba de la baranda) y su techo (`sky-swim.jpg`, va donde el cielo), que cargan en segundo plano; el tema `swim` de `setTheme`. La pileta se dibuja en código (`js/render/pool.js`): de costado, el borde de enfrente, los otros andariveles con sus corcheras (rojas los 5 m de cada pared), los banderines a 5 m de cada pared y nuestro andarivel cortado como un vidrio (superficie que se mueve, el agua, el fondo con la línea negra y su T), el bloque de salida en 0 y la pared con la placa de llegada al final. La tarjeta de crawl está en `assets/thumbs/crawl.jpg`.

Publicadas: **100 m crawl** (`js/game/swim.js` sobre el motor de los 100 m, dibujo en `js/render/swim.js`, poses `swimPose` en `js/stick.js`). Pileta de 50 m, ida y vuelta. Al disparo, los dos rojos para tirarse del bloque (la reacción cuenta en el tiempo; 0,6 s en el aire, cae a 3,4 m); después los verdes como en los 100 m: cada acierto es una brazada (la velocidad en el agua es 0,34 de la de correr). A 4,5 m de la pared aparecen los dos rojos: lo mejor es apretarlos a 1,3 m de la pared (±20 cm perfecto, nada a 1,6 m más), y la vuelta conserva del 70 % al 100 % de la velocidad; llegar a la pared sin apretar es ¡CONTRA LA PARED! (se queda con la mitad). En la vuelta se da la vuelta carnero y sale de vuelta dibujado espejado. Al final, los dos rojos para tocar la pared (como el cabezazo de los 100 m). Máquinas: la del medio hace 21 s. La distancia se mide en la punta de las manos (la cadera va 1 m atrás, así no se mete en la pared); al darse vuelta las manos quedan 2 m más atrás, así que en la vuelta la distancia avanza 2 m (las máquinas igual). Antes de la vuelta y antes del toque hay 0,55 s sin botones (¡LLEGA LA PARED!) para prepararse. En pecho y mariposa esas distancias se calculan con la velocidad promedio (después de cada brazada la velocidad sube de golpe y baja), el toque aparece 0,55 s antes de la pared y en el deslizamiento final va a su ritmo promedio. Pestaña Natación en Pruebas (solo aparece si hay pruebas de natación para ver). También **100 m pecho** (rítmico: un anillo se cierra sobre la cabeza y van los dos rojos justo al cerrarse; ±0,015 s perfecto (el anillo justo sobre el círculo), nada a 0,12 s más; si se pasa, el anillo sigue cerrándose por adentro del círculo; una buena acelera el ritmo de 0,9 s entre brazadas hasta 0,65 s, una floja lo frena hasta 1,15 s; perderla le saca la brazada) y **100 m mariposa** (mantener los dos: se hunde en la brazada y la estrellita corre 0,42 s hasta el círculo; soltar justo ahí (±3 % del recorrido) es la mejor brazada, nada a 35 % antes o 17 % después, después 0,35 s sacando los brazos y otra vez mantener). En las dos cada brazada empuja (la mitad por hacerla, la otra mitad según lo justa que fue) y el agua frena entre brazadas (pocas brazadas largas: unas 20 en pecho y 15 en mariposa), sin bajar nunca de 1,4 m/s; llegando a una pared se desliza sin frenar. En crawl los brazos giran más rápido cuanto más rápido nada, pero entre 0,45 y 1,25 vueltas por segundo. La vuelta en pecho y mariposa se dibuja tocando la pared con las manos y girando. Máquinas del medio: pecho 27 s, mariposa 23 s.

## Sin internet

`sw.js` (service worker) guarda una copia del juego la primera vez que se abre con conexión, así después abre y se juega sin internet. Siempre pide primero lo nuevo a la red (las actualizaciones llegan apenas hay conexión) y usa la copia si no hay. Los récords se guardan en el celular y se suben al Top 10 cuando vuelve la conexión; los resultados de torneos online quedan en cola. Sin conexión, el Top 10 y la lista de jugadores muestran lo último que se vio, con un aviso.

## Rendimiento

- Las ilustraciones se sirven en WebP (`assets/thumbs/<id>.webp` a 880 px, `<id>-sm.webp` para las tarjetas); los `.jpg` quedan como originales. Al abrir la app se bajan unos 0,9 MB y al entrar a Pruebas otros 0,9 MB (antes 1,4 y 1,7).
- Los fondos del natatorio se cargan recién la primera vez que se juega una prueba de natación (`loadSwimScene` en `js/assets.js`); hasta que llegan se ve la tribuna dibujada en código.
- El fondo de los menús no se mueve: se dibuja una sola vez por tamaño de pantalla (`frame` en `js/render/frame.js`), no 60 veces por segundo.
- Las corcheras de la pileta se dibujan con un trazo por color, no uno por flotador.

Natación publicada (crawl, pecho, mariposa): están en EVENTS con `extra:true` (torneos con amigos, récords, perfil; no en supervivencia). Tiempos: menor es mejor (servidor: `SPRINT`, rango 8 a 200 s). Puntos: crawl 1000 con 19 s (60 por segundo), pecho 1000 con 24 s (40 por segundo), mariposa 1000 con 21 s (60 por segundo). Al publicarlas se borraron una sola vez las marcas de prueba (servidor: `reset-swim-1`; teléfonos: `swim-1`).

Publicada: **Posta 4x100** (`js/game/relay.js` sobre el motor de los 100 m; dibujo en `relayLane` de `js/render/sprint.js`). 400 m, cuatro relevos que corre el jugador. En cada pase el compañero espera en la marca (100, 200, 300 m) y la tabla está centrada 1,5 m antes: verde ±12 cm (perfecto), amarillo y naranja hasta ±1,52 m. Cuando el testimonio (en la mano, 35 cm delante de la cadera) está a 6 m del centro de la tabla aparecen los dos rojos (¡PASALO!) y el juego pasa a cámara lenta (60 %) hasta el pase; el que sigue sale con la mitad de la velocidad que traía el testimonio más un impulso según lo justo del pase (hasta +25 % en uno perfecto, nada en el peor: del 50 % al 75 %), desde donde quedó el testimonio (60 cm detrás de su cadera: la carrera avanza 0,95 m en cada pase, las máquinas lo tienen en cuenta). Sin apretar, se pasa solo al final de la tabla (el peor pase). El que entregó frena atrás. Al final, los dos rojos para tirarse como en los 100 m. Máquina del medio: 35 s.

Posta 4x100 publicada: en EVENTS con `extra:true` (torneos con amigos, récords, perfil; no en supervivencia). Tiempo: menor es mejor (servidor: `SPRINT`, rango 15 a 300 s). Puntos: 1000 con 31 s (30 por segundo). Marcas de prueba borradas una sola vez (servidor `reset-4x100-1`, teléfonos `4x100-1`).

Torneos con amigos: al crear (y al repetir) un torneo, las pruebas se eligen agrupadas como en Pruebas (Carreras, Saltos, Lanzamientos, Natación), con el nombre corto de la tarjeta; tocar el nombre del grupo tilda todo el grupo, o lo destilda si ya estaba todo tildado. Por defecto, las 5 clásicas.
Perfiles: los récords (los tuyos en el perfil y los de cada jugador) tienen las mismas pestañas (Todas, Carreras, Saltos, Lanzamientos, Natación); la elegida se recuerda mientras la app está abierta. Supervivencia aparece solo en Todas.
Posta: récords borrados otra vez al cambiar el pase a mitad de velocidad más impulso (servidor `reset-4x100-2`, teléfonos `4x100-2`).

En prueba: **Laser Run** (`js/game/laser.js` sobre el motor de los 100 m; la mira en `drawScope` de `js/render/sprint.js`). 300 m: tres tramos de 100 m con los verdes y dos puestos de tiro (a los 100 y 200 m, línea amarilla y negra). Al llegar el corredor frena solo en la línea y se ve por la mira: el tablero con 5 blancos negros se balancea (más cuanto más rápido llegó, y se va calmando); cualquier botón dispara al blanco del centro: acierto = blanco blanco, error = +5 s. Después de los 5 tiros sale de nuevo desde parado. Las máquinas también frenan a tirar (6 a 9 s) y erran a veces. Al final, los dos rojos para tirarse.

## Al actualizar: que nada en curso cambie

- Desafío del día: la prueba de cada día queda guardada en `daily_ev` la primera vez que se pide. Nunca cambiar ni borrar filas de días ya empezados; el sorteo (`dailyEv`/`dayEv`) se puede cambiar, solo afecta los días que vienen.
- Pruebas nuevas: agregarlas al final de `EVENTS` (cliente y servidor). Lo guardado en el celular va por id (`'100'`, `'pv'`...), nunca por posición en la lista.
- Datos guardados en el celular: si cambia su forma, leer también la forma vieja (como `saved()` en supervivencia).
- Una versión vieja del juego con algo nuevo del servidor: tiene que avisar y ofrecer «Actualizar el juego» (`data-act="reload"`), nunca quedarse trabada.
- Borrar récords o resultados: solo con una migración de una vez (`migrations`), y solo si se pidió.
