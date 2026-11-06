@echo off
title MedSetup
cd /d "C:\Users\marin\.gemini\antigravity\scratch\medsetup"

netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    start http://localhost:3000
    exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run start' -WorkingDirectory 'C:\Users\marin\.gemini\antigravity\scratch\medsetup' -WindowStyle Hidden"

set count=0
:wait_loop
timeout /t 1 /nobreak >nul
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 goto server_ready
set /a count+=1
if %count% geq 15 goto server_ready
goto wait_loop

:server_ready
start http://localhost:3000
exit /b 0
