@echo off
chcp 65001 > nul
title Instalador Automático de Ollama + IA Local
color 0B

echo.
echo ========================================
echo Instalador de Ollama + Modelos IA Local
echo ========================================
echo.

REM Ejecutar script PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-ollama.ps1"

echo.
pause
