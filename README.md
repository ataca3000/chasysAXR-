“Sistema Ciberfísico Integrado para Control Industrial, Prototipado Inteligente y Supervisión Predictiva Multiplataforma – LFDS” es una plataforma de automatización que combina un módulo de control tipo PLC‑lite con una aplicación web multiplataforma capaz de monitorear, simular y operar procesos industriales en tiempo real. El sistema integra sensores, actuadores, gemelo digital 3D y herramientas de prototipado asistidas por inteligencia artificial para análisis, optimización y prevención de riesgos operativos, permitiendo incluso anticipar condiciones peligrosas mediante supervisión predictiva. Su arquitectura distribuida permite operar desde computadoras, navegadores y dispositivos móviles de baja gama, convirtiéndolo en un laboratorio ciberfísico portátil para control, simulación y seguridad industrial avanzada.# EBSAMBLE CREATORS  CON GoPilot iAgnt — Industrial AI & Digital Twin Framework GoPilot iAgnt — ENSANBLE CREATORSEl centro de control definitivo para creadores de hardware, impresión 3D y robótica basada en Arduino

![Release](https://img.shields.io/badge/release-v1.0.0-blue.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)
![Platform](https://img.shields.io/badge/platform-web%20%7C%20edge%20%7C%20iot-lightgrey.svg)

## Visión del proyecto
GoPilot iAgnt es un sistema industrial integral para control de hardware, agentes inteligentes y gemelos digitales 3D. El proyecto une una PWA con WebSerial/WebUSB, un motor de agentes IA y drivers de hardware industrial sobre una arquitectura modular y escalable.

## Objetivos clave
- Interfaz PWA para control industrial y diagnóstico.
- Agente inteligente basado en IA y pipelines de decisiones.
- Drivers modernos para ESP32, CNC y sensores.
- Conectividad segura con API y Cloudflare Tunnel.
- Gemelo digital 3D basado en Three.js.

## Estructura profesional
- `/src`
  - `/ui` - PWA y presentaciones React
  - `/components` - UI atómica reutilizable
  - `/hooks` - lógica compartida React
  - `/agents` - inteligencia y pipeline de agentes
  - `/drivers`
    - `/webserial`
    - `/webusb`
  - `/3d` - escena y gemelo digital
  - `/services` - API, sincronización y cloud
  - `/store` - estado global con Zustand
  - `/workflows` - orquestación de pipelines
- `/public` - recursos estáticos y manifest
- `/docs` - documentación técnica y arquitectura
- `/tests` - pruebas unitarias e integradas
- `/scripts` - utilidades de desarrollo y release

## Comandos principales
```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
npm run typecheck
```

## Agente y backend AI
- Por defecto el sistema usa Google Gemini en la nube para razonamiento de alto alcance.
- Se soporta backend local opcional mediante Ollama/Mistral, preservando privacidad y evitando carga en la nube.
- Usa `VITE_AGENT_BACKEND=gemini` o `VITE_AGENT_BACKEND=ollama` para fijar el comportamiento en tiempo de construcción.
- Localmente, `VITE_OLLAMA_MODEL` puede apuntar a `mistral`, `llama3`, `mistral-nemo`, etc.

## Almacenamiento S3
- El servidor expone `/api/s3/presign` para obtener URLs presignadas de PUT.
- El cliente usa `/src/services/storage/s3.ts` para subir archivos de forma segura sin exponer credenciales.
- Define `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, y `AWS_SECRET_ACCESS_KEY` en `.env` o `.env.local`.

## Branch strategy
- `main` - versión estable de producción
- `dev` - integración continua
- `feature/*` - nuevas funcionalidades
- `fix/*` - correcciones de bugs
- `release/*` - preparación de versiones

## Documentación importante
- `architecture.md` — Arquitectura general
- `roadmap.md` — Hoja de ruta del producto
- `CHANGELOG.md` — Registro de cambios
- `CONTRIBUTING.md` — Cómo contribuir
- `SECURITY.md` — Seguridad y reportes

## Licencia
MIT License
