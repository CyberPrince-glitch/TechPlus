@echo off
setlocal enabledelayedexpansion

:: TechPulse AI Setup Checker
:: =========================

title TechPulse AI Setup Checker

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                TechPulse AI Setup Checker                     ║
echo ║                      Diagnostic Tool                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set "INSTALL_DIR=%USERPROFILE%\TechPulse-AI"
set "ERROR_COUNT=0"
set "WARNING_COUNT=0"

echo 🔍 Checking TechPulse AI installation...
echo 📁 Installation directory: %INSTALL_DIR%
echo.

:: Check if installation directory exists
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ 1. Installation Directory Check                               ║
echo ╚══════════════════════════════════════════════════════════════╝

if exist "%INSTALL_DIR%" (
    echo ✅ Installation directory exists
    cd /d "%INSTALL_DIR%"
    
    if exist "backend" (
        echo ✅ Backend directory found
    ) else (
        echo ❌ Backend directory missing
        set /a ERROR_COUNT+=1
    )
    
    if exist "frontend" (
        echo ✅ Frontend directory found
    ) else (
        echo ❌ Frontend directory missing
        set /a ERROR_COUNT+=1
    )
    
    if exist "docs" (
        echo ✅ Documentation directory found
    ) else (
        echo ⚠️  Documentation directory missing
        set /a WARNING_COUNT+=1
    )
) else (
    echo ❌ Installation directory not found: %INSTALL_DIR%
    echo 💡 Please run the installer first (TechPulse-Installer.bat)
    set /a ERROR_COUNT+=1
    goto :summary
)
echo.

:: Check Python
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ 2. Python Installation Check                                  ║
echo ╚══════════════════════════════════════════════════════════════╝

python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python is installed
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo    Version: %%i
    
    :: Check pip
    pip --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ pip is available
    ) else (
        echo ❌ pip is not available
        set /a ERROR_COUNT+=1
    )
) else (
    echo ❌ Python is not installed or not in PATH
    echo 💡 Please install Python 3.11+ from https://python.org
    set /a ERROR_COUNT+=1
)
echo.

:: Check Node.js
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ 3. Node.js Installation Check                                 ║
echo ╚══════════════════════════════════════════════════════════════╝

node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js is installed
    for /f "tokens=1" %%i in ('node --version 2^>^&1') do echo    Version: %%i
    
    :: Check npm
    npm --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ npm is available
        for /f "tokens=1" %%i in ('npm --version 2^>^&1') do echo    Version: %%i
    ) else (
        echo ❌ npm is not available
        set /a ERROR_COUNT+=1
    )
) else (
    echo ❌ Node.js is not installed or not in PATH
    echo 💡 Please install Node.js 18+ from https://nodejs.org
    set /a ERROR_COUNT+=1
)
echo.

:: Check MongoDB
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ 4. MongoDB Installation Check                                 ║
echo ╚══════════════════════════════════════════════════════════════╝

sc query MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB service is installed
    
    :: Check if service is running
    sc query MongoDB | find "RUNNING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ MongoDB service is running
    ) else (
        echo ⚠️  MongoDB service is not running
        echo 💡 Try: net start MongoDB
        set /a WARNING_COUNT+=1
    )
) else (
    echo ❌ MongoDB service not found
    echo 💡 Please install MongoDB Community Server
    set /a ERROR_COUNT+=1
)
echo.

:: Check Backend Dependencies
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ 5. Backend Dependencies Check                                 ║
echo ╚══════════════════════════════════════════════════════════════╝

if exist "%INSTALL_DIR%\backend" (
    cd /d "%INSTALL_DIR%\backend"
    
    if exist "requirements.txt" (
        echo ✅ requirements.txt found
        
        :: Check if virtual environment exists
        if exist "venv" (
            echo ✅ Virtual environment found
            call venv\Scripts\activate.bat
        )
        
        :: Check key dependencies
        python -c "import fastapi" >nul 2>&1
        if %errorlevel% equ 0 (
            echo ✅ FastAPI is installed
        ) else (
            echo ❌ FastAPI is not installed
            echo 💡 Run: pip install -r requirements.txt
            set /a ERROR_COUNT+=1
        )
        
        python -c "import motor" >nul 2>&1
        if %errorlevel% equ 0 (
            echo ✅ Motor (MongoDB driver) is installed
        ) else (
            echo ❌ Motor is not installed
            set /a ERROR_COUNT+=1
        )
        
        python -c "import emergentintegrations" >nul 2>&1
        if %errorlevel% equ 0 (
            echo ✅ Emergent Integrations is installed
        ) else (
            echo ❌ Emergent Integrations is not installed
            set /a ERROR_COUNT+=1
        )
    ) else (
        echo ❌ requirements.txt not found
        set /a ERROR_COUNT+=1
    )
    
    if exist ".env" (
        echo ✅ Backend .env file found
    ) else (
        echo ⚠️  Backend .env file missing
        set /a WARNING_COUNT+=1
    )
    
    if exist "server.py" (
        echo ✅ Main server file found
    ) else (
        echo ❌ server.py not found
        set /a ERROR_COUNT+=1
    )
) else (
    echo ❌ Backend directory not accessible
    set /a ERROR_COUNT+=1
)
echo.

:: Check Frontend Dependencies
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ 6. Frontend Dependencies Check                                ║
echo ╚══════════════════════════════════════════════════════════════╝

if exist "%INSTALL_DIR%\frontend" (
    cd /d "%INSTALL_DIR%\frontend"
    
    if exist "package.json" (
        echo ✅ package.json found
        
        if exist "node_modules" (
            echo ✅ node_modules directory exists
        ) else (
            echo ❌ node_modules directory missing
            echo 💡 Run: npm install
            set /a ERROR_COUNT+=1
        )
    ) else (
        echo ❌ package.json not found
        set /a ERROR_COUNT+=1
    )
    
    if exist ".env" (
        echo ✅ Frontend .env file found
    ) else (
        echo ⚠️  Frontend .env file missing
        set /a WARNING_COUNT+=1
    )
    
    if exist "src\App.js" (
        echo ✅ Main App.js file found
    ) else (
        echo ❌ src\App.js not found
        set /a ERROR_COUNT+=1
    )
    
    if exist "public\index.html" (
        echo ✅ index.html found
    ) else (
        echo ❌ public\index.html not found
        set /a ERROR_COUNT+=1
    )
) else (
    echo ❌ Frontend directory not accessible
    set /a ERROR_COUNT+=1
)
echo.

:: Check Startup Scripts
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ 7. Startup Scripts Check                                      ║
echo ╚══════════════════════════════════════════════════════════════╝

cd /d "%INSTALL_DIR%"

if exist "start-backend.bat" (
    echo ✅ Backend startup script found
) else (
    echo ⚠️  Backend startup script missing
    set /a WARNING_COUNT+=1
)

if exist "start-frontend.bat" (
    echo ✅ Frontend startup script found
) else (
    echo ⚠️  Frontend startup script missing
    set /a WARNING_COUNT+=1
)

if exist "start-all.bat" (
    echo ✅ Main startup script found
) else (
    echo ⚠️  Main startup script missing
    set /a WARNING_COUNT+=1
)

:: Check desktop shortcut
if exist "%USERPROFILE%\Desktop\TechPulse AI.lnk" (
    echo ✅ Desktop shortcut found
) else (
    echo ⚠️  Desktop shortcut missing
    set /a WARNING_COUNT+=1
)
echo.

:: Check Ports
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ 8. Port Availability Check                                    ║
echo ╚══════════════════════════════════════════════════════════════╝

netstat -an | find ":3000 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 is in use (Frontend)
    echo 💡 Stop the service using this port or use a different port
    set /a WARNING_COUNT+=1
) else (
    echo ✅ Port 3000 is available (Frontend)
)

netstat -an | find ":8001 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  Port 8001 is in use (Backend)
    echo 💡 Stop the service using this port or use a different port
    set /a WARNING_COUNT+=1
) else (
    echo ✅ Port 8001 is available (Backend)
)

netstat -an | find ":27017 " >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Port 27017 is in use (MongoDB - Good!)
) else (
    echo ⚠️  Port 27017 is not in use (MongoDB may not be running)
    set /a WARNING_COUNT+=1
)
echo.

:summary
:: Summary
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        Summary                                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

if %ERROR_COUNT% equ 0 (
    if %WARNING_COUNT% equ 0 (
        echo 🎉 Perfect! TechPulse AI setup is complete and ready to use!
        echo.
        echo ✅ All systems check passed
        echo ✅ No errors or warnings found
        echo.
        echo 🚀 You can launch TechPulse AI using:
        echo    • Desktop shortcut: "TechPulse AI"
        echo    • Or run: %INSTALL_DIR%\start-all.bat
        echo.
        echo 🌐 Access URLs:
        echo    • Frontend: http://localhost:3000
        echo    • Backend: http://localhost:8001
        echo    • Documentation: %INSTALL_DIR%\docs\index.html
        echo.
        echo 🔑 Default Login:
        echo    • Username: admin
        echo    • Password: admin123!@#TechPulse
        
        set /p "launch=Would you like to launch TechPulse AI now? (Y/N): "
        if /i "!launch!"=="Y" (
            echo.
            echo 🎯 Launching TechPulse AI...
            start "" "%INSTALL_DIR%\start-all.bat"
        )
    ) else (
        echo ⚠️  Setup is mostly complete but has some warnings
        echo.
        echo ✅ Errors: %ERROR_COUNT%
        echo ⚠️  Warnings: %WARNING_COUNT%
        echo.
        echo 💡 The application should work, but you may want to address the warnings above
        echo    for the best experience.
        echo.
        echo 🚀 You should still be able to launch TechPulse AI:
        echo    • Desktop shortcut: "TechPulse AI"
        echo    • Or run: %INSTALL_DIR%\start-all.bat
    )
) else (
    echo ❌ Setup has critical errors that need to be fixed!
    echo.
    echo ❌ Errors: %ERROR_COUNT%
    echo ⚠️  Warnings: %WARNING_COUNT%
    echo.
    echo 🔧 Please fix the errors above before trying to launch TechPulse AI.
    echo.
    echo 💡 Common solutions:
    echo    • Re-run the installer: TechPulse-Installer.bat
    echo    • Install missing dependencies manually
    echo    • Check the documentation: %INSTALL_DIR%\docs\index.html
    echo.
    echo 🆘 If you need help, refer to the troubleshooting section in the documentation.
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    Diagnostic Complete                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📊 Scan Results:
echo    • ✅ Successful checks
echo    • ❌ Critical errors: %ERROR_COUNT%
echo    • ⚠️  Warnings: %WARNING_COUNT%
echo.
echo 📅 Scan completed: %date% %time%
echo.

pause
exit /b %ERROR_COUNT%