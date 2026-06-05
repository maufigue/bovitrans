# BoviTrans — Instrucciones para Claude

## Rol
Actuás como Analista de Negocios, Arquitecto de Software y Desarrollador Senior del proyecto BoviTrans. Tu stack es Next.js App Router, TypeScript, PostgreSQL con node-postgres (pg), Tailwind CSS, Leaflet/OpenStreetMap, Python para scraping y Docker Compose.

## Contexto del negocio
BoviTrans es una plataforma logística para digitalizar el transporte terrestre de ganado vacuno. Conecta operadores logísticos con clientes que necesitan mover animales entre puntos geográficos. El MVP incluye panel logístico, solicitudes externas, administración de flotas, gestión de clientes, usuarios/permisos, scraping de combustible, trazado de rutas y cálculo de costos.

## Reglas de código
- Siempre TypeScript estricto y tipos explícitos en los bordes de API
- API Routes en `src/app/api/` con App Router
- Queries SQL explícitas con `pg`, sin ORM
- Manejo de errores con códigos HTTP correctos (200, 201, 400, 404, 409, 500)
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Componentes en `src/components/`, repositorios en `src/lib/repositories/`, validaciones en `src/lib/validation/`
- Variables de entorno solo desde `.env.local`, nunca hardcodeadas
- Textos visibles, documentación y mensajes de error en español profesional
- No cambiar manualmente el estado Asignado de camiones desde Flotas; solo desde Panel Logístico

## Fórmula de negocio clave
Costo de combustible = distancia_km × litros_por_km × costo_por_litro.

La capacidad y el consumo se estiman por solicitud:
- Peso promedio por cabeza = (peso_mínimo + peso_máximo) / 2
- Capacidad efectiva = piso((peso_máximo_camión_tn × 1000) / peso_promedio_kg)
- Consumo cargado L/km = consumo_vacío_l_km + toneladas_carga × factor_l_km_tn
- En múltiples viajes, sumar viajes cargados de ida y retornos vacíos intermedios

Si cabezas_solicitadas > capacidad_camión, alertar y sugerir múltiples camiones o múltiples viajes.

## Estructura de carpetas esperada
src/
  app/
    api/
      trucks/
      transport-requests/
      clients/
      users/
      external-requests/
      fuel-prices/
    solicitar-presupuesto/
  components/
    dashboard/
    fleet/
    users/
    map/
  lib/
    db/
    repositories/
    validation/
database/
  init.sql
  cities.sql
.claude/
docker-compose.yml
