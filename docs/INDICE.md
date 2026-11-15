# Índice de documentación de Comgraf CRM

**Revisión:** 2026-11-15 · **Código descrito:** producto 1.5.0, contrato HTTP 5.
**Alcance:** checkout local y archivos versionados; no se tuvo acceso al servidor físico durante esta revisión.

Empieza por esta página. Las guías operativas actuales están separadas de los informes históricos para evitar seguir por error pasos de una versión anterior.

## Rutas principales

| Documento | Dirigido a | Resuelve | Conocimientos necesarios | Relacionados | Fecha y versión de referencia |
|---|---|---|---|---|---|
| [README](../README.md) | Desarrolladores y administradores | Identifica el sistema y permite instalarlo para desarrollo | Terminal, Python, Node y MySQL | [Arquitectura](ARQUITECTURA.md), [Mantenimiento](MANTENIMIENTO.md), [Operación](OPERACION.md) | Revisado en inventario 2026-11-15; producto 1.5.0 / contrato 5 |
| [Arquitectura](ARQUITECTURA.md) | Desarrolladores | Explica capas, relaciones y reglas que deben conservarse | Lectura básica de React, FastAPI y SQL | [Base de datos](BASE_DE_DATOS.md), [Mantenimiento](MANTENIMIENTO.md) | Actualizado 2026-11-15; producto 1.5.0 / contrato 5 |
| [Mantenimiento](MANTENIMIENTO.md) | Desarrolladores | Indica dónde cambiar reglas, API, formularios y pruebas | Python y JavaScript básicos | [Arquitectura](ARQUITECTURA.md), [Verificación](VERIFICACION.md) | Revisado 2026-11-15; contrastar resultados históricos con esta revisión |
| [Base de datos](BASE_DE_DATOS.md) | Desarrolladores y administradores | Resume tablas, relaciones, índices, migraciones y límites de las pruebas | SQL básico; respaldo/restauración requieren autorización operativa | [Operación](OPERACION.md), [Arquitectura](ARQUITECTURA.md) | Actualizado 2026-11-15; esquema definido por Alembic |
| [Operación](OPERACION.md) | Administradores | Actualización, respaldo, recuperación y diagnóstico del perfil documentado | Linux, Docker Compose y acceso autorizado al servidor | [Solución de problemas](SOLUCION_PROBLEMAS.md), [Base de datos](BASE_DE_DATOS.md) | Revisado 2026-11-15; beta según archivos; verificar host antes de ejecutar |
| [Solución de problemas](SOLUCION_PROBLEMAS.md) | Operadores y administradores | Diagnostica fallos comunes con comprobaciones de solo lectura primero | Terminal; acceso Docker para problemas del servidor | [Operación](OPERACION.md), [README](../README.md) | Actualizado 2026-11-15; comandos cotejados con el repositorio |
| [Uso del CRM](USO_OPERATIVO.md) | Atención, Producción, Cobranza y administración | Describe pantallas y procesos implementados | Uso básico del navegador y permisos asignados | [Arquitectura](ARQUITECTURA.md), [Operación](OPERACION.md) | Actualizado 2026-11-15; producto 1.5.0 |
| [Auditoría del repositorio](AUDITORIA_REPOSITORIO_2026-11-15.md) | Responsable técnico y mantenedores | Registra hallazgos, cambios, pruebas y pendientes de esta revisión | Lectura técnica básica | Los documentos anteriores | Revisión 2026-11-15; código de la rama `main` descrita |

## Referencias históricas y de laboratorio

Estos documentos conservan evidencia o decisiones previas. No reemplazan las guías principales para operar la versión actual. Sus instrucciones de actualización deben leerse junto con [Operación](OPERACION.md).

| Documento | Dirigido a | Resuelve | Conocimientos necesarios | Relacionados | Fecha y versión de referencia |
|---|---|---|---|---|---|
| [Verificación](VERIFICACION.md) | Mantenedores | Resultados de regresión anteriores | Backend, MySQL y Playwright | [Operación](OPERACION.md), [Auditoría](AUDITORIA_REPOSITORIO_2026-11-15.md) | 2026-10-17 y otras rondas/versiones declaradas en el documento; histórico |
| [Revisión de mantenimiento](REVISION_MANTENIMIENTO.md) | Mantenedores | Mediciones SQL y rendimiento | SQL, Docker y métricas | [Arquitectura](ARQUITECTURA.md), [Operación](OPERACION.md) | 2026-11-09; commit de partida declarado en el archivo; no equivale al hardware real |
| [Resultados 1.5](RESULTADOS_1_5.md) | Mantenedores | Entrega técnica de producto | Lectura técnica | [Verificación](VERIFICACION.md), [Operación](OPERACION.md) | Producto 1.5.0; fecha de la ronda según el cuerpo; histórico |
| [Perfil LAN ligero](LAN_LIGERO.md) | Administradores | Instalación experimental con recursos limitados | Debian, Docker, almacenamiento y TLS | [Resultados LAN](LAN_LIGERO_RESULTADOS.md), [Operación](OPERACION.md) | Guía cotejada 2026-11-15; antecedente de rama/commit experimental citado en el cuerpo |
| [Resultados LAN ligero](LAN_LIGERO_RESULTADOS.md) | Responsables técnicos | Mediciones de laboratorio | Linux, Docker y carga | [Perfil LAN](LAN_LIGERO.md), [Auditoría](AUDITORIA_REPOSITORIO_2026-11-15.md) | 2026-10-20; commit `b3969fd…`; no certifica el E6320 ni el NAS |
| [Actualización de canales beta](ACTUALIZACION_CANALES_BETA.md) | Mantenedores | Historial de pausa de canales | Git, Compose, respaldos | [Retirada de mensajería](RETIRADA_MENSAJERIA.md), [Operación](OPERACION.md) | Commit histórico `9619b4f`; no aplicar como guía vigente |
| [Retirada de mensajería](RETIRADA_MENSAJERIA.md) | Mantenedores | Decisiones de retirada/compatibilidad | Compose, respaldos y modelos | [Operación](OPERACION.md), [Base de datos](BASE_DE_DATOS.md) | Versión y commits de referencia indicados en el cuerpo; histórico |
| [Actualización 1.5](ACTUALIZACION_1_5.md) | Mantenedores | Identificar la versión compilada y actualizarla | React, backend y Git | [Operación](OPERACION.md), [Resultados 1.5](RESULTADOS_1_5.md) | Producto 1.5.0, contrato 5; procedimiento histórico |
| [Eliminación e impresión](ELIMINACION_E_IMPRESION.md) | Mantenedores | Decisiones de borrado e impresión | SQL y pruebas de impresión | [Arquitectura](ARQUITECTURA.md), [Uso](USO_OPERATIVO.md) | Fecha no registrada; contrastar impresión con producto 1.5.0 actual |
| [Diagnóstico de alta CAI](DIAGNOSTICO_ALTA_CAI.md) | Mantenedores | Reproducir un fallo anterior y sus verificaciones | API, MySQL de prueba y navegador | [Verificación](VERIFICACION.md), [Operación](OPERACION.md) | Commit de partida `c186f2a`; contrato 5/producto 1.5.0; caso histórico |
| [Branding](BRANDING.md) | Diseñadores y frontend | Ubicar recursos visuales locales | SVG/PNG y React | [Mantenimiento](MANTENIMIENTO.md) | Referencia de assets; fecha no registrada, revisar contra archivos actuales |
| [Referencias](REFERENCIAS.md) | Mantenedores | Procedencia de fuentes y decisiones | Lectura técnica | [Arquitectura](ARQUITECTURA.md), [Auditoría](AUDITORIA_REPOSITORIO_2026-11-15.md) | Fechas/versiones de las fuentes según el cuerpo; contexto histórico |
| [Observaciones ajenas a canales](OBSERVACIONES_AJENAS_CANALES.md) | Mantenedores | Cierra una sospecha antigua sobre refresco de notas | React Query y claves de consulta | [Auditoría](AUDITORIA_REPOSITORIO_2026-11-15.md) | Revalidado 2026-11-15 contra el código 1.5.0; no es un bug vigente |

## Convenciones y límites

- El origen de verdad para esquema y relaciones es `backend/app/models.py` junto con las revisiones de `backend/migrations/versions/`. No edites una revisión que ya pudo aplicarse.
- La política y el contrato de API viven en `backend/app/schemas.py`, `backend/app/routers/`, `backend/app/services.py` y `backend/app/repository.py`; el frontend no sustituye autorización del servidor.
- Los pasos de operación describen el perfil definido por Compose y por la guía. La auditoría se ejecutó en Windows, sin Docker ni MySQL activos; no confirma la instalación física, DNS, certificados, Tailscale, NAS ni límites reales del servidor.
- La suite de integración elimina filas. Exige sufijo `_test` y aislamiento real de la base/perfil; un nombre por sí solo no protege datos. Consulta [Perfil LAN ligero: pruebas reproducibles](LAN_LIGERO.md#pruebas-reproducibles) antes de ejecutarlas con Compose.
- No subas `.env`, `.runtime/`, `output/`, volcados SQL, adjuntos ni capturas con datos de clientes. `.gitignore` excluye esos artefactos locales.
