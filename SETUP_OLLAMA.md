# 🚀 Guía de Instalación - Ollama + IA Local

## Opción 1: Instalación AUTOMÁTICA (Recomendado)

### Para usuarios Windows:

1. **Haz doble clic** en el archivo `instalar-ollama.bat`
2. **Espera** a que termine (10-20 minutos la primera vez)
3. ¡Listo! Ollama estará instalado y funcionando

### Para usuarios Mac/Linux:

```bash
bash setup-ollama.sh
```

---

## Opción 2: Instalación Manual

### Paso 1: Descargar Ollama

- Entra a: https://ollama.ai/download
- Descarga la versión para tu sistema operativo
- Instala normalmente

### Paso 2: Descargar un Modelo

Abre PowerShell/Terminal y ejecuta:

```bash
ollama pull mistral
```

O elige otro modelo:

```bash
ollama pull llama2        # Más pequeño (~4GB)
ollama pull neural-chat   # Rápido (~5GB)
ollama pull openchat      # Muy rápido (~3.5GB)
```

---

## Paso 3: Iniciar la Aplicación

### Terminal 1 - Frontend (Vite):

```bash
npm run dev
```

Accede a: `http://localhost:5173/Gopilot-INDUSTRIAL/`

### Terminal 2 - Backend (Node.js):

```bash
npm run dev:server
```

### Terminal 3 - Ollama (opcional):

```bash
ollama serve
```

---

## ✅ Verificar que Todo Funciona

Ollama debe estar respondiendo en:

```
http://localhost:11434/api/tags
```

Si ves JSON con tus modelos: ✅ **¡Está funcionando!**

---

## 🔧 Modelos Disponibles

| Modelo          | Tamaño | Velocidad  | Memoria  |
| --------------- | ------ | ---------- | -------- |
| mistral         | 5GB    | Media      | 8GB RAM  |
| llama2          | 4GB    | Media      | 8GB RAM  |
| openchat        | 3.5GB  | Rápida     | 6GB RAM  |
| neural-chat     | 5GB    | Muy rápida | 8GB RAM  |
| dolphin-mixtral | 27GB   | Lenta      | 32GB RAM |

---

## ❌ Solución de Problemas

### "Ollama no responde"

```bash
# Verificar si está corriendo:
curl http://localhost:11434/api/tags

# Si no funciona, inicia manualmente:
ollama serve
```

### "Error descargando modelo"

```bash
# Reintentar:
ollama pull mistral

# O especificar otra versión:
ollama pull mistral:7b-q4_K_M
```

### "Página en blanco"

1. ¿Está corriendo Vite? `npm run dev`
2. ¿Está corriendo el backend? `npm run dev:server`
3. ¿Está corriendo Ollama? Verificar en `http://localhost:11434`

---

## 📋 Checklist Final

- [ ] Ollama descargado e instalado
- [ ] Al menos un modelo descargado (`ollama pull mistral`)
- [ ] Terminal 1: `npm run dev` ✅
- [ ] Terminal 2: `npm run dev:server` ✅
- [ ] Terminal 3: Ollama corriendo ✅
- [ ] `.env` configurado con `VITE_AGENT_BACKEND=ollama` ✅
- [ ] Accede a http://localhost:5173/Gopilot-INDUSTRIAL/ ✅

¡Si todo está en verde, ¡funciona! 🎉

---

## 🔗 Enlaces Útiles

- [Ollama Official](https://ollama.ai)
- [Modelos disponibles](https://ollama.ai/library)
- [Documentación](https://github.com/ollama/ollama)
