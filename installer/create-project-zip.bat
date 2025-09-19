@echo off
echo.
echo ============================================================
echo        TechPulse AI - Project Files Creator
echo                      Version 1.1.0
echo ============================================================
echo.

:: This script creates all necessary project files for offline installation
:: Run this on the development machine to create a complete project package

set PROJECT_DIR=%~dp0project-files
set SOURCE_DIR=%~dp0..\

echo [INFO] Creating project files package...
echo [INFO] Project directory: %PROJECT_DIR%
echo.

:: Create project directory structure
if exist "%PROJECT_DIR%" (
    echo [INFO] Removing existing project files...
    rmdir /s /q "%PROJECT_DIR%"
)

mkdir "%PROJECT_DIR%"
mkdir "%PROJECT_DIR%\backend"
mkdir "%PROJECT_DIR%\frontend"
mkdir "%PROJECT_DIR%\frontend\src"
mkdir "%PROJECT_DIR%\frontend\src\components"
mkdir "%PROJECT_DIR%\frontend\src\components\ui"
mkdir "%PROJECT_DIR%\frontend\public"
mkdir "%PROJECT_DIR%\docs"

echo [INFO] Copying backend files...
copy "%SOURCE_DIR%backend\server.py" "%PROJECT_DIR%\backend\"
copy "%SOURCE_DIR%backend\auth.py" "%PROJECT_DIR%\backend\"
copy "%SOURCE_DIR%backend\requirements.txt" "%PROJECT_DIR%\backend\"

:: Create backend .env file
(
    echo MONGO_URL="mongodb://localhost:27017"
    echo DB_NAME="techpulse_database"
    echo CORS_ORIGINS="*"
    echo EMERGENT_LLM_KEY=sk-emergent-f1eFaEfD2B745BeD26
    echo JWT_SECRET_KEY=techpulse-super-secret-jwt-key-2024-change-in-production
) > "%PROJECT_DIR%\backend\.env"

echo [INFO] Copying frontend files...
copy "%SOURCE_DIR%frontend\package.json" "%PROJECT_DIR%\frontend\"
copy "%SOURCE_DIR%frontend\src\App.js" "%PROJECT_DIR%\frontend\src\"
copy "%SOURCE_DIR%frontend\src\App.css" "%PROJECT_DIR%\frontend\src\"
copy "%SOURCE_DIR%frontend\src\index.js" "%PROJECT_DIR%\frontend\src\"
copy "%SOURCE_DIR%frontend\src\index.css" "%PROJECT_DIR%\frontend\src\"

:: Create frontend .env file
(
    echo REACT_APP_BACKEND_URL=http://localhost:8001
) > "%PROJECT_DIR%\frontend\.env"

:: Copy UI components (if they exist)
if exist "%SOURCE_DIR%frontend\src\components\ui\" (
    echo [INFO] Copying UI components...
    xcopy "%SOURCE_DIR%frontend\src\components\ui\*" "%PROJECT_DIR%\frontend\src\components\ui\" /s /e /y
)

:: Create basic React files if not exist
if not exist "%PROJECT_DIR%\frontend\src\index.js" (
    echo [INFO] Creating basic React index.js...
    (
        echo import React from 'react';
        echo import { createRoot } from 'react-dom/client';
        echo import './index.css';
        echo import App from './App';
        echo.
        echo const container = document.getElementById('root'^);
        echo const root = createRoot(container^);
        echo root.render(^<App /^>^);
    ) > "%PROJECT_DIR%\frontend\src\index.js"
)

if not exist "%PROJECT_DIR%\frontend\src\index.css" (
    echo [INFO] Creating basic index.css...
    (
        echo @tailwind base;
        echo @tailwind components;
        echo @tailwind utilities;
        echo.
        echo body {
        echo   margin: 0;
        echo   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        echo     'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        echo     sans-serif;
        echo   -webkit-font-smoothing: antialiased;
        echo   -moz-osx-font-smoothing: grayscale;
        echo }
    ) > "%PROJECT_DIR%\frontend\src\index.css"
)

:: Create public/index.html
echo [INFO] Creating public/index.html...
(
    echo ^<!DOCTYPE html^>
    echo ^<html lang="en"^>
    echo ^<head^>
    echo   ^<meta charset="utf-8" /^>
    echo   ^<meta name="viewport" content="width=device-width, initial-scale=1" /^>
    echo   ^<meta name="theme-color" content="#000000" /^>
    echo   ^<meta name="description" content="TechPulse AI - RSS Aggregation and Content Generation Platform" /^>
    echo   ^<title^>TechPulse AI^</title^>
    echo ^</head^>
    echo ^<body^>
    echo   ^<noscript^>You need to enable JavaScript to run this app.^</noscript^>
    echo   ^<div id="root"^>^</div^>
    echo ^</body^>
    echo ^</html^>
) > "%PROJECT_DIR%\frontend\public\index.html"

echo [INFO] Copying documentation files...
copy "%SOURCE_DIR%docs\*" "%PROJECT_DIR%\docs\"

echo [INFO] Creating additional configuration files...

:: Create tailwind.config.js
(
    echo /** @type {import('tailwindcss'^).Config} */
    echo module.exports = {
    echo   content: [
    echo     "./src/**/*.{js,jsx,ts,tsx}",
    echo   ],
    echo   theme: {
    echo     extend: {},
    echo   },
    echo   plugins: [],
    echo }
) > "%PROJECT_DIR%\frontend\tailwind.config.js"

:: Create postcss.config.js
(
    echo module.exports = {
    echo   plugins: {
    echo     tailwindcss: {},
    echo     autoprefixer: {},
    echo   },
    echo }
) > "%PROJECT_DIR%\frontend\postcss.config.js"

:: Create README.md
echo [INFO] Creating README.md...
(
    echo # TechPulse AI Platform
    echo.
    echo Professional AI-powered RSS feed aggregation and content generation platform.
    echo.
    echo ## Features
    echo.
    echo - **RSS Feed Aggregation**: 50+ trending tech sources
    echo - **AI Content Generation**: Multi-language support with Google Gemini
    echo - **Admin Panel**: Complete platform management
    echo - **API Key Management**: Multiple providers with automatic failover
    echo - **SEO Optimization**: 100%% SEO score with proper keywords
    echo - **Auto Publishing**: Social media and WordPress integration
    echo.
    echo ## Quick Start
    echo.
    echo ### Windows 10 Installation
    echo.
    echo 1. Run `TechPulse-Installer.bat` as Administrator
    echo 2. Wait for automatic installation
    echo 3. Access platform at `http://localhost:3000`
    echo.
    echo ### Manual Installation
    echo.
    echo #### Backend Setup
    echo ```bash
    echo cd backend
    echo python -m venv venv
    echo venv\Scripts\activate
    echo pip install -r requirements.txt
    echo python server.py
    echo ```
    echo.
    echo #### Frontend Setup
    echo ```bash
    echo cd frontend
    echo yarn install
    echo yarn start
    echo ```
    echo.
    echo ## Admin Credentials
    echo.
    echo - **Username**: admin
    echo - **Password**: admin123!@#TechPulse
    echo.
    echo ^> **Important**: Change the password after first login
    echo.
    echo ## Documentation
    echo.
    echo Open `docs/index.html` for complete documentation including:
    echo - Installation guide
    echo - API documentation
    echo - Troubleshooting
    echo - Admin panel usage
    echo.
    echo ## System Requirements
    echo.
    echo - Windows 10 ^(64-bit^)
    echo - Python 3.11+
    echo - Node.js 18+
    echo - MongoDB Community Server
    echo - 2GB free disk space
    echo.
    echo ## Support
    echo.
    echo For issues and troubleshooting, check the documentation or system logs.
) > "%PROJECT_DIR%\README.md"

:: Create startup scripts
echo [INFO] Creating startup scripts...

:: Backend startup script
(
    echo @echo off
    echo echo Starting TechPulse AI Backend...
    echo cd /d "%%~dp0backend"
    echo call venv\Scripts\activate.bat
    echo echo Backend starting on http://localhost:8001
    echo python server.py
    echo pause
) > "%PROJECT_DIR%\start-backend.bat"

:: Frontend startup script
(
    echo @echo off
    echo echo Starting TechPulse AI Frontend...
    echo cd /d "%%~dp0frontend"
    echo echo Frontend starting on http://localhost:3000
    echo yarn start
    echo pause
) > "%PROJECT_DIR%\start-frontend.bat"

:: Combined startup script
(
    echo @echo off
    echo echo.
    echo echo ============================================================
    echo echo              Starting TechPulse AI Platform
    echo echo ============================================================
    echo echo.
    echo echo [INFO] Starting MongoDB service...
    echo net start MongoDB 2^>nul
    echo.
    echo echo [INFO] Starting Backend Server...
    echo start "TechPulse Backend" cmd /k "cd /d "%%~dp0" && start-backend.bat"
    echo.
    echo timeout /t 5 /nobreak ^>nul
    echo.
    echo echo [INFO] Starting Frontend Server...
    echo start "TechPulse Frontend" cmd /k "cd /d "%%~dp0" && start-frontend.bat"
    echo.
    echo echo [SUCCESS] TechPulse AI Platform is starting!
    echo echo.
    echo echo Access your platform at: http://localhost:3000
    echo echo Backend API available at: http://localhost:8001
    echo echo.
    echo echo Admin Credentials:
    echo echo Username: admin
    echo echo Password: admin123!@#TechPulse
    echo echo.
    echo echo Press any key to open the platform in your browser...
    echo pause ^>nul
    echo start http://localhost:3000
) > "%PROJECT_DIR%\start-techpulse.bat"

echo [SUCCESS] Project files created successfully!
echo.
echo [INFO] Project package location: %PROJECT_DIR%
echo [INFO] Files created:
echo   - Backend application with admin system
echo   - Frontend React application
echo   - Complete documentation
echo   - Startup scripts
echo   - Configuration files
echo.
echo [NEXT] You can now:
echo 1. Copy the project-files folder to target machine
echo 2. Run the TechPulse-Installer.bat on target machine
echo 3. Or manually set up using the files in project-files folder
echo.

:: Create a ZIP file if PowerShell is available
echo [INFO] Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%PROJECT_DIR%\*' -DestinationPath '%~dp0TechPulse-AI-Complete.zip' -Force" 2>nul
if %errorLevel% == 0 (
    echo [SUCCESS] ZIP archive created: TechPulse-AI-Complete.zip
    echo [INFO] You can distribute this ZIP file for offline installation
) else (
    echo [INFO] ZIP creation failed - PowerShell Compress-Archive not available
    echo [INFO] You can manually zip the project-files folder
)

echo.
pause