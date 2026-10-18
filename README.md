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

- **Salto en largo** (como la app original): 1) correr con los verdes (41 m); 2) a 14 m de la tabla el piso se pinta de verde (14 a 9 m), amarillo (9 a 4 m) y rojo (últimos 4 m); desde el verde ya no hay botones, mantenés la velocidad y te preparás; en el rojo aparecen los dos botones rojos: despegar lo más pegado a la tabla (pisarla es nulo); 3) en el aire, los dos rojos otra vez para el impulso: lo ideal es en el punto más alto (entre el 44% y el 56% del vuelo, +1,40 m); se va perdiendo hasta no sumar nada antes del 20% o después del 80%. Al apretar, el atleta se estira, sube un poco y acelera hacia la marca nueva.

- **Garrocha y jabalina:** semáforo más largo que el del largo (verde 18 a 12 m, amarillo 12 a 6 m, rojo últimos 6 m). Desde el verde no hay botones verdes y mantenés la velocidad; la acción se puede empezar en cualquier momento del semáforo. Garrocha (como la app original): la garrocha baja sola y la estrellita la recorre en 1 s, calculado para llegar a la punta a unos 3,5 m del cajón; apretar y mantener los dos botones naranjas (dos dedos, o Espacio) la clava, y cuanto más cerca de la punta esté la estrellita, más alto. Arriba, soltar cuando la estrellita llega a la otra punta. Jabalina: mantener apretado (las chispitas recorren la jabalina en 0,7 s) y soltar cerca de la punta. Después de soltar el atleta sigue avanzando unos 3,5 m: si pasa la línea, el tiro es nulo aunque la jabalina ya esté en el aire. En las dos, llegar a la tabla o la línea sin terminar es nulo.
- **Récords:** el récord mundial arranca vacío y lo pone el primero que haga una marca (solo cuentan las personas, no las máquinas).
- **Participantes:** 6 por prueba, vos y 5 rivales sorteados entre los otros atletas (en el torneo son los mismos en las cinco pruebas).

## Estilo stickman

En el menú, el botón **ESTILO** cambia entre los dibujos y stickmen dibujados con código (`drawStick` en `js/draw/character.js`): líneas gruesas y cabeza rellena, del color de la musculosa de cada atleta, sobre el mismo esqueleto y las mismas poses (`js/poses.js`). Se recuerda entre partidas.

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
