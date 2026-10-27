@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 20.9 o superior y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist "node_modules\next\package.json" (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Stack - Busqueda Inteligente: abre http://localhost:3000
echo Manten esta ventana abierta mientras usas la plataforma.
call npm run dev
if errorlevel 1 pause
