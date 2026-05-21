# Script de instalación automática de Ollama + Modelos
# Ejecutar como administrador: powershell -ExecutionPolicy Bypass -File setup-ollama.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Instalador Automático de Ollama + IA Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar si Ollama ya está instalado
Write-Host "✓ Verificando si Ollama está instalado..." -ForegroundColor Yellow
$ollamaPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe"

if (Test-Path $ollamaPath) {
    Write-Host "✅ Ollama ya está instalado" -ForegroundColor Green
} else {
    Write-Host "⏳ Descargando Ollama..." -ForegroundColor Yellow
    
    # Descargar instalador de Ollama
    $ollamaInstaller = "$env:TEMP\OllamaInstall.exe"
    $downloadURL = "https://ollama.ai/download/OllamaSetup.exe"
    
    try {
        Invoke-WebRequest -Uri $downloadURL -OutFile $ollamaInstaller -ErrorAction Stop
        Write-Host "✅ Descarga completada" -ForegroundColor Green
        
        Write-Host "⏳ Instalando Ollama (espera 2-3 minutos)..." -ForegroundColor Yellow
        Start-Process -FilePath $ollamaInstaller -Wait
        
        Write-Host "✅ Ollama instalado correctamente" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error descargando Ollama: $_" -ForegroundColor Red
        Write-Host "Por favor descarga manualmente desde: https://ollama.ai/download" -ForegroundColor Red
        exit 1
    }
}

# 2. Iniciar el servicio de Ollama
Write-Host ""
Write-Host "✓ Iniciando servicio Ollama..." -ForegroundColor Yellow

# Verificar si ollama está corriendo
$ollamaRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -ErrorAction SilentlyContinue
    $ollamaRunning = $response.StatusCode -eq 200
} catch {
    $ollamaRunning = $false
}

if (-not $ollamaRunning) {
    Write-Host "⏳ Ollama no está corriendo, iniciando..." -ForegroundColor Yellow
    
    # Intentar iniciar Ollama
    $ollamaExe = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe"
    if (Test-Path $ollamaExe) {
        Start-Process -FilePath $ollamaExe -WindowStyle Hidden
        
        # Esperar a que Ollama inicie
        Write-Host "⏳ Esperando a que Ollama inicie..." -ForegroundColor Yellow
        $maxWait = 30
        $waited = 0
        
        while ($waited -lt $maxWait) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Host "✅ Ollama iniciado correctamente" -ForegroundColor Green
                    $ollamaRunning = $true
                    break
                }
            } catch {
                Start-Sleep -Seconds 1
                $waited++
            }
        }
        
        if (-not $ollamaRunning) {
            Write-Host "❌ Timeout esperando Ollama. Por favor inicia manualmente." -ForegroundColor Red
        }
    }
} else {
    Write-Host "✅ Ollama ya está corriendo" -ForegroundColor Green
}

# 3. Descargar modelo Mistral
Write-Host ""
Write-Host "✓ Descargando modelo Mistral (esto puede tomar 10-15 minutos)..." -ForegroundColor Yellow
Write-Host "  Tamaño: ~5GB" -ForegroundColor Gray

if ($ollamaRunning) {
    & cmd.exe /c "ollama pull mistral"
    Write-Host "✅ Modelo Mistral descargado" -ForegroundColor Green
} else {
    Write-Host "⚠️ Ollama no está disponible, por favor inicia el programa de Ollama" -ForegroundColor Yellow
    Write-Host "Luego ejecuta en PowerShell: ollama pull mistral" -ForegroundColor Yellow
}

# 4. Probar conexión
Write-Host ""
Write-Host "✓ Probando conexión con Ollama..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -ErrorAction SilentlyContinue
    $models = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Ollama está respondiendo correctamente" -ForegroundColor Green
    Write-Host "   Modelos disponibles:" -ForegroundColor Green
    
    foreach ($model in $models.models) {
        Write-Host "   - $($model.name)" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ No se pudo conectar a Ollama en localhost:11434" -ForegroundColor Yellow
}

# 5. Resumen final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup completado" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Asegúrate que Ollama está corriendo (debe estar en bandeja de tareas)" -ForegroundColor Yellow
Write-Host "2. En otra terminal PowerShell, ejecuta: npm run dev:server" -ForegroundColor Yellow
Write-Host "3. Accede a: http://localhost:5173/Gopilot-INDUSTRIAL/" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ollama estará escuchando en: http://localhost:11434" -ForegroundColor Gray
