@echo off
title Depo Air Isi Ulang - Server Toko & HP
echo ===================================================
echo   MEMULAI SERVER DEPO AIR ISI ULANG (LAPTOP & HP)...
echo ===================================================
echo.
echo [1] Buka di Laptop Server ini:
echo     http://localhost:3000
echo.
echo [2] Buka di HP (Kasir / Pengantar / Owner) via Wi-Fi Toko:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Alamat IPv4"') do (
    for /f "tokens=*" %%b in ("%%a") do (
        echo     http://%%b:3000
    )
)
echo.
echo Mohon jangan tutup jendela ini selama aplikasi digunakan!
echo.

set PATH=%~dp0.node\node-v20.14.0-win-x64;%PATH%

start "" "http://localhost:3000"

call "%~dp0.node\node-v20.14.0-win-x64\npm.cmd" run dev -- -H 0.0.0.0

pause
