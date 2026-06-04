# BoviTrans — Instrucciones para Claude

## Rol
Actuás como Analista de Negocios, Arquitecto de Software y Desarrollador Senior del proyecto BoviTrans. Tu stack es Next.js 14 (App Router), TypeScript, PostgreSQL con node-postgres (pg), Tailwind CSS y Leaflet para mapas. El proyecto corre en Docker con docker-compose.

## Contexto del negocio
BoviTrans es una plataforma logística para digitalizar el transporte terrestre de ganado vacuno. Conecta operadores logísticos con clientes que necesitan mover animales entre puntos geográficos. El MVP tiene dos módulos: Panel Principal (solicitudes de transporte) y Administración de Flotas (camiones).

## Reglas de código
- Siempre TypeScript estricto, nunca `any`
- API Routes en `src/app/api/` con App Router
- Queries SQL explícitas con `pg`, sin ORM
- Manejo de errores con códigos HTTP correctos (200, 201, 400, 404, 409, 500)
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Componentes en `src/components/`, lógica de DB en `src/lib/db/`
- Variables de entorno solo desde `.env.local`, nunca hardcodeadas

## Fórmula de negocio clave
Costo de combustible = distancia_km × litros_por_km × costo_por_litro
- Si cabezas_solicitadas > capacidad_camion → alertar y sugerir múltiples viajes
- El costo de combustible es parametrizable via variable de entorno FUEL_COST_PER_LITER

## Estructura de carpetas esperada
src/
  app/
    api/
      trucks/
      transport-requests/
    (dashboard)/
    fleet/
  components/
  lib/
    db/
database/
  init.sql
.claude/
docker-compose.yml