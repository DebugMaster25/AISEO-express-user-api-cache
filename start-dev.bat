@echo off
echo Starting User Data API in development mode...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting development server with hot reload...
echo Server will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

npm run dev
