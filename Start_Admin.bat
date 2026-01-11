@echo off
title StreamCMS Admin Panel
color 0A

echo.
echo ========================================
echo    STREAMCMS ADMIN PANEL
echo    GitHub-Powered CMS
echo ========================================
echo.
echo Starting local server...
echo.

REM Start the server in the background
start /B python server/cms_server.py

REM Wait a moment for server to start
timeout /t 3 >nul

REM Open the admin panel in default browser via Localhost
start "" "http://localhost:8000/admin/index.html"

echo.
echo Admin panel opened in your browser!
echo.
echo Keep this window open while using admin panel.
echo Close this window to exit (Server will stop).
echo.
echo ========================================

pause
taskkill /IM python.exe /F
