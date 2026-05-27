#!/bin/bash

# Script de instalación automática de Ollama + Modelos para Mac/Linux
# Ejecución: bash setup-ollama.sh

echo "========================================"
echo "Instalador Automático de Ollama + IA Local"
echo "========================================"
echo ""

# Detectar sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
    OLLAMA_PATH="$HOME/.ollama/ollama"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    OLLAMA_PATH="/usr/local/bin/ollama"
else
    echo "❌ Sistema operativo no soportado"
    exit 1
fi

echo "✓ Detectado: $OS"
echo ""

# 1. Verificar si Ollama está instalado
echo "✓ Verificando si Ollama está instalado..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama ya está instalado"
else
    echo "⏳ Descargando e instalando Ollama..."
    
    if [ "$OS" = "mac" ]; then
        # Descargar para Mac
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [ "$OS" = "linux" ]; then
        # Descargar para Linux
        curl -fsSL https://ollama.ai/install.sh | sh
    fi
    
    if command -v ollama &> /dev/null; then
        echo "✅ Ollama instalado correctamente"
    else
        echo "❌ Error instalando Ollama"
        echo "Por favor descarga desde: https://ollama.ai/download"
        exit 1
    fi
fi

# 2. Iniciar el servicio de Ollama
echo ""
echo "✓ Iniciando servicio Ollama..."

# Verificar si Ollama está corriendo
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama ya está corriendo"
else
    echo "⏳ Ollama no está corriendo, iniciando..."
    
    if [ "$OS" = "mac" ]; then
        # En Mac, Ollama generalmente se inicia como app
        open -a Ollama
    else
        # En Linux, iniciar como demonio
        ollama serve &
    fi
    
    # Esperar a que Ollama inicie
    echo "⏳ Esperando a que Ollama inicie..."
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo "✅ Ollama iniciado correctamente"
            break
        fi
        sleep 1
    done
fi

# 3. Descargar modelo Mistral
echo ""
echo "✓ Descargando modelo Mistral (esto puede tomar 10-15 minutos)..."
echo "  Tamaño: ~5GB"

ollama pull mistral

if [ $? -eq 0 ]; then
    echo "✅ Modelo Mistral descargado"
else
    echo "❌ Error descargando modelo"
    echo "Reintentar ejecutando: ollama pull mistral"
fi

# 4. Probar conexión
echo ""
echo "✓ Probando conexión con Ollama..."

if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama está respondiendo correctamente"
    echo "   Modelos disponibles:"
    curl -s http://localhost:11434/api/tags | jq '.models[].name' 2>/dev/null || echo "   (No se pudo obtener lista)"
else
    echo "⚠️  No se pudo conectar a Ollama en localhost:11434"
fi

# 5. Resumen final
echo ""
echo "========================================"
echo "✅ Setup completado"
echo "========================================"
echo ""
echo "Próximos pasos:"
echo "1. Asegúrate que Ollama está corriendo"
echo "2. En otra terminal, ejecuta: npm run dev:server"
echo "3. Accede a: http://localhost:5173/Gopilot-INDUSTRIAL/"
echo ""
echo "Ollama estará escuchando en: http://localhost:11434"
