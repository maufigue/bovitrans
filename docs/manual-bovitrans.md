# Manual Básico de Uso - BOVITRANS

## 1. Acceso al sistema

BOVITRANS cuenta con una página pública para solicitudes externas y un acceso interno para operadores autorizados. Para ingresar al sistema interno, utilice el acceso de inicio de sesión, escriba su correo o usuario y su contraseña. Si las credenciales no son válidas, el sistema mostrará una advertencia para corregirlas.

Una vez dentro, el sistema muestra solo los módulos habilitados para su usuario. El menú superior permite visualizar el usuario autenticado y cerrar sesión.

## 2. Inicio interno

La pantalla de inicio interno permite acceder a los módulos disponibles:

- Panel Logístico.
- Administración de Flotas.
- Usuarios.

El usuario administrador conserva todos los permisos y puede gestionar los módulos completos. Los usuarios comunes solo ven las opciones autorizadas por el administrador.

## 3. Panel Logístico

El Panel Logístico centraliza el ciclo de vida de las solicitudes de transporte ganadero. Las vistas principales son:

- Nueva Solicitud: creación interna de pedidos logísticos.
- Pendientes: solicitudes listas para completar datos, calcular viaje y asignar camión.
- Asignadas: solicitudes con presupuesto calculado y pendientes de confirmación del cliente.
- Confirmadas: viajes aceptados por el cliente.
- Completadas: registro histórico de viajes finalizados.
- Anuladas: registro histórico de viajes anulados.

El panel incluye métricas operativas, listado de solicitudes, detalle de cliente, combustible, ruta, mapa, cálculo de distancia, viajes, salida, llegada estimada, observaciones y acciones disponibles según el estado.

## 4. Nueva solicitud interna

Para crear una solicitud interna:

1. Seleccione o cree el cliente.
2. Ingrese la cantidad de cabezas de ganado.
3. Indique el peso mínimo y máximo por cabeza en kg.
4. Seleccione fecha y hora de salida. No se permiten fechas anteriores al momento actual.
5. Marque el punto de origen en el mapa y confirme.
6. Marque el punto de destino en el mapa y confirme.
7. Cree la solicitud.

El rango de peso permite estimar la capacidad real de cada camión y el consumo de combustible según la carga transportada.

## 5. Solicitudes externas

La página pública permite que un cliente solicite presupuesto con datos básicos:

- Nombre o razón social.
- C.I. o RUC.
- Teléfono con prefijo internacional.
- Ciudad registrada en la base de datos.

Estas solicitudes ingresan como Pendientes. El operador debe contactar al cliente por WhatsApp para completar punto de origen, destino, fecha, horario, cantidad de cabezas y rango de peso. Solo las solicitudes externas muestran el botón de WhatsApp para solicitar esos datos.

## 6. Clientes

El bloque Cliente permite seleccionar, crear, editar o eliminar clientes según el flujo operativo. Los datos principales son:

- Nombre de empresa.
- Razón social.
- Tipo y número de documento.
- Teléfono con prefijo.
- Ciudad.
- Correo opcional.

El buscador permite localizar clientes por empresa, razón social, documento o teléfono.

## 7. Combustible

El bloque Combustible permite elegir emblema y tipo de combustible cuando existen precios cargados. La opción de actualización ejecuta el scraper de precios para refrescar la base de datos. En el caso de Petropar, el sistema muestra vigencia cuando la fuente dispone de ese dato.

El costo se calcula en guaraníes y utiliza:

Distancia estimada x consumo estimado L/km x precio por litro.

Para múltiples viajes, el cálculo contempla viajes cargados de ida y retornos vacíos intermedios cuando corresponde.

## 8. Asignación de camiones

En Pendientes, el operador selecciona uno o varios camiones y utiliza Calcular Viaje para obtener:

- Distancia estimada.
- Capacidad efectiva.
- Viajes necesarios.
- Consumo estimado.
- Costo de combustible.
- Salida y llegada estimada.

Si la cantidad de ganado excede la capacidad del camión seleccionado, el sistema permite evaluar múltiples camiones o múltiples viajes. Luego se confirma la asignación para mover la solicitud a Asignadas.

## 9. Presupuesto por WhatsApp

En Asignadas, el operador puede enviar el presupuesto al cliente por WhatsApp. El mensaje incluye cliente, ruta, cabezas, distancia, camiones, viajes, salida, llegada estimada, costo de combustible, instrucciones para confirmar con "Ok", datos de transferencia y alternativa de rechazo con "No".

El teléfono del cliente debe guardarse con prefijo internacional para evitar errores de apertura de WhatsApp.

## 10. Confirmación, cancelación y cierre

En Asignadas:

- Confirmar Logística mueve la solicitud a Confirmadas.
- Cancelar Logística devuelve la solicitud a Pendientes.
- Eliminar Solicitud borra solicitudes pendientes o asignadas cuando el cliente no acepta el presupuesto.

En Confirmadas:

- Completar Viaje mueve el registro a Completadas.
- Anular Viaje mueve el registro a Anuladas, siempre que la solicitud no corresponda a un mes anterior.

Las vistas Confirmadas, Completadas y Anuladas cuentan con buscadores por empresa, documento, teléfono, fecha y periodo cuando corresponde.

## 11. Administración de Flotas

El módulo de flotas gestiona los camiones de BOVITRANS. Cada vehículo registra:

- Patente.
- Marca y modelo.
- Potencia.
- Tara.
- Configuración vehicular.
- Configuración de eje y rodado.
- Longitud máxima.
- Límite de peso.
- Consumo vacío L/km.
- Factor de consumo L/km/tn.
- Estado operativo.

La capacidad máxima de cabezas y el consumo cargado se calculan durante cada solicitud según el peso promedio informado. Desde Flotas no se puede crear ni cambiar manualmente un camión al estado Asignado; ese estado solo se gestiona desde el Panel Logístico.

## 12. Usuarios y permisos

El módulo Usuarios permite crear, editar, activar, desactivar y eliminar usuarios internos. También permite otorgar o quitar acceso a:

- Panel Logístico.
- Administración de Flotas.
- Usuarios.

El usuario administrador es superusuario, no puede eliminarse ni perder permisos críticos.

## 13. Mapa y rutas

El mapa permite seleccionar origen y destino, visualizar marcadores, ver la ruta estimada y operar con controles de acercamiento y alejamiento. La distancia se calcula con rutas reales cuando el servicio externo responde correctamente, y el sistema conserva un comportamiento funcional ante errores de red.

## 14. Recomendaciones operativas

- Mantenga actualizados los precios de combustible antes de presupuestar.
- Verifique que el teléfono del cliente incluya prefijo.
- Revise el rango de peso antes de calcular capacidad y viajes.
- Confirme la logística solo después de la aceptación del cliente.
- Use Anular Viaje para conservar registro histórico cuando una operación confirmada no se realiza.
