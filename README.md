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
  <id>/*.png            piezas de cada atleta (generadas o propias)
  yo/rig/*.png          piezas de Yo
  yo/sprites/*.png      sprites de cuerpo entero de Yo (100 m y vallas)
assets/source/          hojas originales del personaje base
tools/
  build_characters.py   genera las piezas de cada atleta y js/roster.js
  cut_base_sheet.py     recorta la hoja del personaje base en piezas
js/
  main.js               arranque y loop principal
  config.js             datos: pruebas, colores; arma los atletas desde roster.js
  roster.js             GENERADO por tools/build_characters.py
  state.js              estado compartido (S, G, pantalla, atletas)
  storage.js            localStorage y récords
  audio.js              sonidos
  canvas.js             canvas y escalado (320 px lógicos de alto)
  assets.js             carga de imágenes (piezas de cada atleta, sprites de Yo)
  input.js              toques y teclado
  poses.js              poses del esqueleto
  rig.js                dibujo con piezas (drawAthlete) y sprites
  draw/character.js     muñeco vectorial (respaldo si una imagen no carga)
  game/                 lógica: core, sprint, field, replay, podium, scoring
  render/               dibujo: escenario, pista, campo, HUD, podio
  ui/screens.js         pantallas HTML (menú, ficha de la prueba, tablas)
```

## Atletas

Todos los atletas se dibujan con piezas sobre el mismo esqueleto: cabeza, musculosa, short, brazo, antebrazo, muslo y pierna con zapatilla.

Para agregar o cambiar un atleta:

1. Editá `assets/characters/characters.json` (id, nombre y paleta: piel, pelo, musculosa, franja, short, zapatillas).
2. Corré `python3 tools/build_characters.py` (necesita `pip install pillow numpy`).

El script recolorea las piezas del personaje base por zonas de color, guarda los PNG en `assets/characters/<id>/` y actualiza `js/roster.js` con el tamaño y el pivote (articulación) de cada pieza.

**Piezas propias:** si ponés un PNG tuyo en la carpeta de un atleta (por ejemplo `assets/characters/santi/head.png`), el script no lo pisa y el juego usa ese en lugar del recoloreado. El pivote se calcula solo: cuello en la cabeza, cadera en la musculosa, cintura en el short, hombro en el brazo, codo en el antebrazo, cadera en el muslo y rodilla en la pierna. Para volver a la pieza generada, borrá tu archivo y corré el script de nuevo.

Yo (`"propio": true`) no se genera: usa sus piezas de `yo/rig/` y, en 100 m y vallas, sus sprites.

Si una imagen no carga, ese atleta se dibuja con el muñeco vectorial de antes.

## Imágenes de Yo

`js/assets.js` tiene el manifiesto de Yo: para cada PNG, su tamaño y su punto de anclaje (`px,py` es la articulación en las piezas; `hx` es la cadera en los sprites).
