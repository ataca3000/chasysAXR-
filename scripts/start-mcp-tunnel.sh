#!/bin/bash

# Script para iniciar el servidor MCP Industrial y exponerlo vía Ngrok
# Uso: bash start-mcp-tunnel.sh

PORT=3001
SERVER_DIR="../apps/industrial-control/src/server"

echo "=================================================="
echo "🚀 GOPILOT INDUSTRIAL - MCP TUNNEL ACTIVATOR"
echo "=================================================="

# 1. Validaciones previas
if ! command -v ngrok &> /dev/null; then
    echo "❌ Ngrok no está instalado. Descárgalo en: https://ngrok.com/download"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado."
    exit 1
fi

# 2. Instalación de dependencias si es necesario
echo "📦 Verificando dependencias del servidor MCP..."
cd "$(dirname "$0")/$SERVER_DIR" || exit
if [ ! -d "node_modules" ]; then
    npm install
fi

# 3. Iniciar el servidor MCP en segundo plano
echo "⚡ Iniciando servidor MCP en puerto $PORT..."
node server.js &
SERVER_PID=$!

# 4. Iniciar Ngrok
echo "🌐 Abriendo túnel seguro..."
echo "--------------------------------------------------"
echo "👉 COPIA LA URL 'Forwarding' (https://...) y pégala"
echo "   en la configuración de Jarvis en el frontend."
echo "--------------------------------------------------"

ngrok http $PORT

# Al cerrar Ngrok, matamos el proceso de Node
kill $SERVER_PID