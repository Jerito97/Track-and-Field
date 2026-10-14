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
assets/characters/yo/
  rig/*.png             partes del muñeco recortado (cabeza, torso, brazos, piernas…)
  sprites/*.png         sprites de cuerpo entero (largada, carrera, valla, festejo, cara)
js/
  main.js               arranque y loop principal
  config.js             datos: atletas, pruebas, colores
  state.js              estado compartido (S, G, pantalla, atletas)
  storage.js            localStorage y récords
  audio.js              sonidos
  canvas.js             canvas y escalado (320 px lógicos de alto)
  assets.js             manifiesto y carga de imágenes
  input.js              toques y teclado
  poses.js              poses del esqueleto
  rig.js                dibujo con partes de imagen y sprites
  draw/character.js     atletas vectoriales (los rivales)
  game/                 lógica: core, sprint, field, replay, podium, scoring
  render/               dibujo: escenario, pista, campo, HUD, podio
  ui/screens.js         pantallas HTML (menú, ficha de la prueba, tablas)
```

## Imágenes

`js/assets.js` tiene el manifiesto: para cada PNG, su tamaño y su punto de anclaje (`px,py` es la articulación en las partes del rig; `hx` es la cadera en los sprites). Si agregás una imagen, va en la carpeta del personaje y en el manifiesto.
