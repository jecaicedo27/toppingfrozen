@echo off
title Bancolombia Agent - ToppingFrozen
echo ==========================================
echo   ToppingFrozen - Agente Bancolombia
echo ==========================================
echo.

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. Por favor instalalo desde nodejs.org
    pause
    exit /b
)

:: Install dependencies if node_modules missing
if not exist "node_modules" (
    echo [INFO] Instalando dependencias (primera vez)...
    call npm install
    call npx playwright install chromium
)

echo.
echo [INFO] Iniciando Agente...
echo [INFO] Manten esta ventana abierta mientras sincronizas.
echo.

node bancolombia_agent.js

pause
