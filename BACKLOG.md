# BACKLOG.md — BoviTrans MVP

> **Nota metodológica:** Este backlog fue generado mediante una sesión de Ingeniería de Requerimientos asistida por Claude. Al final del documento se incluye el árbol de conversación / prompts utilizados para llegar a este resultado, tal como lo requiere la Fase 1 del desafío.

---

## Índice

1. [Épicas del Proyecto](#épicas)
2. [Historias de Usuario y Criterios de Aceptación](#historias-de-usuario)
   - [EP-01: Administración de Flotas](#ep-01-administración-de-flotas)
   - [EP-02: Gestión de Solicitudes de Transporte](#ep-02-gestión-de-solicitudes-de-transporte)
   - [EP-03: Panel Principal (Dashboard)](#ep-03-panel-principal-dashboard)
   - [EP-04: Cálculo Logístico e Inteligencia de Viaje](#ep-04-cálculo-logístico-e-inteligencia-de-viaje)
   - [EP-05: Infraestructura y Configuración](#ep-05-infraestructura-y-configuración)
3. [Árbol de Conversación con Claude](#árbol-de-conversación-con-claude)

---

## Épicas

| ID | Nombre | Descripción |
|----|--------|-------------|
| EP-01 | Administración de Flotas | Gestión completa del inventario de camiones: registro, edición, visualización y baja de vehículos con sus características críticas. |
| EP-02 | Gestión de Solicitudes de Transporte | Ciclo de vida completo de una solicitud: creación por parte del cliente/operador, visualización, asignación de camión y cierre. |
| EP-03 | Panel Principal (Dashboard) | Vista central del operador logístico donde convergen todas las solicitudes activas con información clave y acciones rápidas. |
| EP-04 | Cálculo Logístico e Inteligencia de Viaje | Motor de cálculo de distancia, costo de combustible, alertas de capacidad y sugerencias de optimización de viajes. |
| EP-05 | Infraestructura y Configuración | Dockerización, base de datos, variables de entorno y configuración del entorno de desarrollo y producción. |

---

## Historias de Usuario

---

### EP-01: Administración de Flotas

---

#### US-01 — Registrar un camión

**Como** operador logístico,
**quiero** registrar un nuevo camión en el sistema con su patente, capacidad de carga y consumo de combustible,
**para** tener un inventario digital actualizado de mi flota disponible.

**Criterios de Aceptación:**

- **CA-01.1:** Dado que estoy en el módulo de flotas, cuando completo el formulario con patente única, capacidad (cabezas) y litros/km y hago clic en "Registrar", entonces el camión aparece en el listado con un mensaje de confirmación.
- **CA-01.2:** Dado que intento registrar un camión, cuando ingreso una patente que ya existe en el sistema, entonces el sistema muestra un error HTTP 409 y un mensaje "La patente ya se encuentra registrada".
- **CA-01.3:** Dado que intento registrar un camión, cuando dejo campos obligatorios vacíos o ingreso valores negativos o cero en capacidad/consumo, entonces el formulario muestra validaciones inline sin llamar a la API.
- **CA-01.4:** Dado que el registro es exitoso, cuando vuelvo al listado, entonces el nuevo camión aparece con estado "Disponible" por defecto.

**Tareas Técnicas:**

- [ ] **TASK-01.1:** Crear tabla `trucks` en `init.sql` con columnas: `id` (UUID PK), `license_plate` (VARCHAR UNIQUE NOT NULL), `max_capacity` (INTEGER NOT NULL CHECK > 0), `fuel_consumption_per_km` (DECIMAL NOT NULL CHECK > 0), `status` (ENUM: available/assigned/maintenance), `created_at`, `updated_at`.
- [ ] **TASK-01.2:** Crear `POST /api/trucks` — validar body, insertar en DB, retornar 201 con el recurso creado.
- [ ] **TASK-01.3:** Crear componente `TruckForm.tsx` con validación client-side (React Hook Form o nativo).
- [ ] **TASK-01.4:** Crear página `src/app/fleet/new/page.tsx`.
- [ ] **TASK-01.5:** Escribir query SQL de inserción en `src/lib/db/trucks.ts`.

---

#### US-02 — Listar camiones de la flota

**Como** operador logístico,
**quiero** ver todos los camiones registrados con sus características y estado actual,
**para** tomar decisiones rápidas sobre cuál vehículo asignar a una solicitud.

**Criterios de Aceptación:**

- **CA-02.1:** Dado que accedo al módulo de flotas, cuando la página carga, entonces veo una tabla/grilla con todos los camiones mostrando patente, capacidad, consumo y estado.
- **CA-02.2:** Dado que hay camiones en distintos estados, cuando visualizo la lista, entonces cada estado tiene un badge de color diferente (verde: disponible, amarillo: asignado, rojo: mantenimiento).
- **CA-02.3:** Dado que no hay camiones registrados, cuando accedo al módulo, entonces se muestra un estado vacío con un llamado a la acción "Registrar primer camión".
- **CA-02.4:** Dado que hay más de 10 camiones, cuando visualizo la lista, entonces se aplica paginación o scroll con carga de todos los resultados.

**Tareas Técnicas:**

- [ ] **TASK-02.1:** Crear `GET /api/trucks` — retornar array de camiones con status 200.
- [ ] **TASK-02.2:** Crear componente `TruckTable.tsx` con columnas ordenables.
- [ ] **TASK-02.3:** Crear página `src/app/fleet/page.tsx` con fetch server-side.
- [ ] **TASK-02.4:** Implementar badges de estado con colores semánticos.
- [ ] **TASK-02.5:** Implementar estado vacío (empty state) con ilustración o ícono.

---

#### US-03 — Editar datos de un camión

**Como** operador logístico,
**quiero** modificar el consumo de combustible o el estado de un camión existente,
**para** mantener los datos actualizados ante cambios mecánicos o de disponibilidad.

**Criterios de Aceptación:**

- **CA-03.1:** Dado que estoy en el listado de camiones, cuando hago clic en "Editar" en un camión, entonces se abre un formulario prellenado con sus datos actuales.
- **CA-03.2:** Dado que modifico el consumo y guardo, cuando vuelvo al listado, entonces el valor actualizado se refleja inmediatamente.
- **CA-03.3:** Dado que intento cambiar la patente a una ya existente, cuando guardo, entonces el sistema retorna error 409.
- **CA-03.4:** Dado que un camión tiene solicitudes activas asignadas, cuando intento cambiar su estado a "Mantenimiento", entonces el sistema muestra una advertencia pero permite el cambio.

**Tareas Técnicas:**

- [ ] **TASK-03.1:** Crear `PUT /api/trucks/[id]` — validar, actualizar y retornar 200 con recurso actualizado.
- [ ] **TASK-03.2:** Crear `GET /api/trucks/[id]` — retornar un camión por ID o 404.
- [ ] **TASK-03.3:** Crear página `src/app/fleet/[id]/edit/page.tsx`.
- [ ] **TASK-03.4:** Reutilizar `TruckForm.tsx` en modo edición.

---

#### US-04 — Eliminar un camión

**Como** operador logístico,
**quiero** dar de baja un camión del sistema,
**para** mantener el inventario limpio y sin vehículos fuera de servicio definitivo.

**Criterios de Aceptación:**

- **CA-04.1:** Dado que hago clic en "Eliminar" en un camión, cuando confirmo en el diálogo de confirmación, entonces el camión desaparece del listado y la API retorna 200.
- **CA-04.2:** Dado que el camión tiene solicitudes de transporte asignadas activas, cuando intento eliminarlo, entonces el sistema bloquea la acción con un mensaje explicativo (error 409).
- **CA-04.3:** Dado que cancelo el diálogo de confirmación, cuando vuelvo al listado, entonces ningún dato fue modificado.

**Tareas Técnicas:**

- [ ] **TASK-04.1:** Crear `DELETE /api/trucks/[id]` — verificar dependencias activas, eliminar o retornar 409.
- [ ] **TASK-04.2:** Crear componente `ConfirmDialog.tsx` reutilizable.
- [ ] **TASK-04.3:** Agregar constraint de FK en `init.sql` entre `transport_requests` y `trucks`.

---

### EP-02: Gestión de Solicitudes de Transporte

---

#### US-05 — Crear una solicitud de transporte

**Como** operador logístico (ingresando datos del cliente),
**quiero** registrar una nueva solicitud con los datos del solicitante, cantidad de cabezas, origen y destino,
**para** tener un registro digital de cada pedido de transporte entrante.

**Criterios de Aceptación:**

- **CA-05.1:** Dado que completo el formulario con nombre del solicitante, cabezas de ganado (entero positivo), coordenadas/nombre de origen y destino, cuando guardo, entonces la solicitud se crea con estado "Pendiente" y aparece en el dashboard.
- **CA-05.2:** Dado que ingreso 0 o un número negativo en cabezas de ganado, cuando intento guardar, entonces la validación client-side impide el envío.
- **CA-05.3:** Dado que el origen y destino son el mismo punto, cuando guardo, entonces el sistema muestra un error indicando que deben ser puntos distintos.
- **CA-05.4:** Dado que la solicitud se crea exitosamente, cuando consulto la API, entonces retorna HTTP 201 con el objeto completo incluyendo su ID generado.

**Tareas Técnicas:**

- [ ] **TASK-05.1:** Crear tabla `transport_requests` en `init.sql` con: `id` (UUID PK), `client_name` (VARCHAR NOT NULL), `cattle_count` (INTEGER CHECK > 0), `origin_lat`, `origin_lng`, `origin_name`, `destination_lat`, `destination_lng`, `destination_name`, `status` (ENUM: pending/assigned/in_progress/completed/cancelled), `truck_id` (FK nullable), `distance_km` (DECIMAL nullable), `fuel_cost` (DECIMAL nullable), `created_at`, `updated_at`.
- [ ] **TASK-05.2:** Crear `POST /api/transport-requests` — validar, insertar, retornar 201.
- [ ] **TASK-05.3:** Crear componente `TransportRequestForm.tsx` con selector de ubicación integrado con Leaflet.
- [ ] **TASK-05.4:** Implementar selección de origen/destino haciendo clic en el mapa o ingresando nombre de lugar.
- [ ] **TASK-05.5:** Crear página `src/app/requests/new/page.tsx`.

---

#### US-06 — Listar solicitudes de transporte

**Como** operador logístico,
**quiero** ver todas las solicitudes de transporte con su estado y datos clave,
**para** tener visibilidad completa del trabajo pendiente y en curso.

**Criterios de Aceptación:**

- **CA-06.1:** Dado que accedo al dashboard, cuando carga, entonces veo todas las solicitudes ordenadas por fecha de creación descendente.
- **CA-06.2:** Dado que hay solicitudes en distintos estados, cuando visualizo la lista, entonces cada estado tiene color y etiqueta clara (Pendiente, Asignada, En tránsito, Completada, Cancelada).
- **CA-06.3:** Dado que quiero filtrar, cuando selecciono un estado del filtro, entonces solo se muestran las solicitudes de ese estado.

**Tareas Técnicas:**

- [ ] **TASK-06.1:** Crear `GET /api/transport-requests` con soporte de query param `?status=`.
- [ ] **TASK-06.2:** Crear componente `RequestCard.tsx` con todos los datos de la solicitud.
- [ ] **TASK-06.3:** Crear componente `StatusFilter.tsx` con tabs o select.
- [ ] **TASK-06.4:** Implementar query SQL con filtro opcional por status.

---

#### US-07 — Ver detalle de una solicitud

**Como** operador logístico,
**quiero** ver el detalle completo de una solicitud incluyendo el mapa de ruta,
**para** tomar la decisión informada de qué camión asignar.

**Criterios de Aceptación:**

- **CA-07.1:** Dado que hago clic en una solicitud, cuando se abre el detalle, entonces veo nombre del cliente, cabezas, origen, destino, mapa con la ruta trazada, distancia en km y el selector de camión.
- **CA-07.2:** Dado que la solicitud ya tiene camión asignado, cuando abro el detalle, entonces veo el costo de combustible calculado y el camión asignado resaltado.
- **CA-07.3:** Dado que accedo a una solicitud con ID inexistente, cuando la API responde, entonces retorna HTTP 404 con mensaje descriptivo.

**Tareas Técnicas:**

- [ ] **TASK-07.1:** Crear `GET /api/transport-requests/[id]` — retornar solicitud con datos del camión (JOIN).
- [ ] **TASK-07.2:** Crear página `src/app/requests/[id]/page.tsx`.
- [ ] **TASK-07.3:** Integrar componente de mapa `RouteMap.tsx` con Leaflet mostrando marcadores de origen/destino y polilínea de ruta.
- [ ] **TASK-07.4:** Mostrar distancia calculada con OSRM o cálculo Haversine como fallback.

---

### EP-03: Panel Principal (Dashboard)

---

#### US-08 — Ver el dashboard principal

**Como** operador logístico,
**quiero** ver un panel central con todas las solicitudes activas y métricas clave,
**para** tener una visión global del estado operativo en tiempo real.

**Criterios de Aceptación:**

- **CA-08.1:** Dado que accedo a la ruta raíz `/`, cuando carga el dashboard, entonces veo tarjetas de métricas (solicitudes pendientes, camiones disponibles, solicitudes en tránsito) y el listado de solicitudes activas.
- **CA-08.2:** Dado que hay solicitudes pendientes sin camión asignado, cuando las visualizo en el dashboard, entonces tienen una indicación visual destacada que requiere acción.
- **CA-08.3:** Dado que el dashboard carga, cuando los datos están disponibles, entonces el tiempo de respuesta no supera los 2 segundos en condiciones normales.

**Tareas Técnicas:**

- [ ] **TASK-08.1:** Crear `GET /api/dashboard/stats` — retornar contadores agregados con una sola query SQL (COUNT por status y disponibilidad de camiones).
- [ ] **TASK-08.2:** Crear componente `StatsCard.tsx` para métricas numéricas.
- [ ] **TASK-08.3:** Crear layout de dashboard `src/app/(dashboard)/page.tsx`.
- [ ] **TASK-08.4:** Implementar navegación lateral (sidebar) con enlaces a Dashboard y Flotas.

---

### EP-04: Cálculo Logístico e Inteligencia de Viaje

---

#### US-09 — Asignar un camión a una solicitud y calcular costo de combustible

**Como** operador logístico,
**quiero** asignar un camión a una solicitud y ver el costo de combustible calculado automáticamente,
**para** conocer la viabilidad financiera del viaje antes de confirmarlo.

**Criterios de Aceptación:**

- **CA-09.1:** Dado que selecciono un camión del selector en el detalle de la solicitud, cuando confirmo la asignación, entonces el sistema calcula `distancia_km × litros_por_km × costo_por_litro` y muestra el resultado en pantalla.
- **CA-09.2:** Dado que el costo fue calculado, cuando veo el resultado, entonces se muestra con formato monetario (2 decimales, símbolo de moneda) y desglosa los componentes del cálculo.
- **CA-09.3:** Dado que cambio el camión seleccionado, cuando elijo otro vehículo, entonces el costo se recalcula dinámicamente sin recargar la página.
- **CA-09.4:** Dado que confirmo la asignación, cuando la API responde exitosamente, entonces el estado de la solicitud cambia a "Asignada" y el camión pasa a estado "Asignado".

**Tareas Técnicas:**

- [ ] **TASK-09.1:** Crear `PATCH /api/transport-requests/[id]/assign` — recibir `truck_id`, calcular costo, actualizar ambas tablas en una transacción SQL, retornar 200.
- [ ] **TASK-09.2:** Implementar función utilitaria `calculateFuelCost(distanceKm, litersPerKm, costPerLiter)` en `src/lib/calculations.ts`.
- [ ] **TASK-09.3:** Crear componente `TruckSelector.tsx` con dropdown que muestra solo camiones disponibles y preview de costo al hacer hover/selección.
- [ ] **TASK-09.4:** Leer `FUEL_COST_PER_LITER` desde variable de entorno con valor default documentado.
- [ ] **TASK-09.5:** Implementar cálculo de distancia Haversine en `src/lib/geo.ts` como fallback si OSRM no está disponible.

---

#### US-10 — Alerta de exceso de capacidad al asignar camión

**Como** operador logístico,
**quiero** recibir una alerta clara cuando el camión seleccionado no tiene capacidad suficiente para las cabezas solicitadas,
**para** tomar decisiones correctas y evitar problemas de bienestar animal o legales.

**Criterios de Aceptación:**

- **CA-10.1:** Dado que selecciono un camión cuya capacidad es menor a las cabezas solicitadas, cuando el selector procesa la selección, entonces se muestra un banner de advertencia con color de alerta (naranja/rojo) indicando el exceso.
- **CA-10.2:** Dado que se muestra la alerta de capacidad, cuando la visualizo, entonces indica exactamente cuántas cabezas exceden la capacidad y sugiere: (a) el número mínimo de viajes necesarios, o (b) los camiones alternativos con capacidad suficiente.
- **CA-10.3:** Dado que el sistema sugiere múltiples viajes, cuando veo la sugerencia, entonces se calcula el costo total considerando todos los viajes necesarios.
- **CA-10.4:** Dado que hay un exceso de capacidad, cuando intento confirmar la asignación de todas formas, entonces el sistema permite confirmar pero registra la advertencia en el log y muestra un segundo diálogo de confirmación explícito.

**Tareas Técnicas:**

- [ ] **TASK-10.1:** Implementar función `checkCapacity(cattleCount, truckCapacity)` que retorna `{ exceeds: boolean, tripsNeeded: number, excess: number }` en `src/lib/calculations.ts`.
- [ ] **TASK-10.2:** Crear componente `CapacityAlert.tsx` con el mensaje dinámico y sugerencias.
- [ ] **TASK-10.3:** En `TruckSelector.tsx`, llamar a `checkCapacity` al seleccionar y mostrar/ocultar `CapacityAlert` reactivamente.
- [ ] **TASK-10.4:** En `GET /api/trucks`, agregar query param `?available_for_capacity=N` para filtrar camiones con capacidad >= N.
- [ ] **TASK-10.5:** Mostrar camiones insuficientes en el selector pero con estilo deshabilitado/advertencia, no ocultarlos.

---

#### US-11 — Visualizar ruta en mapa interactivo

**Como** operador logístico,
**quiero** ver la ruta trazada entre el origen y destino de una solicitud en un mapa interactivo,
**para** evaluar visualmente el recorrido y los kilómetros involucrados.

**Criterios de Aceptación:**

- **CA-11.1:** Dado que abro el detalle de una solicitud, cuando el mapa carga, entonces veo marcadores diferenciados para el punto de origen (verde) y destino (rojo), y una línea que une ambos puntos.
- **CA-11.2:** Dado que el mapa está visible, cuando lo visualizo, entonces muestra la distancia en km entre los dos puntos como etiqueta o en la UI adyacente al mapa.
- **CA-11.3:** Dado que el usuario tiene conexión, cuando el mapa carga, entonces los tiles de OpenStreetMap se muestran correctamente.
- **CA-11.4:** Dado que el mapa está cargado, cuando hago zoom o arrastro, entonces la interacción es fluida y los marcadores permanecen en su posición.

**Tareas Técnicas:**

- [ ] **TASK-11.1:** Crear componente `RouteMap.tsx` con `dynamic import` de Leaflet (SSR desactivado) en `src/components/map/RouteMap.tsx`.
- [ ] **TASK-11.2:** Implementar marcadores custom con iconos SVG diferenciados por rol (origen/destino).
- [ ] **TASK-11.3:** Dibujar polilínea entre coordenadas de origen y destino.
- [ ] **TASK-11.4:** Mostrar distancia Haversine calculada como overlay en el mapa o en card adyacente.
- [ ] **TASK-11.5:** Manejar el caso de SSR en Next.js con `ssr: false` en el dynamic import.

---

### EP-05: Infraestructura y Configuración

---

#### US-12 — Levantar el entorno completo con Docker

**Como** desarrollador o evaluador del proyecto,
**quiero** levantar toda la aplicación con un único comando `docker-compose up --build`,
**para** poder correr y evaluar el proyecto sin configuración manual de dependencias.

**Criterios de Aceptación:**

- **CA-12.1:** Dado que ejecuto `docker-compose up --build` en la raíz del proyecto, cuando finaliza el proceso, entonces la aplicación Next.js es accesible en `http://localhost:3000` y la base de datos está corriendo en el puerto 5432.
- **CA-12.2:** Dado que el contenedor de base de datos inicia, cuando conecta por primera vez, entonces ejecuta automáticamente `init.sql` creando todas las tablas y datos semilla.
- **CA-12.3:** Dado que detengo y vuelvo a iniciar los contenedores, cuando la app reinicia, entonces los datos persisten gracias al volumen Docker configurado.
- **CA-12.4:** Dado que el contenedor de la app inicia, cuando intenta conectar a la DB, entonces espera a que PostgreSQL esté listo (healthcheck o wait-for).

**Tareas Técnicas:**

- [ ] **TASK-12.1:** Crear `docker-compose.yml` con servicios `app` (Next.js) y `db` (PostgreSQL 15-alpine), red compartida y volumen persistente.
- [ ] **TASK-12.2:** Crear `Dockerfile` para la app Next.js con build multi-stage (builder + runner).
- [ ] **TASK-12.3:** Crear `database/init.sql` con todas las DDL statements, constraints e índices, más datos semilla (3-5 camiones y 2-3 solicitudes de ejemplo).
- [ ] **TASK-12.4:** Configurar `depends_on` con `healthcheck` en docker-compose para garantizar el orden de inicio.
- [ ] **TASK-12.5:** Crear `.env.example` con todas las variables necesarias documentadas.

---

#### US-13 — Configurar variables de entorno parametrizables

**Como** operador o administrador del sistema,
**quiero** que el costo de combustible sea configurable sin modificar el código,
**para** adaptar la plataforma a variaciones de precio del mercado.

**Criterios de Aceptación:**

- **CA-13.1:** Dado que cambio el valor de `FUEL_COST_PER_LITER` en el archivo de entorno, cuando reinicio la app, entonces todos los cálculos reflejan el nuevo valor.
- **CA-13.2:** Dado que la variable no está definida, cuando la app inicia, entonces usa un valor default documentado y no falla con excepción.

**Tareas Técnicas:**

- [ ] **TASK-13.1:** Crear `src/lib/config.ts` que exporta las variables de entorno con defaults y validación en startup.
- [ ] **TASK-13.2:** Documentar todas las variables en `.env.example` con comentarios explicativos.

---

## Árbol de Conversación con Claude

> Esta sección documenta los prompts utilizados para generar este backlog, cumpliendo con el requerimiento del ítem 3 de la Fase 1 del desafío técnico BoviTrans.

---

### Prompt 1 — Configuración del rol de Claude como analista

```
Actuá como Analista de Negocios y Arquitecto de Software Senior para el proyecto BoviTrans.
Tu objetivo es ayudarme a desglosar la descripción del proyecto en requerimientos de software
estructurados. Antes de generar cualquier requerimiento, confirmá que entendiste el contexto
del negocio: plataforma logística para transporte de ganado vacuno, con dos módulos principales
(Dashboard de solicitudes y Administración de Flotas) y una lógica de cálculo de combustible
basada en la fórmula: costo = distancia_km × litros_por_km × costo_por_litro.
```

**Respuesta de Claude:** Claude confirmó comprensión del dominio, identificó los actores
principales (operador logístico, cliente solicitante), los dos módulos centrales y la lógica de
negocio crítica incluyendo la alerta de capacidad.

---

### Prompt 2 — Generación de Épicas

```
A partir de la descripción de BoviTrans, definí las Épicas del proyecto. Cada épica debe
representar un área funcional de alto nivel. Sé exhaustivo pero sin fragmentar en exceso.
Considerá: gestión de flota, solicitudes de transporte, dashboard, cálculo logístico e
infraestructura.
```

**Resultado:** Se identificaron 5 épicas: EP-01 Administración de Flotas, EP-02 Gestión de
Solicitudes, EP-03 Panel Principal, EP-04 Cálculo Logístico e Inteligencia de Viaje, EP-05
Infraestructura.

---

### Prompt 3 — Generación de Historias de Usuario

```
Para cada épica, generá las Historias de Usuario en el formato estricto:
"Como [rol], quiero [acción], para [beneficio]."
Incluí todos los casos de uso que necesita el MVP: CRUD de camiones, CRUD de solicitudes,
visualización en dashboard, asignación de camión, cálculo de combustible, alerta de capacidad
y visualización de mapa. No omitas los casos de error o borde.
```

**Resultado:** Se generaron 13 historias de usuario distribuidas en las 5 épicas, cubriendo
flujos felices y casos de error.

---

### Prompt 4 — Criterios de Aceptación

```
Para cada Historia de Usuario generada, escribí los Criterios de Aceptación en formato
Gherkin reducido: "Dado que... Cuando... Entonces..."
Cada US debe tener entre 3 y 5 criterios. Prestá especial atención a:
- Validaciones de formulario (client-side y server-side)
- Respuestas HTTP correctas (201, 400, 404, 409)
- La alerta de capacidad (US-10) debe incluir el cálculo de viajes necesarios
- La asignación de camión debe ser transaccional (US-09)
```

**Resultado:** Se generaron criterios de aceptación detallados con foco en comportamiento
observable, incluyendo códigos HTTP esperados y validaciones de negocio.

---

### Prompt 5 — Tareas Técnicas

```
Para cada Historia de Usuario, desglosá las Tareas Técnicas (Tasks) de desarrollo.
Sé específico: indicá el endpoint REST a crear (método + ruta), el componente React/Next.js
a implementar, la query SQL o tabla a crear, y el archivo donde debería vivir cada pieza de
código según esta estructura:
src/app/api/ → endpoints
src/components/ → componentes React
src/lib/db/ → queries SQL
src/lib/ → utilidades y cálculos
database/init.sql → DDL
```

**Resultado:** Se generaron tareas técnicas con rutas de archivo específicas, nombres de
componentes y descripción de la query o lógica a implementar en cada caso.

---

### Prompt 6 — Revisión de consistencia y casos borde

```
Revisá el backlog completo y verificá:
1. ¿Hay constraints de DB faltantes? (FKs, CHECKs, UNIQUE)
2. ¿La lógica transaccional de asignación camión-solicitud está cubierta?
3. ¿El caso de múltiples viajes sugeridos tiene criterio de aceptación medible?
4. ¿Leaflet con Next.js requiere alguna tarea técnica específica por el SSR?
Agregá o corregí lo que corresponda.
```

**Resultado:** Se incorporaron: constraint de FK con bloqueo de delete en US-04, manejo
de `dynamic import` con `ssr: false` para Leaflet en TASK-11.5, y criterio CA-10.3 para el
cálculo del costo total en múltiples viajes.

---

*Backlog generado con asistencia de Claude Sonnet — Proyecto BoviTrans MVP — Fase 1 completada.*

---

## Evolución Implementada del MVP

> Esta sección consolida los hitos ejecutados durante la construcción del MVP para mantener trazabilidad entre el backlog inicial, los prompts de evolución y el producto final.

### Hitos Funcionales

- Panel Logístico con navegación lateral, estados Pendiente, Asignada, Confirmada, Completada y Anulada.
- Creación interna de solicitudes con selección de cliente, mapa, origen, destino, fecha/hora de salida, cabezas de ganado y rango de peso por cabeza.
- Página pública de solicitud de presupuesto logístico ganadero para clientes externos.
- Finalización interna de solicitudes externas, incluyendo contacto por WhatsApp para completar datos faltantes.
- Administración de clientes con tipo de documento, ciudad, teléfono con prefijo, correo opcional y buscador.
- Administración de flotas con configuración vehicular, ejes/rodados, longitud, límite de peso, tara, consumo vacío y factor de consumo por tonelada.
- Gestión de usuarios internos con permisos por módulo y superusuario administrador protegido.
- Scraping de precios de combustible desde PETROPAR y combustibles.com.py, con actualización manual desde la interfaz.
- Envío de presupuesto por WhatsApp con datos de ruta, fechas, cabezas, camiones, viajes, costo e instrucciones de confirmación.
- Manual básico de uso disponible desde la interfaz interna.

### Reglas de Negocio Incorporadas

- La capacidad de camión se calcula por solicitud usando el peso promedio informado por el operador.
- El consumo cargado se estima usando consumo vacío L/km más toneladas transportadas por factor L/km/tn.
- En múltiples viajes se consideran viajes cargados de ida y retornos vacíos intermedios.
- Las fechas de salida no pueden ser anteriores al momento actual.
- Los camiones no pueden pasar a estado Asignado desde Administración de Flotas.
- Las solicitudes completadas son históricas y no pueden modificarse.
- Los viajes de meses anteriores no pueden anularse.
- Las solicitudes externas ingresan como Pendientes y requieren completar ruta y datos operativos antes de presupuestar.

### Prompts de Evolución Relevantes

```text
Actuá como Desarrollador y Arquitecto Full Stack Senior para evolucionar BoviTrans desde el backlog inicial hacia un MVP entregable.
Priorizá trazabilidad de requerimientos, consistencia SQL, endpoints REST robustos, UI/UX profesional y dockerización evaluable con un solo comando.
```

```text
Diseñá el Panel Logístico para que el operador pueda crear solicitudes, asignar camiones, calcular costos, enviar presupuesto por WhatsApp y mover la solicitud entre estados operativos con confirmaciones claras.
```

```text
Extendé Administración de Flotas para calcular capacidad y consumo por viaje usando normativa de dimensiones/pesos, configuración de ejes, peso promedio del ganado y especificaciones técnicas del camión.
```

```text
Auditá textos visibles, documentación y mensajes de error para el mercado hispano. Conservá nombres técnicos internos cuando renombrarlos aumente el riesgo sin aportar valor visible.
```

```text
Verificá el MVP contra la rúbrica senior: ingeniería de requerimientos con IA, modelado SQL, arquitectura/API, UI/UX con mapas e infraestructura Docker.
```
