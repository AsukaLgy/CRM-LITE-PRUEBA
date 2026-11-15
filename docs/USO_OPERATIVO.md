# Guía de uso operativo

**Dirigido a:** Atención, Producción, Cobranza y administración. **Resuelve:** recorrido diario por pantallas y límites de cada acción.
**Requisitos:** cuenta activa y permisos asignados por administración; uso de escritorio para el CRM. El móvil queda reservado al rol de Escáner.
**Revisión:** 2026-11-15 · producto 1.5.0 · contrastado con `frontend/src/App.jsx`, `Inbox.jsx`, `Clients.jsx`, `CasePage.jsx` y los routers FastAPI.

## Ideas que evitan errores de operación

- La solicitud es el expediente común. Clientes, notas, cotizaciones, OP, entregas y cobros conservan su relación con ese expediente.
- Atención, producción, entrega y cobro son estados distintos. Cambiar una etapa de producción no registra entrega ni pago.
- Una OP puede contener una o más partidas. En la creación desde **Producción**, una o dos partidas de producto se agrupan en una OP; con más de dos, el backend crea una OP por partida y mantiene una sola solicitud. Cantidad, copias y juegos describen la partida y no crean OP adicionales.
- El QR del escáner registra la confirmación de producción que acepte el servidor. No entrega el pedido, no recibe dinero y no completa por sí solo la solicitud.
- Las acciones dependen de permisos de backend; ocultar una opción en pantalla no constituye autorización.

## Bandejas y pantallas

| Pantalla | Para qué sirve |
|---|---|
| **Mi día** | Resumen de solicitudes que requieren atención y accesos a bandejas. |
| **Bandeja general** | Solicitudes disponibles para asignación o atención según permisos. |
| **Mis solicitudes** | Trabajo asignado a la persona autenticada. |
| **Producción** | OP agrupadas por expediente, etapa, fecha, bloqueo, pagos y filtros disponibles. |
| **Entregas y cobros** | OP listas, entregas y situaciones de saldo. Entrega y pago conservan acciones separadas. |
| **Clientes** | Búsqueda, perfil, contactos e historial de solicitudes; el permiso de clientes controla el acceso. |
| **Calendario** | Fechas comprometidas y tareas/seguimientos disponibles para el rol. |
| **Completados / Historial** | Consulta de expedientes terminados y trazabilidad histórica. |
| **Liberaciones parciales** | Solicitudes de excepción de producción que requieren revisión de un aprobador. |
| **Indicadores** | Resúmenes operativos y financieros con filtros/permisos del backend. |
| **Configuración** | Administración de usuarios, roles y opciones expuestas según permisos. |

Las bandejas adicionales (por ejemplo, atrasadas, devoluciones o saldos vencidos) se abren desde filtros y accesos de Mi día/Indicadores; los permisos pueden limitar lo que cada persona ve.

## Registrar y atender una solicitud

1. Busca primero el cliente para evitar duplicar perfiles. Si no existe, créalo en **Clientes** y completa nombre y datos que el equipo realmente conozca; contactos se registran aparte.
2. Abre la bandeja que corresponda a tu trabajo y crea la solicitud. Añade asunto, prioridad, descripción, cliente y, si aplica, contacto.
3. Si el formulario es una solicitud de producción, registra todas las partidas en el mismo envío. El backend crea la solicitud y las OP en una transacción; vuelve a abrir el expediente o los enlaces de OP que devuelve la confirmación.
4. Revisa en el expediente el responsable, estado de atención, historial y siguiente acción. Usa notas para registrar hechos; una nota no envía correo ni modifica un estado de producción.
5. Asigna o toma la solicitud solo si tu rol lo permite. La asignación se registra en el expediente; no crea una solicitud nueva.

La interfaz conserva los formularios ante errores de conexión y diferencia conflictos, permisos, validación y resultados inciertos. Ante una respuesta incierta, revisa el expediente antes de repetir la operación; las claves idempotentes protegen los flujos que las incluyen.

## Cotizaciones y órdenes de producción

- Las cotizaciones mantienen versiones y su decisión. La aceptación convierte la solicitud a producción según el flujo disponible; no borres versiones para corregir un precio.
- La OP conserva su número, QR, datos de cliente y snapshots de las especificaciones aprobadas. Un snapshot histórico no se reemplaza automáticamente con datos actuales del perfil.
- Flujo de producción configurado: `nuevo → aprobación → impresión → encuadernación → listo para entregar`. Un bloqueo, anulación o retroceso tiene su propio flujo y registro.
- Para consultar una OP específica, selecciona la orden desde la solicitud o desde Producción. El enlace lleva su `production_id`, de modo que historial, selector e impresión refieren a la misma orden.
- La ficha imprime en media carta horizontal (8.5 × 5.5 pulgadas de área de contenido). El modo Carta coloca esa misma ficha en la mitad superior. La composición distribuye contenido en páginas cuando no cabe y repite identificación/QR; para cada equipo físico confirma tamaño, escala 100 % y encabezados/pies del navegador.

**Regla a confirmar antes de cambiar impresión:** una especificación anterior pidió impedir páginas adicionales. El código actual permite páginas de continuación para contenido largo y las pruebas E2E incluyen un caso que espera más de una página Carta. Las OP separadas por producto se comprueban por separado en media carta. Consulta el hallazgo en [la auditoría](AUDITORIA_REPOSITORIO_2026-11-15.md#prioridad-alta).

## Escáner, entregas y cobros

- El rol **Escáner de encuadernación** es exclusivo. Inicia sesión en la vista de escaneo, lee el QR y espera la respuesta del servidor antes de considerar confirmada la operación. En caso de desconexión, vuelve a consultar/escanea; no se registra una confirmación offline.
- El escaneo puede confirmar el trabajo físico según la regla del grupo de producción. No lo uses como sustituto del botón de entrega o de la captura de pago.
- En **Entregas y cobros**, abre la OP correcta y registra la cantidad entregada, receptor, método y evidencia solicitados. La entrega completa o parcial se calcula por partida.
- Registra pagos, anticipos, ajustes y devoluciones con el permiso financiero correspondiente y en el expediente/OP correctos. Los movimientos se conservan; una corrección usa el flujo de reversión y motivo, no elimina el pago anterior.
- Una solicitud con varias OP se completa solo cuando se resuelven las obligaciones que exige la regla de negocio. Los casos sin OP tienen un cierre manual explícito. La finalización conserva el expediente en el registro.

Para decisiones exactas de cancelación, liberaciones parciales, atribución de pagos y cierre, consulta [Arquitectura](ARQUITECTURA.md). No improvises acciones administrativas para corregir registros históricos.

## Roles

Los permisos predeterminados están definidos en `backend/app/security.py`; la administración puede configurar los permisos expuestos en Ajustes.

| Rol inicial | Enfoque del permiso |
|---|---|
| Administrador | Administración global y operaciones especiales. |
| Coordinador | Lectura global, atención, asignación, reactivación, producción, finanzas, ajustes, clientes, reportes y aprobaciones parciales. |
| Atención | Atención de solicitudes y clientes permitidos. |
| Producción | Avance de producción y funciones de taller permitidas. |
| Cobranza | Finanzas y reportes permitidos. |
| Escáner de encuadernación | Terminal de escaneo; el backend bloquea las demás rutas de CRM para esta cuenta. |

Los permisos pueden modificarse, excepto las restricciones que el backend conserva para proteger Administrador y el rol exclusivo de escáner. Si no aparece una pantalla o acción, solicita a administración que revise el rol; no compartas credenciales.
