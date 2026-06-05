# BoviTrans

Plataforma operacional para gestionar solicitudes de transporte ganadero,
clientes, camiones, rutas y costos de combustible.

## Requisitos

- Node.js 20 o superior
- npm
- Docker Desktop con WSL 2

## Instalación

```powershell
git clone https://github.com/maufigue/bovitrans.git
cd bovitrans
git switch feature/bovitrans-mvp
npm install
Copy-Item .env.example .env.local
```

Para desarrollo local, ajusta `DATABASE_URL` en `.env.local` para usar
`127.0.0.1` como host:

```env
DATABASE_URL=postgresql://bovitrans:bovitrans_pass@127.0.0.1:5432/bovitrans
```

## Ejecución recomendada

Levanta PostgreSQL con Docker y ejecuta Next.js localmente:

```powershell
docker compose up -d db
npm run dev
```

La aplicación queda disponible en http://127.0.0.1:3000.

## Ejecución completa con Docker

```powershell
docker compose up -d --build db app
```

## Scraper de combustibles

Actualización manual desde la API:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3000/api/fuel-prices -Method Post
```

Ejecución programada cada 24 horas:

```powershell
docker compose --profile scraper up -d fuel-scraper
```

## Verificaciones

```powershell
npx tsc --noEmit
npm run build
docker compose ps
```

La documentacion funcional y el arbol de requerimientos se encuentran en
`BACKLOG.md`.
