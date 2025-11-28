@echo off
setlocal

echo ==========================================
echo      Iniciando Agenda ^& Lista Telefonica
echo ==========================================
echo.

cd /d "%~dp0"

REM Set a unique title for this window
title Agenda Local Server

echo [INFO] Verificando se o servidor ja esta rodando...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do (
    echo [INFO] Parando processo anterior (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] Dependencias nao encontradas. Instalando...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b %ERRORLEVEL%
    )
)

echo [INFO] Iniciando o servidor de desenvolvimento...
echo [INFO] Aguarde enquanto o site carrega...
echo.

REM Start the browser in a separate process after a short delay
REM Using 127.0.0.1 instead of localhost to avoid resolution issues
start "" cmd /c "timeout /t 8 >nul && echo [INFO] Abrindo navegador... && start http://127.0.0.1:5000"

REM Start the dev server
echo [INFO] Executando npm run dev...
pause
call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] O servidor parou com erro.
    pause
)

pause
