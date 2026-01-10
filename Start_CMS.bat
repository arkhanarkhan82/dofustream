@echo off
echo ===================================================
echo   SPORTSTREAM CMS - LOCAL SERVER LAUNCHER
echo ===================================================
echo.
echo [1] Starting Local CMS Server...
echo [2] Opening Admin Panel in Browser...
echo.
echo DO NOT CLOSE THIS WINDOW while using the Admin Panel.
echo.

:: Get the directory of this script
set "CMS_ROOT=%~dp0"
cd /d "%CMS_ROOT%"

:: Python Check
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit
)

:: Open Browser (Wait 2s for server to start)
start "" "http://localhost:8000/admin/admin.html"

:: Start Server (Using the server script)
python "server/cms_server.py"

pause
