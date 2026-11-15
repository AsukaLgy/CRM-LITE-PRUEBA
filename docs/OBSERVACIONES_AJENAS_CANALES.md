# Cierre de una observación histórica sobre la bitácora

**Revisión:** 2026-11-15 · **Código comprobado:** producto 1.5.0. **Dirigido a:** mantenedores de frontend. **Requiere:** conocimiento básico de React Query.

Una nota antigua planteó que la clave de caché de `Composer` no coincidía con la de `CasePage`. Al verificar la implementación actual, `CasePage` lee con `['case', id, selectedProductionId]` y `Composer` invalida con el prefijo `['case', String(record.id)]`. React Query invalida por prefijo de forma predeterminada; los tipos de id también coinciden como cadena. Por tanto, esa nota no demuestra un defecto vigente y no justifica modificar el flujo. Se conserva este archivo para dejar constancia de que la sospecha se revisó y cerró.
