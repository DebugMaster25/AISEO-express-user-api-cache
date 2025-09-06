@echo off
echo Starting User Data API (Simple JavaScript Version)...
echo.

REM Check if package-simple.json exists and install dependencies
if exist "package-simple.json" (
    echo Installing dependencies for simple version...
    copy package-simple.json package.json
    npm install
    echo.
)

echo Starting server...
echo Server will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

node simple-server.js
