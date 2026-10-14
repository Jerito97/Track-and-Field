# Olimpiada de Bolsillo

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
  base/<anim>/          animaciones del base: run, start, cheer, dip, trip, stand, hurdle; cuadros + meta.json
  <id>/*.png            piezas de cada atleta (generadas o propias)
  <id>/<anim>/          animaciones de cada atleta (generadas o propias)
  yo/sprites/*.png      sprites viejos de cuerpo entero de Yo (desactivados)
assets/source/          hojas originales del personaje base (piezas, vistas, carrera)
tools/
  build_characters.py   genera las piezas de cada atleta y js/roster.js
  cut_base_sheet.py     recorta la hoja del personaje base en piezas
  cut_sprite_sheet.py   recorta una hoja de animación (fondo blanco) en cuadros alineados
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
- **110 m con vallas:** los tres números de cada valla son un conjunto. Los toques sueltos no suman; al completar el 3 recibís un impulso que depende de cuánto tardaste del 1 al 3 (0,55 s = normal, 0,35 s o menos = máximo, 1,3 s o más = mínimo). Errarle a un número te frena.

- **Salto en largo** (como la app original): 1) correr con los verdes; 2) antes de la tabla el piso se pinta de verde (18 a 10 m), amarillo (10 a 4 m) y rojo (últimos 4 m), unos 2 s de preparación; en el rojo aparecen los dos botones rojos: despegar lo más pegado a la tabla (pisarla es nulo); 3) en el aire, los dos rojos otra vez para estirarse, a ojo: lo mejor es bajando, entre el 78% y el 93% del vuelo (+0,70 m).

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
- `stand`: parado de perfil, respirando (después del disparo, hasta el primer toque).

Si una animación no carga, ese momento se dibuja con piezas.

Para recortar todas las hojas de nuevo y regenerar a todos los atletas: `./tools/cut_all_sheets.sh` (ahí están los ajustes de cada hoja).

Para agregar o cambiar una animación con una hoja nueva (figuras sobre fondo blanco, de perfil mirando a la derecha). El último argumento iguala el tamaño del personaje con la carrera:

```sh
python3 tools/cut_sprite_sheet.py assets/source/base_start_sheet.jpg assets/characters/base/start start assets/characters/base/run
python3 tools/build_characters.py
```

La carrera es la referencia de tamaño: si se cambia, va sin el último argumento. Para animaciones con saltos agregá `--keep-height`, así los cuadros en el aire no se apoyan en el piso. El tamaño se iguala con la carrera por la mediana de cuatro medidas (pelo, musculosa + short, zapatillas y silueta), porque cada hoja generada dibuja el cuerpo con proporciones un poco distintas. `--measure=2,3` mide solo con esos cuadros (para hojas que mezclan vistas) y `--adjust=0.95` corrige a ojo.

## Sprites de Yo

Los sprites de cuerpo entero de antes siguen en `assets/characters/yo/sprites/` pero no se usan. Para volver a activarlos, poné `sprite:true` en `LOOK.yo` (`js/config.js`): se usan en 100 m, vallas, podio y menú. El manifiesto (tamaño y cadera `hx` de cada uno) está en `js/assets.js`.
