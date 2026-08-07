# Cocina Inteligente 🍳

Aplicación web de cocina y planificación de comidas. Organiza tus recetas, arma el plan semanal, controla tu despensa y genera listas de compras inteligentes según tus perfiles y preferencias.

## Características

- **Recetas**: catálogo local con valores nutricionales, pasos y consejos, más importación desde [TheMealDB](https://www.themealdb.com/).
- **Plan semanal**: asigna recetas a desayuno, almuerzo y cena por cada día.
- **Despensa**: controla inventario, cantidades y fechas de vencimiento.
- **Compras**: genera la lista automáticamente a partir del plan y la despensa.
- **Historial**: registra lo que cocinaste con calificaciones y notas.
- **Perfiles**: múltiples perfiles con dietas, restricciones y tamaño de hogar.
- **Recomendaciones**: sugiere recetas según temporada, ubicación, despensa y puntuaciones.

## Stack

- **Monorepo**: [pnpm workspaces](https://pnpm.io/workspaces)
- **Client**: React 19, Vite, TanStack Query
- **Server**: Express 5, TypeScript (ejecutado con `tsx`)
- **Persistencia**: archivo JSON local (`server/data/db.json`)
- **Lint/format**: Biome

## Estructura

```
cooking/
├── client/          # App React + Vite
├── server/          # API Express
│   └── data/        # base de datos JSON
└── package.json     # scripts y devDependencies compartidos
```

## Requisitos

- Node.js (LTS reciente)
- pnpm 11+

## Puesta en marcha

```bash
pnpm install
pnpm dev
```

El client corre en `http://localhost:5173` y la API en `http://localhost:3001`. El client hace proxy de `/api` hacia el servidor.

## Scripts

| Comando               | Descripción                                |
| --------------------- | ------------------------------------------ |
| `pnpm dev`            | Levanta client y servidor en paralelo      |
| `pnpm build`          | Compila el client (TS + Vite)              |
| `pnpm typecheck`      | Typecheck de client y server               |
| `pnpm lint`           | Biome check                                |
| `pnpm security:audit` | Auditoría de dependencias                  |
| `pnpm check`          | typecheck + lint + security audit          |

## API

El servidor expone endpoints REST bajo `/api`:

- `GET /api/health` — estado del servidor
- `GET /api/state` — estado completo de la app
- `/api/profiles`, `/api/recipes`, `/api/pantry`, `/api/plan`, `/api/history`, `/api/shopping`, `/api/recommendations`, `/api/settings`, `/api/tips`, `/api/themealdb`

## Configuración

- Puerto del servidor: variable de entorno `PORT` (por defecto `3001`).
- La base de datos se crea automáticamente con datos de ejemplo si `server/data/db.json` no existe.
