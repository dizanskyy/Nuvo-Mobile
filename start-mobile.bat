@echo off
chcp 65001 >nul
title Nuvo Original - Adaptive Mobile
echo ====================================================
echo      Запуск Nuvo Original (Adaptive Mobile)
echo ====================================================
echo.
cd /d "%~dp0"
start "" http://localhost:5173
call npx.cmd vite --config vite.mobile.ts
pause
