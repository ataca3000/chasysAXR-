# Contributing to GoPilot iAgnt

## Proceso de contribución
1. Abre una issue para describir la funcionalidad o problema.
2. Crea una rama basada en `dev`:
   - `feature/<descripción>`
   - `fix/<descripción>`
   - `release/<versión>`
3. Envía un pull request con descripción clara y pruebas.

## Reglas de estilo
- Usa `camelCase` para variables y funciones.
- Usa `PascalCase` para componentes React.
- Mantén los componentes pequeños y con una única responsabilidad.
- Valida datos con Zod en la capa de dominio.

## Tests
- Ejecuta `npm run lint` antes del PR.
- Ejecuta `npm run test` y `npm run typecheck`.
- Incluye pruebas unitarias para la lógica de agentes cuando sea necesario.

## Review
- Un PR debe incluir: motivación, cambios, pruebas, y archivos modificados.
- Responde a revisiones de code review rápidamente.
- Usa comentarios claros y constructivos.
