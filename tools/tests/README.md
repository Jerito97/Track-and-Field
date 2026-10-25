# Pruebas automáticas

Pruebas del juego que se corren en una computadora (no van a Vercel ni tocan la base real).

## Correrlas

```
cd tools/tests
npm install          # una sola vez: la base de datos de prueba (PGlite)
node run.mjs         # todas
node run.mjs daily friendsui   # solo algunas
```

Hace falta Node 22 y Playwright con Chromium (si no está en este proyecto, usa el de la máquina en
`/opt/node-tools`). Cada prueba arranca su propio servidor con la base vacía (`server.mjs`), así que no se
pisan entre sí. Al final dice cuáles pasan y cuáles fallan; las capturas y el detalle quedan en
`tools/tests/out/<prueba>/` (no se suben).

## Qué hay

- **Servidor** (sin navegador): `apiall` (todas las acciones del servidor), `friendsapi`, `agree` (histórico,
  año y mes coinciden; desafíos ganados), `dreset` y `dkeep` (la prueba de cada día queda guardada).
- **Juego en el navegador**: `smoke` (recorrida por todas las pantallas), `checkall` (reglas de cada prueba),
  `online` (un torneo entre dos jugadores), `daily`, `dlong`, `friendsui`, `notifs`, `fnotifs` (avisos de
  amigos), `invite`, `boxes` (listas en su recuadro), `recui`, `top10`, `boardui`, `tourfit`, `tourmove`,
  `wipes` (borrar récords llega a los celulares), `compat` (actualizar no rompe lo guardado), `guard`
  (recarga si el juego no arranca), `dispub`, `played`, `herofit`, `beta`, `relayriv` (las máquinas pasan el
  testimonio), `dip` (el cabezazo), `discus`, `disdemo`, `cycrace` (ciclismo, lenta).

## Cómo están hechas

- `server.mjs`: el juego como lo sirve Vercel, con `/api/t` y una base en memoria (`neon-shim.mjs`, que
  reemplaza a `@neondatabase/serverless` gracias a `hook.mjs` / `register.mjs`). `POST /__sql` sirve para
  preparar datos con SQL.
- `lib.mjs`: la dirección del servidor (`BASE`) y `INIT(seed)`, que deja el azar fijo, un reloj que la prueba
  avanza a mano (`window.__step(cuadros)`) y un jugador de prueba en el celular.
- Una prueba imprime una línea `PASS ...` o `FAIL ...` por cada cosa que revisa.
