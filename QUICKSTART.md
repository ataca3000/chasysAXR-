# 🚀 Quick Start - Gopilot Industrial IA

## ⚡ Inicio Rápido (5 minutos)

### Opción 1: Instalación Automática (Recomendado)

#### En Windows:

```bash
# Simplemente ejecuta (como administrador):
instalar-ollama.bat
```

#### En Mac/Linux:

```bash
bash setup-ollama.sh
```

**¿Qué hace?**

- ✅ Descarga e instala Ollama automáticamente
- ✅ Descarga el modelo Mistral (~5GB)
- ✅ Configura todo para funcionar localmente

---

### Opción 2: Inicio Manual

#### Paso 1: Instalar Ollama

- Descarga desde: https://ollama.ai/download
- Instala normalmente

#### Paso 2: Descargar un modelo

```bash
ollama pull mistral
```

#### Paso 3: Iniciar la aplicación

Abre **3 terminales diferentes**:

**Terminal 1 - Frontend (Vite):**

```bash
npm run dev
```

→ Abre: http://localhost:5173/Gopilot-INDUSTRIAL/

**Terminal 2 - Backend (API Proxy):**

```bash
npm run dev:server
```

**Terminal 3 - Ollama (Modelo IA):**

```bash
ollama serve
```

---

## ✅ Verificar que funciona

Si ves esto, ¡funciona! ✅

- Frontend cargando en http://localhost:5173/
- Backend respondiendo en http://localhost:3000
- Ollama disponible en http://localhost:11434/api/tags

---

## 📋 Estructura

```
3 servidores corriendo en paralelo:
┌─────────────────────────────────────────────────┐
│ Terminal 1: Frontend Vite (React UI)            │ → http://localhost:5173
├─────────────────────────────────────────────────┤
│ Terminal 2: Backend Node.js (Express Proxy)     │ → http://localhost:3000
├─────────────────────────────────────────────────┤
│ Terminal 3: Ollama (Modelo IA Local)            │ → http://localhost:11434
└─────────────────────────────────────────────────┘
```

---

## 🎯 Casos de Uso

### Control de CNC/Plasma

- Monitoreo de temperatura
- Detección de vibraciones
- Predicción de mantenimiento
- Generación de G-code

### IA Industrial

- Análisis de telemetría
- Recomendaciones automáticas
- Visión por computadora (en desarrollo)

### Completamente Local

- ✅ Sin enviar datos a la nube
- ✅ Funciona offline
- ✅ Rápido y privado

---

## 🔧 Comandos Útiles

```bash
# Descarga modelos disponibles
ollama pull llama2          # 4GB, muy bueno
ollama pull neural-chat     # 5GB, rápido
ollama pull mistral         # 5GB, recomendado

# Ver modelos descargados
ollama list

# Ejecutar modelo manualmente
ollama run mistral

# Ver logs del backend
npm run dev:server          # Los logs aparecen en la terminal

# Ejecutar tests
npm test

# Verificar tipos (TypeScript)
npm run typecheck
```

---

## ⚠️ Requisitos Mínimos

- **RAM**: 8GB (recomendado 16GB)
- **Espacio disco**: 10GB libre
- **Internet**: Solo para descargar modelos (primera vez)

---

## ❌ Troubleshooting

### "Página en blanco"

1. ¿Vite corriendo? `npm run dev` debe decir `ready in XXms`
2. ¿Backend corriendo? `npm run dev:server` debe estar activo
3. Revisa console del navegador (F12) para errores

### "Error de conexión con Ollama"

```bash
# Verificar que Ollama está corriendo
curl http://localhost:11434/api/tags

# Si falla, inicia Ollama manualmente:
ollama serve

# O verifica puerto 11434 está libre
netstat -ano | findstr :11434    # Windows
lsof -i :11434                   # Mac/Linux
```

### "Modelo no descarga"

```bash
# Reintentar con verbose
ollama pull mistral -v

# Aumentar timeout si tienes internet lento
# (espera más tiempo, no canceles)
```

### "Error de permisos (Windows)"

- Ejecuta PowerShell **como Administrador**
- O ejecuta `instalar-ollama.bat` **como Administrador**

---

## 📚 Documentación Completa

Ver [SETUP_OLLAMA.md](./SETUP_OLLAMA.md) para guía detallada.

Ver [README.md](./README.md) para documentación del proyecto.

---

## 🎓 Próximos Pasos

1. ✅ Instala Ollama
2. ✅ Descarga un modelo
3. ✅ Inicia los 3 servidores
4. 📖 Explora componentes en `src/ui/components/`
5. 🔧 Modifica prompts en `src/services/`

---

## 💡 Tips

- Usa **Mistral** para iniciarte (5GB, rápido)
- Usa **LLama2** si tienes menos RAM (4GB)
- Los modelos se guardan en: `~/.ollama/models/`
- Primera descarga toma 10-15 minutos (luego instantáneo)

---

## 🆘 Ayuda

Si algo no funciona:

1. Mira la terminal con los logs
2. Verifica que los 3 puertos están disponibles
3. Lee [SETUP_OLLAMA.md](./SETUP_OLLAMA.md)
4. Revisa [README.md](./README.md)

¡Diviértete! 🚀
