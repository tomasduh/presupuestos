# Mi Mudanza — presupuesto para mudarme solo

App local (sin login) para armar presupuestos de mudanza: cargás los productos que necesitás
comprar (con nombre, precio e imagen), los organizás por categoría, y armás distintos
presupuestos eligiendo qué productos incluir en cada uno.

Hecho con [Astro](https://astro.build), React y SQLite (`better-sqlite3`).

## Cómo correrla

```sh
npm install
npm run dev
```

Abrí `http://localhost:4321`. La base de datos y las imágenes subidas se guardan en `data/`
(no se sube al repo).

## Estructura

- `src/pages/index.astro` — listado de presupuestos.
- `src/pages/productos.astro` — alta/edición de productos y categorías.
- `src/pages/presupuestos/[id].astro` — detalle de un presupuesto: agregar/quitar productos.
- `src/pages/api/*` — endpoints del backend (productos, categorías, presupuestos, subida de imágenes).
- `src/lib/db.ts` — esquema de SQLite y datos iniciales (seed).
