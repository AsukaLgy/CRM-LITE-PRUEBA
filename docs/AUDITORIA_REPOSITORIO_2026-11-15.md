# Auditoría del repositorio · 2026-11-15

**Dirigido a:** responsable técnico y mantenedores. **Propósito:** dejar evidencia del inventario, riesgos, cambios y verificaciones de esta revisión.
**Código revisado:** producto 1.5.0, contrato HTTP 5. La versión de código fuente está en Git; el servidor físico no fue accesible desde este entorno.

## 1. Estado inicial

El workspace contenía el checkout `comgraf-crm-lite-feat-order-print-preview`, pero no tenía un `.git` dentro del proyecto. Git detectaba un repositorio vacío en `C:\Users\asuka`, con `master` y sin commits; `git status` desde allí enumeraba archivos personales ajenos al CRM. Para publicar el proyecto sin incluir ese árbol, se creó un repositorio Git dentro del checkout y se configuró el remoto solicitado. El remoto estaba vacío al consultarlo.

La rama publicada es `main`. El import inicial y dos correcciones pequeñas están en el remoto; la referencia actual puede consultarse con `git rev-parse HEAD` y `git ls-remote origin refs/heads/main`. No había una historia previa del proyecto con la cual comparar el último commit o atribuir cambios de checkout a un autor.

### Tecnologías y versiones observadas

| Área | Versión/configuración en los archivos |
|---|---|
| Frontend | React 19.2.4, React Router 7.18.4, TanStack Query 5.90.21, Vite 7.3.7, Node 24.11.1 (`frontend/.node-version`) |
| Backend | Python 3.14, FastAPI 0.135.1, Uvicorn 0.41.0, SQLAlchemy 2.0.48, Alembic 1.18.4, PyMySQL 1.1.2 |
| Validación/seguridad | Pydantic Settings 2.13.1, `pwdlib[argon2]` 0.3.0, `python-multipart` 0.0.22 |
| Base de datos | MySQL 8.4; Compose normal fija 8.4.11 y el perfil ligero construye 8.4.13 |
| Contenedores | Dockerfile multi-stage, Node/Python fijados por digest; Caddy 2.11.7 en el perfil ligero |
| Pruebas | pytest, Ruff, Node test runner, ESLint, Vite build, Playwright E2E |

Las versiones son las declaradas por locks/configuración. Docker, la base local y el servidor Comgraf no estaban disponibles en este turno; no se afirma una instalación runtime verificada.

## 2. Mapa real de la aplicación

| Área | Ubicación y responsabilidad |
|---|---|
| Frontend | `frontend/src/main.jsx` inicia React, Router y Query; `App.jsx` resuelve autenticación/rutas/permisos visibles; `Inbox.jsx`, `Clients.jsx` y `Reports.jsx` contienen vistas; `CasePage.jsx` coordina el expediente; `ProductForm.jsx` edita partidas; `CasePrintSheet.jsx` construye la ficha imprimible; `BindingScanner.jsx` contiene la terminal del rol exclusivo. `api.js` añade contrato HTTP, cookie same-origin y errores de interfaz. |
| Transporte backend | `backend/app/main.py` monta routers, valida las mutaciones, normaliza errores, sirve archivos estáticos y expone salud/versión. `routers/` separa autenticación, clientes, solicitudes, producción/finanzas, reportes, escáner e historial. |
| Reglas y consultas | `services.py` implementa transacciones y reglas de negocio; `repository.py` aplica visibilidad, consultas y proyecciones; `deletion.py` protege borrado y limpieza posterior; `schemas.py` valida entradas. |
| Persistencia | `models.py` declara tablas/FK/índices. `migrations/versions/` mantiene cambios incrementales. `db.py` crea la sesión SQLAlchemy y el engine. |
| Seguridad | `security.py` verifica la cookie, sesión, rol/permisos y usuario; `auth.py` gestiona login, cuentas y roles. El middleware en `main.py` controla contrato, encabezado de mutación, origen, errores y cabeceras HTTP. |
| Archivos | Metadatos/huellas en MySQL; contenido bajo `UPLOAD_DIR`, con claves aleatorias y limpieza reintentable tras el commit. |
| Infraestructura | `Dockerfile`, `compose.yaml`, `compose.low-resource.yaml`, `docker/` y `scripts/`. La instalación beta descrita en Operación requiere el wrapper `scripts/low-resource-compose.sh`. |
| Pruebas | `backend/unit_tests` no necesita MySQL; `backend/tests` usa MySQL desechable `_test`; `frontend/tests` son pruebas Node; `frontend/e2e` requiere servidor y datos aislados. |
| Documentación | `docs/INDICE.md` separa guías vigentes de informes y decisiones históricas. |

### Flujo de arranque y datos

`python -m app.start` configura logs, aplica Alembic hasta `head` y luego inicia Uvicorn. En despliegue, Caddy termina HTTPS y reenvía al proceso FastAPI; Vite solo sirve en desarrollo y proxya `/api` al backend. FastAPI entrega el mismo origen, React usa `/api`, los routers validan permiso/esquema, los servicios escriben mediante una sesión SQLAlchemy y MySQL conserva el expediente. Los archivos de arte se escriben en el directorio persistente `UPLOAD_DIR`. Una tarea interna de lifespan reabre seguimientos vencidos y reintenta limpieza de archivos cada minuto; no hay un scheduler externo configurado en este checkout.

## 3. Hallazgos priorizados

### Crítico

- **Modos de scripts incompatibles con las guías:** el índice Git inicial marcaba los scripts shell como `100644`, aunque varias guías los ejecutan directamente. El sistema Linux los rechazaría con “Permission denied”. **Corregido** en el commit de permisos: los siete `.sh` y el entrypoint MySQL ahora se publican como `100755`. Se verificó el modo Git; no se ejecutó en Linux porque no hay WSL en este Windows.
- **La configuración anterior de las pruebas del perfil LAN podía borrar la base operativa.** El preparador asignaba `comgraf_lan_test` al perfil normal y Compose reutilizaba `MYSQL_DATABASE` como `TEST_MYSQL_DATABASE`; `backend/tests/conftest.py` vacía tablas antes de los casos de integración. No ejecuté esa suite ni toqué datos. Corregí los valores por defecto y añadí una protección que rechaza que ambos nombres coincidan fuera del perfil aislado; el modo de prueba ahora exige almacenamiento, proyecto Compose, base y puertos separados. Los `.env` y directorios ya existentes no se reescriben: las instalaciones anteriores deben verificarse manualmente y no deben correr pruebas hasta confirmar el aislamiento.
- No se observó una alteración de datos durante esta revisión porque no se conectó a MySQL ni se ejecutaron pruebas de integración. Esto no certifica el host físico ni los perfiles locales preexistentes.

### Prioridad alta

| Hallazgo | Evidencia/causa | Acción y beneficio | Riesgo/prueba requerida |
|---|---|---|---|
| Los módulos centrales son largos y mezclan dominios | `services.py` ~1,211 líneas (solicitudes, producción/escaneo, cancelaciones y finanzas); `repository.py` ~615; `CasePage.jsx` ~1,139 y `ProductForm.jsx` ~1,007 | Mantener el mapa y la propuesta de separación por dominio. No hice una extracción amplia: reduciría acoplamiento, pero puede cambiar límites transaccionales/imports y exige pruebas MySQL completas | Alto si se mueve sin pruebas. Primero extraer un dominio con límites claros, conservar firmas y correr integración/E2E antes y después |
| Riesgo de agotamiento por cuerpos de adjunto grandes | `routers/production.py` lee como máximo 20 MiB después de que el parser multipart procesa la solicitud; los Caddyfiles no definen un límite de cuerpo | Dejar registrado el límite pendiente: rechazar solicitudes grandes antes de consumir disco temporal | Validar el límite HTTP con multipart, uploads de 20 MiB, cliente sin sesión y proxy real. No se cambió infraestructura: no hay Docker/Caddy local para validar. |
| Aislamiento insuficiente de las pruebas del perfil LAN | El generador anterior hacía coincidir `MYSQL_DATABASE` y `TEST_MYSQL_DATABASE`; la fixture de integración limpia tablas | Corregidos generador, Compose, wrapper, semilla, benchmark y guardas; el perfil de pruebas usa otro proyecto, base, directorios y puertos | Unit tests cubren defaults, rechazo de rutas, semilla y alias entre DB normal/pruebas. Falta `docker compose config` y prueba de integración en Linux. Los `.env` antiguos no cambian automáticamente. |
| Política de páginas de impresión en conflicto | La ficha preserva el área media carta, pero crea continuaciones; `order-print-layout.spec.js` espera varias páginas para una OP larga en Carta. Un requisito previo solicitó evitar páginas adicionales | Documentado en [Uso](USO_OPERATIVO.md) y [Solución de problemas](SOLUCION_PROBLEMAS.md); no ocultar o recortar datos | Requiere decisión de producto sobre contenido largo. Después, probar PDF carta/media carta con `pdfinfo`/`pdftotext` y casos reales anonimizados. |
| Integración de base no validada en esta máquina | No hay listener MySQL en `127.0.0.1:3306`; la suite de integración limpia tablas del esquema `_test` | Se evitó iniciar mutaciones o apuntar tests a la base operativa | Levantar/identificar una base aislada `_test` y repetir `pytest tests`; revisar la suite E2E con un backend de prueba dedicado. |

### Prioridad media

- La documentación estaba dispersa, con guías operativas mezcladas con notas históricas y sin un índice de audiencia/vigencia. **Corregido** con índice central, guía de uso, base de datos, solución de problemas y enlaces desde README.
- Una nota histórica de frontend describía como bug una invalidación de caché por prefijo que sí coincide con la clave activa de `CasePage`. Se comprobó el código y se cerró esa observación en vez de cambiar un flujo correcto.
- No hay workflow de CI bajo `.github/workflows/`. La cobertura depende de ejecutar localmente las validaciones y preparar MySQL/Playwright. Se recomienda incorporar CI por etapas, empezando por Node/unit/Ruff y añadiendo servicio MySQL aislado; no lo añadí sin poder validar los runners y sus tiempos.
- Los datos de infraestructura física (CPU, RAM, NAS, Tailscale y configuración efectiva) no se verificaron en el servidor. Los informes LAN existentes son pruebas de laboratorio, no garantía de producción.

## 4. Seguridad, permisos y estabilidad

Aspectos confirmados por lectura del código:

- Las credenciales de entorno están fuera de Git (`.env` se ignora); `.env.example` solo documenta claves de configuración. El escaneo de patrones comunes de secretos sobre los archivos preparados no devolvió candidatos. PDF/capturas de `output/` y `.runtime` no se incluyeron.
- El login verifica hashes Argon2, usa un hash ficticio cuando el usuario no existe y limita intentos por 15 minutos. Sesiones persistidas usan hash del token; la cookie es `HttpOnly`, `SameSite=Strict` y `Secure` depende de `COOKIE_SECURE`.
- Las mutaciones API requieren el encabezado propio y comprueban Origin/Host; el contrato del cliente se valida antes de cambios. La autorización real vive en backend.
- SQLAlchemy enlaza valores y oculta parámetros en su engine. El middleware evita entregar errores internos completos al cliente.
- Adjuntos permiten PDF/PNG/JPG/TXT, revisan firma en formatos binarios y validan hasta 20 MiB; su clave de almacenamiento es aleatoria y la descarga vuelve a comprobar acceso al expediente.
- Dockerfile copia módulos Python como dueño `comgraf` y ejecuta con ese usuario. Los `.py` son importados por `python -m`; requieren lectura y permiso de recorrido en directorios, no bit `+x` individual. `mysql-entrypoint.sh` recibe `chmod 0755` dentro de su Dockerfile; el bit ejecutable Git también quedó corregido. No se construyó imagen Docker en este equipo.

Riesgo restante: la validación del tamaño de archivo no limita por sí sola el tamaño total del cuerpo multipart antes del parsing; ver la prioridad alta.

## 5. Rendimiento y modularización

- No añadí cachés, dependencias, índices ni procesos. Las consultas de bandejas ya centralizan predicados en `repository.py`; los resultados anteriores de reducción de consultas están documentados en `REVISION_MANTENIMIENTO.md`, pero no se repitieron porque MySQL no está disponible.
- El build actual separa `BindingScanner` en un chunk lazy de ~464 kB sin comprimir (~121 kB gzip); el bundle principal es ~384 kB (~120 kB gzip). No se puede atribuir mejora sin baseline del mismo commit y entorno.
- `docker/compose.low-resource.yaml` fija cuotas y límites de proceso para DB, app y proxy, y el perfil usa un único worker. Es configuración declarada, no consumo medido en el NAS.
- La estructura por router/schema/service/repository/model ya existe. La mejora segura inmediata fue documentar los límites. Una extracción futura de `services.py` debe preservar transacciones e imports de router, ejecutarse por grupo funcional y no tocar estados/contratos en la misma etapa.

## 6. Cambios realizados

- Inicialicé Git dentro del checkout porque la raíz disponible era un `.git` vacío de la carpeta del usuario; apunté `origin` al repositorio solicitado y publiqué la rama `main`.
- Incluí 177 archivos del proyecto en el import inicial; excluí `.env`, `.runtime`, `.venv`, `node_modules`, `.vscode`, `output`, cachés y artefactos locales. Añadí `.node-version` para fijar Node 24.11.1.
- Añadí exclusiones para `.ruff_cache/`, `.vscode/` y `output/` al `.gitignore`.
- Corregí bits ejecutables de scripts shell usados por las guías.
- Añadí este informe, índice central, guía de tablas/migraciones, guía funcional y solución de problemas; enlacé el índice desde README y amplié el mapa de arquitectura.
- No cambié API, reglas de producción, datos, migraciones, índices ni dependencias.

## 7. Validación ejecutada

| Comando / comprobación | Resultado |
|---|---|
| `python -m pytest unit_tests -q` desde `backend/` | 35 pasaron; 1 advertencia deprecada de Starlette/TestClient. Incluye pruebas de aislamiento de configuración, semilla, suite destructiva y benchmark |
| `npm run test:unit` desde `frontend/` | 7 pasaron |
| `npm run lint` | Correcto; aviso de configuración de versión React en eslint-plugin-react |
| `npm run build` | Correcto; Vite 7.3.7 compiló 2,124 módulos |
| `python -m ruff check app tests ../scripts` | Correcto |
| `python -m pip check` | No hay dependencias Python rotas |
| `npm ls --depth=0` | Dependencias raíz presentes y coherentes con package.json |
| Comprobación de conexión a `127.0.0.1:3306` para base `_test` | No conectó: conexión rechazada. No se ejecutó la suite que limpia tablas. La revisión de configuración detectó y corrigió el alias destructivo entre la base normal y la de pruebas |
| `docker` / Compose | CLI Docker no disponible |
| `bash -n` de scripts | Bloqueado: Windows Subsystem for Linux indica que no hay distribución instalada |
| Git `100755` para scripts | Correcto para los siete `.sh` y el entrypoint |
| `git push` y comparación HEAD/`origin/main` | Correctos; rama sincronizada al verificar |

No se ejecutaron pruebas E2E de navegador, PDF real, restauración, migración de una base existente ni pruebas de carga del servidor físico.

## 8. Siguientes pasos recomendados

1. En una copia de prueba Linux, ejecutar `docker compose config`, construir ambos perfiles necesarios y correr `bash -n`/smoke de los wrappers.
2. Preparar una base `*_test` desechable y repetir suite completa backend, `alembic check` y E2E; confirmar que los procesos se conecten exclusivamente a esa base.
3. Medir el límite total de upload a través del Caddy real y fijar 413 antes del parsing sin impedir un archivo válido de 20 MiB.
4. Resolver la regla de continuación de impresión; después actualizar código/pruebas/documentación de forma conjunta.
5. Medir rendimiento de bandejas y detalle con datos sintéticos representativos y el hardware objetivo antes de extraer dominios de `services.py`/`ProductForm.jsx`.
6. Hacer un respaldo/restauración aislados y confirmar propiedad de los montajes de `UPLOAD_DIR` y MySQL. No aplicar pruebas de carga ni scripts destructivos a la instalación operativa.
