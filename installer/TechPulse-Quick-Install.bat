@echo off
setlocal enabledelayedexpansion
cls

:: ========================================
:: TechPulse AI - Quick Installation Script
:: Windows 10/11 One-Click Installer
:: ========================================

echo.
echo =====================================================
echo    TechPulse AI - RSS News Portal Installer
echo    Professional AI-Powered Content Generation
echo =====================================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click on the .bat file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [INFO] Administrator privileges confirmed.

:: Set installation directory
set "INSTALL_DIR=C:\TechPulse-AI"
set "PROJECT_DIR=%INSTALL_DIR%\techpulse"
set "BACKUP_DIR=%INSTALL_DIR%\backup"

echo [INFO] Installation directory: %INSTALL_DIR%
echo.

:: Create installation directory
if not exist "%INSTALL_DIR%" (
    echo [INFO] Creating installation directory...
    mkdir "%INSTALL_DIR%" 2>nul
    mkdir "%PROJECT_DIR%" 2>nul
    mkdir "%BACKUP_DIR%" 2>nul
)

cd /d "%INSTALL_DIR%"

:: Function to download and install components
echo ========================================
echo Step 1: Installing Prerequisites
echo ========================================

:: Check and install Python 3.11
echo [INFO] Checking Python installation...
python --version 2>nul | findstr "3.1" >nul
if %errorLevel% neq 0 (
    echo [INFO] Python 3.11+ not found. Installing Python...
    echo [INFO] Downloading Python 3.11.9...
    
    if not exist python-3.11.9-amd64.exe (
        curl -L -o python-3.11.9-amd64.exe https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
        if %errorLevel% neq 0 (
            echo [ERROR] Failed to download Python. Please check your internet connection.
            pause
            exit /b 1
        )
    )
    
    echo [INFO] Installing Python 3.11.9...
    python-3.11.9-amd64.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    
    echo [INFO] Waiting for Python installation to complete...
    timeout /t 30 /nobreak
) else (
    echo [SUCCESS] Python is already installed.
)

:: Check and install Node.js
echo [INFO] Checking Node.js installation...
node --version 2>nul | findstr "v" >nul
if %errorLevel% neq 0 (
    echo [INFO] Node.js not found. Installing Node.js...
    echo [INFO] Downloading Node.js 20 LTS...
    
    if not exist node-v20.17.0-x64.msi (
        curl -L -o node-v20.17.0-x64.msi https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi
        if %errorLevel% neq 0 (
            echo [ERROR] Failed to download Node.js. Please check your internet connection.
            pause
            exit /b 1
        )
    )
    
    echo [INFO] Installing Node.js...
    msiexec /i node-v20.17.0-x64.msi /quiet /norestart
    
    echo [INFO] Waiting for Node.js installation to complete...
    timeout /t 30 /nobreak
) else (
    echo [SUCCESS] Node.js is already installed.
)

:: Install MongoDB
echo [INFO] Checking MongoDB installation...
sc query MongoDB 2>nul | findstr "RUNNING" >nul
if %errorLevel% neq 0 (
    echo [INFO] MongoDB not running or not installed. Installing MongoDB...
    echo [INFO] Downloading MongoDB Community Server...
    
    if not exist mongodb-windows-x86_64-7.0.14-signed.msi (
        curl -L -o mongodb-windows-x86_64-7.0.14-signed.msi https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14-signed.msi
        if %errorLevel% neq 0 (
            echo [ERROR] Failed to download MongoDB. Please check your internet connection.
            pause
            exit /b 1
        )
    )
    
    echo [INFO] Installing MongoDB...
    msiexec /i mongodb-windows-x86_64-7.0.14-signed.msi /quiet /norestart ADDLOCAL="ServerService,Router" SHOULD_INSTALL_COMPASS=0
    
    echo [INFO] Waiting for MongoDB installation to complete...
    timeout /t 45 /nobreak
    
    echo [INFO] Starting MongoDB service...
    net start MongoDB 2>nul
) else (
    echo [SUCCESS] MongoDB is already running.
)

:: Install Git (if not present)
echo [INFO] Checking Git installation...
git --version 2>nul | findstr "git" >nul
if %errorLevel% neq 0 (
    echo [INFO] Git not found. Installing Git...
    echo [INFO] Downloading Git for Windows...
    
    if not exist Git-2.42.0.2-64-bit.exe (
        curl -L -o Git-2.42.0.2-64-bit.exe https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe
        if %errorLevel% neq 0 (
            echo [ERROR] Failed to download Git. Please check your internet connection.
            pause
            exit /b 1
        )
    )
    
    echo [INFO] Installing Git...
    Git-2.42.0.2-64-bit.exe /VERYSILENT /NORESTART
    
    echo [INFO] Waiting for Git installation to complete...
    timeout /t 30 /nobreak
) else (
    echo [SUCCESS] Git is already installed.
)

echo.
echo ========================================
echo Step 2: Setting up TechPulse AI Project
echo ========================================

:: Refresh environment variables
call refreshenv 2>nul

:: Copy project files from current directory
echo [INFO] Copying project files...
if exist "%CD%\..\backend" (
    echo [INFO] Copying from local directory...
    xcopy /E /I /Y "%CD%\..\backend" "%PROJECT_DIR%\backend" >nul
    xcopy /E /I /Y "%CD%\..\frontend" "%PROJECT_DIR%\frontend" >nul
    xcopy /E /I /Y "%CD%\..\docs" "%PROJECT_DIR%\docs" >nul
    if exist "%CD%\..\README.md" copy "%CD%\..\README.md" "%PROJECT_DIR%\" >nul
) else (
    echo [INFO] Project files not found locally. Please ensure you have the TechPulse AI files.
    echo [INFO] You can download from: https://github.com/your-repo/techpulse-ai
    pause
    exit /b 1
)

:: Setup Backend
echo [INFO] Setting up Backend...
cd /d "%PROJECT_DIR%\backend"

:: Create virtual environment
echo [INFO] Creating Python virtual environment...
python -m venv venv
if %errorLevel% neq 0 (
    echo [ERROR] Failed to create virtual environment. Trying with python3...
    python3 -m venv venv
    if %errorLevel% neq 0 (
        echo [ERROR] Failed to create virtual environment. Please check Python installation.
        pause
        exit /b 1
    )
)

:: Activate virtual environment and install dependencies
echo [INFO] Installing Python dependencies...
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt
if %errorLevel% neq 0 (
    echo [WARNING] Some Python packages failed to install. Continuing...
)

:: Setup environment file
echo [INFO] Creating backend environment file...
if not exist .env (
    echo MONGO_URL=mongodb://localhost:27017> .env
    echo DB_NAME=techpulse_production>> .env
    echo CORS_ORIGINS=http://localhost:3000>> .env
    echo JWT_SECRET_KEY=techpulse-secret-key-change-in-production-!@#$%%>> .env
    echo EMERGENT_LLM_KEY=your_emergent_key_here>> .env
)

:: Setup Frontend
echo [INFO] Setting up Frontend...
cd /d "%PROJECT_DIR%\frontend"

:: Install Yarn if not present
echo [INFO] Checking Yarn installation...
yarn --version 2>nul >nul
if %errorLevel% neq 0 (
    echo [INFO] Installing Yarn package manager...
    npm install -g yarn
)

:: Install frontend dependencies
echo [INFO] Installing frontend dependencies...
yarn install
if %errorLevel% neq 0 (
    echo [WARNING] Some frontend packages failed to install. Trying with npm...
    npm install
)

:: Setup frontend environment file
echo [INFO] Creating frontend environment file...
if not exist .env (
    echo REACT_APP_BACKEND_URL=http://localhost:8001> .env
)

echo.
echo ========================================
echo Step 3: Creating Service Scripts
echo ========================================

:: Create startup scripts
cd /d "%PROJECT_DIR%"

:: Backend startup script
echo [INFO] Creating backend startup script...
echo @echo off> start-backend.bat
echo cd /d "%PROJECT_DIR%\backend">> start-backend.bat
echo call venv\Scripts\activate.bat>> start-backend.bat
echo echo [INFO] Starting TechPulse AI Backend...>> start-backend.bat
echo echo [INFO] Backend will be available at: http://localhost:8001>> start-backend.bat
echo echo [INFO] Press Ctrl+C to stop the backend server>> start-backend.bat
echo python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload>> start-backend.bat

:: Frontend startup script
echo [INFO] Creating frontend startup script...
echo @echo off> start-frontend.bat
echo cd /d "%PROJECT_DIR%\frontend">> start-frontend.bat
echo echo [INFO] Starting TechPulse AI Frontend...>> start-frontend.bat
echo echo [INFO] Frontend will be available at: http://localhost:3000>> start-frontend.bat
echo echo [INFO] Press Ctrl+C to stop the frontend server>> start-frontend.bat
echo yarn start>> start-frontend.bat

:: Combined startup script
echo [INFO] Creating combined startup script...
echo @echo off> start-techpulse.bat
echo echo =====================================================>> start-techpulse.bat
echo echo    TechPulse AI - Starting All Services>> start-techpulse.bat
echo echo =====================================================>> start-techpulse.bat
echo echo.>> start-techpulse.bat
echo echo [INFO] Starting MongoDB service...>> start-techpulse.bat
echo net start MongoDB 2^>nul>> start-techpulse.bat
echo echo [INFO] MongoDB started successfully.>> start-techpulse.bat
echo echo.>> start-techpulse.bat
echo echo [INFO] Starting Backend and Frontend services...>> start-techpulse.bat
echo echo [INFO] Backend: http://localhost:8001>> start-techpulse.bat
echo echo [INFO] Frontend: http://localhost:3000>> start-techpulse.bat
echo echo.>> start-techpulse.bat
echo echo [INFO] Opening services in new windows...>> start-techpulse.bat
echo start "TechPulse Backend" cmd /k "cd /d \"%PROJECT_DIR%\" && start-backend.bat">> start-techpulse.bat
echo timeout /t 5 /nobreak>> start-techpulse.bat
echo start "TechPulse Frontend" cmd /k "cd /d \"%PROJECT_DIR%\" && start-frontend.bat">> start-techpulse.bat
echo echo.>> start-techpulse.bat
echo echo [SUCCESS] TechPulse AI services are starting...>> start-techpulse.bat
echo echo [INFO] Please wait for both services to fully load.>> start-techpulse.bat
echo echo [INFO] Then visit: http://localhost:3000>> start-techpulse.bat
echo echo.>> start-techpulse.bat
echo pause>> start-techpulse.bat

:: Setup script
echo [INFO] Creating setup script...
echo @echo off> setup-techpulse.bat
echo echo =====================================================>> setup-techpulse.bat
echo echo    TechPulse AI - Initial Setup>> setup-techpulse.bat
echo echo =====================================================>> setup-techpulse.bat
echo echo.>> setup-techpulse.bat
echo cd /d "%PROJECT_DIR%\backend">> setup-techpulse.bat
echo call venv\Scripts\activate.bat>> setup-techpulse.bat
echo echo [INFO] Creating admin user...>> setup-techpulse.bat
echo curl -X POST "http://localhost:8001/api/auth/create-admin">> setup-techpulse.bat
echo echo.>> setup-techpulse.bat
echo echo [INFO] Initializing RSS feeds...>> setup-techpulse.bat
echo curl -X POST "http://localhost:8001/api/feeds/initialize" -H "Authorization: Bearer ADMIN_TOKEN">> setup-techpulse.bat
echo echo.>> setup-techpulse.bat
echo echo [SUCCESS] Setup completed!>> setup-techpulse.bat
echo echo [INFO] Default admin credentials:>> setup-techpulse.bat
echo echo   Username: admin>> setup-techpulse.bat
echo echo   Password: admin123!@#TechPulse>> setup-techpulse.bat
echo echo.>> setup-techpulse.bat
echo pause>> setup-techpulse.bat

:: Create desktop shortcuts
echo [INFO] Creating desktop shortcuts...
set "DESKTOP=%USERPROFILE%\Desktop"

:: Main application shortcut
echo Set Shell = CreateObject("WScript.Shell")> "%TEMP%\CreateShortcut.vbs"
echo Set Shortcut = Shell.CreateShortcut("%DESKTOP%\TechPulse AI.lnk")>> "%TEMP%\CreateShortcut.vbs"
echo Shortcut.TargetPath = "%PROJECT_DIR%\start-techpulse.bat">> "%TEMP%\CreateShortcut.vbs"
echo Shortcut.WorkingDirectory = "%PROJECT_DIR%">> "%TEMP%\CreateShortcut.vbs"
echo Shortcut.Description = "TechPulse AI - RSS News Portal">> "%TEMP%\CreateShortcut.vbs"
echo Shortcut.Save>> "%TEMP%\CreateShortcut.vbs"
cscript //nologo "%TEMP%\CreateShortcut.vbs"
del "%TEMP%\CreateShortcut.vbs"

:: Documentation shortcut
echo Set Shell = CreateObject("WScript.Shell")> "%TEMP%\CreateDocsShortcut.vbs"
echo Set Shortcut = Shell.CreateShortcut("%DESKTOP%\TechPulse Docs.lnk")>> "%TEMP%\CreateDocsShortcut.vbs"
echo Shortcut.TargetPath = "%PROJECT_DIR%\docs\index.html">> "%TEMP%\CreateDocsShortcut.vbs"
echo Shortcut.WorkingDirectory = "%PROJECT_DIR%\docs">> "%TEMP%\CreateDocsShortcut.vbs"
echo Shortcut.Description = "TechPulse AI Documentation">> "%TEMP%\CreateDocsShortcut.vbs"
echo Shortcut.Save>> "%TEMP%\CreateDocsShortcut.vbs"
cscript //nologo "%TEMP%\CreateDocsShortcut.vbs"
del "%TEMP%\CreateDocsShortcut.vbs"

echo.
echo ========================================
echo Step 4: Final Configuration
echo ========================================

:: Create uninstaller
echo [INFO] Creating uninstaller...
echo @echo off> uninstall-techpulse.bat
echo echo =====================================================>> uninstall-techpulse.bat
echo echo    TechPulse AI - Uninstaller>> uninstall-techpulse.bat
echo echo =====================================================>> uninstall-techpulse.bat
echo echo.>> uninstall-techpulse.bat
echo echo [WARNING] This will remove TechPulse AI completely.>> uninstall-techpulse.bat
echo set /p confirm="Are you sure? (y/N): ">> uninstall-techpulse.bat
echo if /i "!confirm!" neq "y" exit /b>> uninstall-techpulse.bat
echo echo.>> uninstall-techpulse.bat
echo echo [INFO] Stopping services...>> uninstall-techpulse.bat
echo taskkill /f /im python.exe 2^>nul>> uninstall-techpulse.bat  
echo taskkill /f /im node.exe 2^>nul>> uninstall-techpulse.bat
echo echo [INFO] Removing files...>> uninstall-techpulse.bat
echo rd /s /q "%PROJECT_DIR%" 2^>nul>> uninstall-techpulse.bat
echo del "%USERPROFILE%\Desktop\TechPulse AI.lnk" 2^>nul>> uninstall-techpulse.bat
echo del "%USERPROFILE%\Desktop\TechPulse Docs.lnk" 2^>nul>> uninstall-techpulse.bat
echo echo [SUCCESS] TechPulse AI has been uninstalled.>> uninstall-techpulse.bat
echo pause>> uninstall-techpulse.bat

:: Create system info script
echo [INFO] Creating system information script...
echo @echo off> system-info.bat
echo echo =====================================================>> system-info.bat
echo echo    TechPulse AI - System Information>> system-info.bat
echo echo =====================================================>> system-info.bat
echo echo.>> system-info.bat
echo echo [SYSTEM INFO]>> system-info.bat
echo echo Windows Version:>> system-info.bat
echo ver>> system-info.bat
echo echo.>> system-info.bat
echo echo Python Version:>> system-info.bat
echo python --version 2^>^&1>> system-info.bat
echo echo.>> system-info.bat
echo echo Node.js Version:>> system-info.bat
echo node --version 2^>^&1>> system-info.bat
echo echo.>> system-info.bat
echo echo MongoDB Service Status:>> system-info.bat
echo sc query MongoDB 2^>^&1>> system-info.bat
echo echo.>> system-info.bat
echo echo Network Ports:>> system-info.bat
echo netstat -an ^| findstr ":8001 :3000 :27017">> system-info.bat
echo echo.>> system-info.bat
echo pause>> system-info.bat

echo.
echo =====================================================
echo    Installation Complete!
echo =====================================================
echo.
echo [SUCCESS] TechPulse AI has been installed successfully!
echo.
echo Installation Directory: %PROJECT_DIR%
echo.
echo Next Steps:
echo 1. Double-click "TechPulse AI" on your desktop to start
echo 2. Wait for both backend and frontend to load
echo 3. Visit: http://localhost:3000
echo 4. Use admin credentials: admin / admin123!@#TechPulse
echo.
echo Documentation: Double-click "TechPulse Docs" on desktop
echo.
echo Troubleshooting:
echo - Run "system-info.bat" for diagnostics
echo - Check "setup-techpulse.bat" for initial setup
echo - View logs in backend/logs/ folder
echo.
echo Support: Check documentation for troubleshooting guide
echo.
echo [INFO] Press any key to start TechPulse AI now...
pause >nul

:: Start the application
echo [INFO] Starting TechPulse AI...
cd /d "%PROJECT_DIR%"
call start-techpulse.bat

exit /b 0