@echo off
echo Starting User Data API...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Check if dist folder exists
if not exist "dist" (
    echo Building TypeScript...
    npm run build
    echo.
)

echo Starting server...
echo Server will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

npm start
