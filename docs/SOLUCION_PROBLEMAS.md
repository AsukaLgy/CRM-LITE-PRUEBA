# Solución de problemas

**Dirigido a:** operadores y administradores. **Resuelve:** primeras comprobaciones y rutas seguras de recuperación.
**Requisitos:** terminal; para comandos del servidor, acceso autorizado a Docker Compose.
**Revisión:** 2026-11-15 · producto 1.5.0 · comandos cotejados con scripts y Compose del repositorio.

## Antes de diagnosticar

No publiques `.env`, salida completa de `docker compose config`, trazas con datos de clientes, cookies, volcados SQL ni adjuntos. Empieza con estado y logs acotados. En el servidor beta, la guía registra el checkout `/opt/comgraf-beta/lite`; el estado actual de ese host no pudo comprobarse en esta revisión. Verifica directorio y perfil antes de ejecutar comandos.

Desde la raíz del checkout beta:

```sh
./scripts/diagnose-deployment.sh
./scripts/low-resource-compose.sh ps
./scripts/low-resource-compose.sh logs --tail=100 app
```

La guía de [Operación](OPERACION.md) manda usar el wrapper `low-resource-compose.sh` para ese perfil; no lo sustituyas por un `docker compose` directo porque el wrapper selecciona los archivos y rutas esperados.

## Aplicación detenida o en reinicio

**Síntoma:** no responde el sitio o el servicio aparece `restarting`.
**Diagnóstico:** ejecuta el bloque de estado anterior; revisa solo las últimas líneas de `app` y luego de `db`. Comprueba `health` en la salida de estado y el identificador de imagen.
**Causa probable:** configuración ausente, base sin salud, permiso de volumen o migración fallida.
**Solución segura:** corrige la causa indicada; no borres el contenedor de base, volúmenes ni datos. Si la actualización comenzó, sigue [Actualización y recuperación](OPERACION.md#actualizar-optcomgraf-betalite).
**Verificación:** el contenedor `app` queda saludable y `/api/health` indica `status=ok` y `database=mysql`.

## Error al conectar con MySQL

**Síntoma:** la interfaz carga pero las llamadas a API devuelven 503/500, o `db` no queda saludable.
**Diagnóstico:** `./scripts/low-resource-compose.sh ps` y `./scripts/low-resource-compose.sh logs --tail=100 db`; confirma que `DB_HOST` en el perfil sea el servicio `db` y que el volumen de datos corresponda al checkout correcto. No imprimas valores de contraseña.
**Causa probable:** MySQL iniciando, nombre de base/usuario inconsistente, secreto incorrecto o propiedad/permiso del directorio de datos.
**Solución segura:** corrige únicamente el parámetro que corresponda y sigue el mensaje de `mysql-entrypoint`; no cambies propietario de forma recursiva sin confirmar el volumen. Nunca inicialices sobre un directorio existente no reconocido.
**Verificación:** healthcheck de `db` y luego `GET /api/health` correctos.

## Migración fallida

**Síntoma:** el proceso no empieza a servir o el log termina en Alembic.
**Diagnóstico:** conserva el error, versión del contenedor y la salida de `alembic current` en una base de diagnóstico; compara la revisión con `backend/migrations/versions/`.
**Causa probable:** migración previa incompleta, base que no corresponde a la app o incompatibilidad con el esquema real.
**Solución segura:** detén el cambio, verifica y respalda base y adjuntos, reproduce en copia aislada y prepara una migración correctiva nueva. No edites una revisión ya aplicada y no ejecutes `downgrade` a ciegas.
**Verificación:** `alembic current` coincide con `head`, `alembic check` no encuentra diferencias en una base compatible y `/api/health` responde.

## Inicio de sesión rechazado

**Síntoma:** el usuario recibe “Usuario o contraseña incorrectos”, o la sesión termina tras reiniciar el servicio.
**Diagnóstico:** confirma que la cuenta esté activa, que el proceso esté sano y que la URL use HTTPS cuando `COOKIE_SECURE=true`. Al arrancar, el servidor cambia la generación de sesión y revoca cookies anteriores.
**Causa probable:** credencial incorrecta, cuenta desactivada, límite temporal tras diez intentos en quince minutos o reinicio de API.
**Solución segura:** espera el periodo si hubo intentos; un administrador puede restablecer contraseña con el flujo soportado. Para la primera cuenta en base vacía consulta el comando `create-admin` del README. No compartas ni pongas contraseñas en tickets o logs.
**Verificación:** inicia sesión de nuevo y confirma `/api/auth/me` desde la interfaz.

## Carga o descarga de adjuntos

**Síntoma:** el adjunto se rechaza, supera tamaño permitido o no se encuentra después de restaurar.
**Diagnóstico:** solo se aceptan PDF, PNG, JPG/JPEG y TXT; la ruta valida firma de los formatos binarios y limita el archivo a 20 MiB. El contenido se guarda en `UPLOAD_DIR`, fuera de MySQL.
**Causa probable:** formato, archivo vacío, más de 20 MiB, directorio de adjuntos ausente o respaldo incompleto.
**Solución segura:** exporta a un formato permitido o reduce el archivo; para recuperación restaura el dump SQL y la copia de `uploads` coordinadamente. No modifiques manualmente `storage_key`.
**Verificación:** descarga el adjunto desde su expediente y compara disponibilidad/tamaño; sigue el procedimiento de restauración de [Operación](OPERACION.md#respaldo-y-recuperacion).

**Riesgo de capacidad pendiente:** el endpoint comprueba el límite de 20 MiB después de que el parser multipart recibe el cuerpo. Los Caddyfiles versionados no configuran un máximo de solicitud. Un cuerpo HTTP mucho mayor puede consumir disco temporal antes del rechazo. Limitar también el cuerpo en proxy/ASGI es una mejora pendiente; requiere validar el límite con los 20 MiB permitidos más el encabezado multipart y probar el perfil real antes de desplegar.

## Interfaz y API incompatibles

**Síntoma:** la app informa que el contrato o el catálogo no coincide.
**Diagnóstico:** consulta `/api/version` y compara `product_version`, `contract_version` y `catalog_revision` con el bundle servido.
**Causa probable:** se actualizó solo una parte de la imagen o el navegador conserva una interfaz anterior.
**Solución segura:** despliega el frontend y backend de la misma build siguiendo [Operación](OPERACION.md); reinicia solo `app` después del respaldo requerido.
**Verificación:** versión/contrato de API y bundle coinciden y un flujo de lectura básico responde.

## Error de impresión o OP incompleta

**Síntoma:** QR o contenido incorrecto, orden equivocada o una página extra.
**Diagnóstico:** confirma `production_id` seleccionado, espera `data-layout-ready=true`, revisa que `data-layout-overflow=false` y abre la vista previa antes del diálogo del navegador.
**Causa probable:** otra OP seleccionada, ficha aún cargando, controlador con tamaño distinto o contenido largo que se paginó.
**Solución segura:** selecciona la OP correcta, espera la carga, usa el tamaño media carta o Carta indicado y escala 100 % sin encabezado/pie. No reduzcas fuentes globalmente para ocultar desbordes.
**Verificación:** el número OP y QR corresponden al registro, el texto está completo y la página usa 612 × 396 puntos para media carta.

La implementación admite continuación para contenido largo. El conflicto con el requisito anterior de impedir páginas adicionales está registrado en [la auditoría](AUDITORIA_REPOSITORIO_2026-11-15.md#prioridad-alta); no debe resolverse recortando información.

## Pruebas y ambiente local

La suite MySQL de `backend/tests` borra datos de tablas de prueba y exige que el nombre termine en `_test`. Si MySQL no está disponible, no cambies el nombre a una base operativa para “hacerla pasar”. Arranca una instancia aislada siguiendo README/Operación o informa que la integración está bloqueada. El perfil de Docker y la máquina física no se pudieron verificar desde el Windows de esta auditoría.
