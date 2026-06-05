# Manual Básico de Uso - BOVITRANS

Gestión de Transporte Ganadero

Este manual explica el uso básico de la plataforma BOVITRANS para operadores internos, administradores y clientes externos. Su objetivo es servir como guía rápida para crear solicitudes, administrar clientes, calcular presupuestos, asignar camiones, enviar mensajes por WhatsApp, gestionar flota y controlar usuarios.

## 1. Conceptos principales

BOVITRANS organiza la operación logística ganadera en módulos:

- Página pública: permite que un cliente externo solicite un presupuesto.
- Inicio de sesión: permite el acceso de operadores y administradores internos.
- Inicio interno: muestra los módulos habilitados según permisos.
- Panel Logístico: gestiona solicitudes, rutas, camiones, costos y estados.
- Administración de Flotas: administra vehículos y datos técnicos.
- Usuarios: administra cuentas internas y permisos.
- Manual de uso: abre este documento desde el botón de información.

Las solicitudes pasan por estados operativos:

- Pendiente: solicitud recibida o creada, lista para completar datos y calcular.
- Asignada: solicitud con camión y presupuesto calculado, pendiente de aceptación.
- Confirmada: viaje aceptado por el cliente.
- Completada: viaje finalizado y registrado como histórico.
- Anulada: viaje cancelado conservando registro.

## 2. Página pública para clientes externos

La página pública permite que un cliente solicite un presupuesto sin ingresar al sistema interno.

Pasos para el cliente:

1. Ingresar Nombre o Razón Social.
2. Ingresar C.I. o RUC.
3. Ingresar teléfono con prefijo internacional.
4. Seleccionar ciudad desde la lista disponible.
5. Enviar la solicitud.

El sistema detecta el tipo de documento:

- Si el documento contiene guion antes del último número, se considera RUC.
- Si no contiene guion, se considera C.I.

Resultado:

- La solicitud queda registrada como Pendiente.
- El operador interno debe contactar al cliente para completar datos faltantes: punto de origen, punto de destino, fecha, horario, cantidad de cabezas y rango de peso.

La página pública también tiene:

- Botón de WhatsApp para comunicarse con BOVITRANS.
- Acceso discreto al inicio de sesión para operadores internos.
- Footer con datos de contacto públicos.

## 3. Inicio de sesión

El acceso interno solicita Correo/Usuario y contraseña. Si los datos son incorrectos, el sistema informa que se deben insertar credenciales válidas.

Uso recomendado:

1. Abrir el acceso interno desde la página pública.
2. Escribir Correo/Usuario.
3. Escribir contraseña.
4. Presionar el botón de ingreso.

Una vez autenticado:

- El sistema muestra el nombre del usuario.
- El menú de usuario permite cerrar sesión.
- Solo aparecen los módulos permitidos para esa cuenta.

## 4. Inicio interno

El inicio interno funciona como puerta de entrada a los módulos autorizados.

Opciones posibles:

- Panel Logístico: administración operativa de solicitudes.
- Administración de Flotas: alta, edición y baja de camiones.
- Usuarios: gestión de usuarios y permisos.

Si un usuario no tiene permiso sobre un módulo, esa tarjeta no aparece. Esto evita accesos accidentales y simplifica la experiencia del operador.

## 5. Panel Logístico

El Panel Logístico es el centro operativo de BOVITRANS. Desde este módulo se crean solicitudes, se asignan camiones, se calculan costos, se confirma logística y se revisa el historial.

Zonas principales:

- Menú lateral: permite navegar entre Nueva Solicitud, Pendientes, Asignadas, Confirmadas, Completadas y Anuladas.
- Métricas superiores: muestran solicitudes, pendientes y camiones libres.
- Bandeja operacional: lista las solicitudes del estado seleccionado.
- Panel de detalle: muestra cliente, combustible, ruta, mapa, observaciones y acciones.
- Botón de tema: permite cambiar entre tema claro y oscuro en la interfaz interna.
- Menú de usuario: muestra usuario actual y permite cerrar sesión.

## 6. Crear nueva solicitud interna

La vista Nueva Solicitud sirve para registrar solicitudes creadas por el operador.

Pasos:

1. Seleccionar un cliente existente o crear uno nuevo.
2. Ingresar cantidad de cabezas de ganado.
3. Ingresar peso mínimo por cabeza en kg.
4. Ingresar peso máximo por cabeza en kg.
5. Seleccionar fecha y hora de salida.
6. Marcar el punto de origen en el mapa.
7. Confirmar Punto de Origen.
8. Marcar el punto de destino en el mapa.
9. Confirmar Destino.
10. Revisar la información.
11. Presionar Crear Solicitud.

Reglas importantes:

- La fecha de salida no puede ser anterior a la fecha y hora actual.
- El peso máximo debe ser mayor o igual al peso mínimo.
- El origen y el destino deben ser puntos diferentes.
- El rango de peso se usa para calcular capacidad y consumo con mayor precisión.

Si el operador confirma un punto equivocado, puede volver a modificar el punto de origen o destino antes de crear la solicitud.

## 7. Gestión de clientes

El bloque Cliente permite consultar y administrar los datos del cliente asociado a una solicitud.

Datos disponibles:

- Nombre de Empresa.
- Razón Social.
- Tipo de Documento.
- Número de Documento.
- Número de Teléfono.
- Ciudad.
- Correo.
- Fecha de última actualización.

Acciones:

- Seleccionar: busca y asigna un cliente a la solicitud.
- Crear: abre una ventana superpuesta para registrar un nuevo cliente.
- Editar: permite modificar datos del cliente seleccionado.
- Eliminar: elimina el cliente si no tiene solicitudes asociadas.

Recomendaciones:

- Guardar teléfonos con prefijo internacional para WhatsApp.
- Usar la ciudad desde la tabla registrada en PostgreSQL.
- Registrar correo cuando exista, aunque no es obligatorio.
- Verificar documento antes de crear duplicados.

## 8. Combustible

El bloque Combustible permite elegir estación de servicio y tipo de combustible cuando existen precios cargados.

Opciones:

- Estación o emblema: Petropar, Shell, Petrobras, Copetrol u otros disponibles.
- Tipo: Diésel Común o Diésel Premium cuando existan datos.
- Precio: se muestra en guaraníes.
- Vigencia: aparece para Petropar cuando la fuente oficial informa fecha.
- Actualizar: ejecuta el scraping manual para refrescar precios.

Uso recomendado:

1. Revisar el combustible antes de calcular.
2. Actualizar precios si el dato parece antiguo.
3. Seleccionar estación y tipo de combustible.
4. Calcular el viaje con el precio vigente.

El sistema usa el precio seleccionado para estimar el costo de combustible de la operación.

## 9. Mapa y ruta

El mapa permite trabajar con puntos geográficos reales.

Funciones:

- Seleccionar origen.
- Seleccionar destino.
- Visualizar marcadores.
- Ver trazado estimado de la ruta.
- Acercar y alejar el mapa.
- Consultar distancia estimada.

La distancia se obtiene mediante ruta real cuando el servicio de ruteo responde correctamente. Si el servicio externo no responde, el sistema mantiene un comportamiento funcional con cálculo alternativo.

Buenas prácticas:

- Acercar el mapa antes de seleccionar puntos.
- Revisar que origen y destino correspondan al lugar solicitado por el cliente.
- Confirmar los puntos antes de calcular el viaje.

## 10. Cálculo logístico

El cálculo de BOVITRANS combina distancia, combustible, capacidad, peso y cantidad de viajes.

Datos usados:

- Distancia estimada en km.
- Precio de combustible por litro.
- Cantidad de cabezas.
- Peso mínimo y máximo por cabeza.
- Peso promedio estimado.
- Capacidad legal y técnica del camión.
- Consumo vacío L/km.
- Factor de consumo L/km/tn.

Fórmulas operativas:

- Peso promedio = peso mínimo + peso máximo, dividido 2.
- Capacidad efectiva = peso máximo del camión en kg dividido peso promedio por cabeza.
- Consumo cargado = consumo vacío + toneladas transportadas por factor de consumo.
- Costo = distancia x consumo estimado x precio por litro.

Para múltiples viajes:

- Se suman los viajes cargados de ida.
- Se suman los retornos vacíos intermedios cuando un mismo camión debe volver para cargar nuevamente.
- La llegada estimada considera la distancia total operativa.

## 11. Solicitudes pendientes

La vista Pendientes muestra solicitudes que todavía necesitan cálculo o asignación.

Flujos posibles:

- Solicitud interna completa: seleccionar combustible y camión, luego Calcular Viaje.
- Solicitud externa incompleta: contactar al cliente por WhatsApp y completar origen, destino, fecha, horario, cabezas y rango de peso.

Acciones disponibles:

- Completar datos pendientes.
- Contactar cliente por WhatsApp si la solicitud proviene de la página pública.
- Seleccionar uno o varios camiones.
- Calcular Viaje.
- Desasignar Camión si se necesita elegir otro.
- Confirmar Asignación para mover la solicitud a Asignadas.
- Eliminar Solicitud si corresponde.

Si la carga excede la capacidad del camión:

- El sistema advierte la situación.
- Puede evaluarse otro camión.
- Puede seleccionarse más de un camión.
- Puede elegirse la opción de múltiples viajes.

## 12. Solicitudes asignadas

La vista Asignadas contiene solicitudes con presupuesto calculado.

Acciones:

- Enviar Presupuesto por WhatsApp.
- Confirmar Logística.
- Cancelar Logística.
- Eliminar Solicitud.

Enviar Presupuesto por WhatsApp:

- Abre WhatsApp con un mensaje preparado.
- Incluye cliente, ruta, cabezas, distancia, camiones, viajes, salida, llegada estimada y costo.
- Solicita responder Ok para confirmar.
- Solicita adjuntar comprobante de transferencia.
- Indica el alias RUC 5378130-9.
- Indica responder No si el cliente no acepta.

Confirmar Logística:

- Debe usarse cuando el cliente acepta el presupuesto.
- Mueve la solicitud a Confirmadas.

Cancelar Logística:

- Devuelve la solicitud a Pendientes.
- Permite recalcular con otro camión, combustible o costo.

Eliminar Solicitud:

- Se usa si la solicitud ya no continuará.
- Libera recursos asociados cuando corresponde.

## 13. Solicitudes confirmadas

La vista Confirmadas funciona como registro de viajes aceptados por el cliente.

Acciones:

- Completar Viaje.
- Anular Viaje.

Completar Viaje:

- Se utiliza cuando la logística fue realizada.
- Mueve la solicitud a Completadas.

Anular Viaje:

- Se utiliza si el viaje confirmado finalmente no se realiza.
- Requiere confirmación porque no debe ejecutarse por accidente.
- No se permite anular viajes de meses anteriores.
- Mueve la solicitud a Anuladas.

Búsqueda:

- Empresa.
- RUC o C.I.
- Teléfono.
- Fecha.

## 14. Solicitudes completadas

La vista Completadas es histórica. Sirve para consultar viajes finalizados.

Características:

- No permite eliminar.
- No permite anular.
- Conserva datos de cliente, ruta, camiones, costos y fechas.
- Permite búsqueda histórica.

Búsqueda:

- Empresa.
- RUC o C.I.
- Teléfono.
- Fecha.
- Periodo, por ejemplo 06-2026.

## 15. Solicitudes anuladas

La vista Anuladas registra operaciones canceladas.

Características:

- Conserva historial de solicitudes anuladas.
- Permite auditoría de decisiones operativas.
- Evita borrar información relevante del negocio.

Búsqueda:

- Empresa.
- RUC o C.I.
- Teléfono.
- Fecha.
- Periodo, por ejemplo 06-2026.

## 16. Administración de Flotas

El módulo Administración de Flotas permite gestionar los camiones de la empresa.

Datos del camión:

- Patente.
- Marca.
- Modelo.
- Potencia HP.
- Tara en toneladas.
- Configuración vehicular.
- Configuración de eje y rodado.
- Longitud máxima.
- Límite de peso en toneladas.
- Consumo vacío L/km.
- Factor de consumo L/km/tn.
- Estado operativo.

Estados:

- Disponible: puede ser asignado desde el Panel Logístico.
- Mantenimiento: no puede ser asignado.
- Asignado: solo se gestiona desde el Panel Logístico.

Reglas:

- No se puede crear un camión directamente como Asignado desde Flotas.
- No se puede cambiar manualmente un camión a Asignado desde Flotas.
- La capacidad final de cabezas se calcula durante cada solicitud según el rango de peso informado.
- El consumo cargado se calcula según datos técnicos del camión y peso transportado.

Modelos frecuentes:

- La interfaz puede ofrecer presets de camiones usados como referencia.
- El operador puede ajustar datos técnicos si registra otro vehículo.

## 17. Usuarios y permisos

El módulo Usuarios permite administrar accesos internos.

Datos del usuario:

- Usuario.
- Correo.
- Nombre completo.
- Contraseña.
- Estado activo o inactivo.
- Permisos por módulo.

Permisos disponibles:

- Panel Logístico.
- Administración de Flotas.
- Usuarios.

Reglas:

- El superusuario administrador conserva acceso completo.
- El administrador no debe perder permisos críticos.
- Los usuarios inactivos no deberían operar el sistema.
- Si un usuario no tiene permiso, el módulo no aparece en el inicio.

## 18. Tema claro y oscuro

La interfaz interna permite cambiar entre modo claro y oscuro.

Uso:

- Presionar el botón circular ubicado en la parte superior.
- Elegir el tema más cómodo para el operador.

Notas:

- La página pública y el inicio de sesión permanecen en modo claro.
- El modo oscuro está pensado para uso interno.

## 19. Manual de uso

El botón de información abre este manual en una nueva pestaña.

Uso recomendado:

- Consultarlo cuando un operador nuevo necesite orientación.
- Revisarlo antes de operar estados críticos.
- Usarlo como guía de capacitación interna.

El manual no debe incluir credenciales de prueba ni información sensible.

## 20. Buenas prácticas operativas

- Actualizar precios de combustible antes de presupuestar.
- Verificar cliente, teléfono y ciudad.
- Confirmar origen y destino con el cliente.
- Ingresar correctamente cantidad de cabezas y rango de peso.
- Revisar capacidad del camión antes de confirmar asignación.
- Enviar presupuesto por WhatsApp solo cuando el cálculo esté revisado.
- Confirmar logística solo después de aceptación del cliente.
- Usar Cancelar Logística si se necesita recalcular.
- Usar Anular Viaje para conservar historial cuando un viaje confirmado no se realiza.
- Usar Completar Viaje solo cuando la operación finalizó.

## 21. Problemas frecuentes

No aparece un módulo:

- Verifique permisos del usuario.
- Un administrador puede otorgar acceso desde Usuarios.

No se puede asignar un camión:

- Verifique que el camión esté Disponible.
- Verifique que no esté en Mantenimiento.
- Revise si la solicitud tiene datos completos.

El costo parece incorrecto:

- Verifique distancia.
- Verifique combustible seleccionado.
- Verifique rango de peso.
- Verifique si el viaje requiere múltiples viajes o retornos vacíos.

No abre WhatsApp:

- Verifique que el teléfono tenga prefijo internacional.
- Verifique que el navegador permita abrir enlaces externos.

No se puede anular un viaje:

- Los viajes de meses anteriores no pueden anularse desde la interfaz.

## 22. Cierre

BOVITRANS fue diseñado para ordenar la operación logística ganadera, reducir errores de cálculo, mejorar la trazabilidad de solicitudes y facilitar la comunicación con clientes. El uso correcto del sistema depende de mantener datos actualizados, revisar cada cálculo y respetar el flujo de estados.
