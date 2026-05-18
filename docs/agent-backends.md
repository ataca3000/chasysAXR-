# Backends de Agente AI

Este proyecto soporta múltiples backends de IA:

- `Gemini` en la nube (por defecto).
- `Ollama` local para privacidad y uso en el borde.

## Configuración

En `.env` o `.env.local`, define:

- `VITE_AGENT_BACKEND=gemini` o `VITE_AGENT_BACKEND=ollama`
- `VITE_OLLAMA_MODEL=mistral`

## Gemini

Gemini es el backend de IA primario. El servidor usa `GEMINI_API_KEY` para solicitar generación de contenido y mantener la clave fuera del cliente.

## Ollama local

Para usar Ollama local:

1. Instala Ollama en tu máquina o en un contenedor.
2. Arranca Ollama con `OLLAMA_ORIGINS="*"` para permitir peticiones desde tu frontend.
3. Asegúrate de que Ollama escuche en `http://localhost:11434`.
4. Selecciona `Ollama (Local)` en el selector de backend dentro del panel UI.

El proxy `/api/ollama` en el servidor reenvía las solicitudes del frontend hacia la instancia local de Ollama.

## Nota de privacidad

- El modo local usa el modelo en tu equipo, evitando el envío de datos sensibles a la nube.
- El modo Gemini es útil cuando requieres mayor cobertura, capacidad de razonamiento y disponibilidad global.

## Fallback

Si la llamada local a Ollama falla, el código actualmente intenta volver al backend de Gemini automáticamente.
