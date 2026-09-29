@echo off
title Depo Air Isi Ulang - Server Toko & HP
cd /d "%~dp0"
set PORT=3005

echo ===================================================
echo   MEMULAI SERVER DEPO AIR ISI ULANG (LAPTOP ^& HP)...
echo ===================================================
echo.

rem Pakai Node portable di folder .node jika ada, selain itu Node yang terpasang di Windows
if exist "%~dp0.node\node-v20.14.0-win-x64\npm.cmd" set PATH=%~dp0.node\node-v20.14.0-win-x64;%PATH%

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js belum terpasang. Download di https://nodejs.org lalu jalankan lagi file ini.
    pause
    exit /b 1
)

if not exist "%~dp0node_modules" (
    echo Menginstall dependency pertama kali, mohon tunggu...
    call npm install
    echo.
)

echo [1] Buka di Laptop Server ini:
echo     http://localhost:%PORT%
echo.
echo [2] Buka di HP (Kasir / Pengantar / Owner) via Wi-Fi Toko:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Alamat IPv4"') do (
    for /f "tokens=*" %%b in ("%%a") do (
        echo     http://%%b:%PORT%
    )
)
echo.
echo Mohon jangan tutup jendela ini selama aplikasi digunakan!
echo.

start "" "http://localhost:%PORT%"

call npm run dev -- -H 0.0.0.0 -p %PORT%

pause
