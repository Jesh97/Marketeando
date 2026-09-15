# Marketeando

Estructura del proyecto:

```
Marketeando/
├── frontend/    React + Vite
└── backend/     Go + Gin + PostgreSQL (pgx)
```

## Requisitos

- Node.js (ya instalado)
- Go 1.27+ (ya instalado)
- PostgreSQL (gestionado por ti)

## Backend (Go)

```bash
cd backend
cp .env.example .env   # configura tu propia DATABASE_URL
go run ./cmd/api
```

El servidor arranca en `http://localhost:8080`. Endpoints disponibles:

- `GET /api/health` — chequeo de estado
- `GET /api/campaigns` — lista campañas
- `POST /api/campaigns` — crea una campaña (`{ "name": "..." }`)

La tabla `campaigns` se crea con la migración en `backend/migrations/0001_init.sql`. Ejecútala contra tu base de datos:

```bash
psql -U <usuario> -d <base> -f backend/migrations/0001_init.sql
```

## Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Arranca en `http://localhost:5173` y proxea las llamadas a `/api` hacia el backend en `localhost:8080` (configurado en `vite.config.js`).
