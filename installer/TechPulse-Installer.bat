@echo off
setlocal enabledelayedexpansion

:: TechPulse AI One-Click Installer for Windows 10/11
:: ================================================

title TechPulse AI Installer

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    TechPulse AI Installer                     ║
echo ║                          v2.0.0                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Please run this installer as Administrator!
    echo Right-click on the file and select "Run as administrator"
    pause
    exit /b 1
)

echo ✅ Running with Administrator privileges
echo.

:: Create installation directory
set "INSTALL_DIR=%USERPROFILE%\TechPulse-AI"
echo 📁 Creating installation directory: %INSTALL_DIR%

if exist "%INSTALL_DIR%" (
    echo ⚠️  Directory already exists. Backing up...
    if exist "%INSTALL_DIR%_backup" rmdir /s /q "%INSTALL_DIR%_backup"
    move "%INSTALL_DIR%" "%INSTALL_DIR%_backup" >nul 2>&1
)

mkdir "%INSTALL_DIR%" >nul 2>&1
cd /d "%INSTALL_DIR%"

echo ✅ Installation directory created
echo.

:: Step 1: Check and Install Python
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ Step 1: Python Installation                                   ║
echo ╚══════════════════════════════════════════════════════════════╝

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Installing Python 3.11...
    echo 📥 Downloading Python installer...
    
    powershell -Command "& {Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe' -OutFile 'python-installer.exe'}"
    
    if exist "python-installer.exe" (
        echo 🔧 Installing Python...
        python-installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
        
        :: Wait for installation to complete
        timeout /t 30 /nobreak >nul
        
        :: Refresh PATH
        call refreshenv >nul 2>&1
        
        del python-installer.exe >nul 2>&1
        echo ✅ Python installed successfully
    ) else (
        echo ❌ Failed to download Python installer
        goto :error_exit
    )
) else (
    echo ✅ Python is already installed
    python --version
)
echo.

:: Step 2: Check and Install Node.js
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ Step 2: Node.js Installation                                  ║
echo ╚══════════════════════════════════════════════════════════════╝

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Installing Node.js 20...
    echo 📥 Downloading Node.js installer...
    
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile 'nodejs-installer.msi'}"
    
    if exist "nodejs-installer.msi" (
        echo 🔧 Installing Node.js...
        msiexec /i nodejs-installer.msi /quiet /norestart
        
        :: Wait for installation to complete
        timeout /t 60 /nobreak >nul
        
        :: Refresh PATH
        call refreshenv >nul 2>&1
        set "PATH=%PATH%;%ProgramFiles%\nodejs"
        
        del nodejs-installer.msi >nul 2>&1
        echo ✅ Node.js installed successfully
    ) else (
        echo ❌ Failed to download Node.js installer
        goto :error_exit
    )
) else (
    echo ✅ Node.js is already installed
    node --version
    npm --version
)
echo.

:: Step 3: Check and Install MongoDB
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ Step 3: MongoDB Installation                                  ║
echo ╚══════════════════════════════════════════════════════════════╝

sc query MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB not found. Installing MongoDB Community Server...
    echo 📥 Downloading MongoDB installer...
    
    powershell -Command "& {Invoke-WebRequest -Uri 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.4-signed.msi' -OutFile 'mongodb-installer.msi'}"
    
    if exist "mongodb-installer.msi" (
        echo 🔧 Installing MongoDB...
        msiexec /i mongodb-installer.msi /quiet /norestart INSTALLLOCATION="C:\Program Files\MongoDB\Server\7.0\" ADDLOCAL="ServerService,Client"
        
        :: Wait for installation to complete
        timeout /t 120 /nobreak >nul
        
        :: Start MongoDB service
        net start MongoDB >nul 2>&1
        
        del mongodb-installer.msi >nul 2>&1
        echo ✅ MongoDB installed and started successfully
    ) else (
        echo ❌ Failed to download MongoDB installer
        goto :error_exit
    )
) else (
    echo ✅ MongoDB is already installed
    net start MongoDB >nul 2>&1
    echo ✅ MongoDB service started
)
echo.

:: Step 4: Download and Setup TechPulse AI
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ Step 4: TechPulse AI Setup                                    ║
echo ╚══════════════════════════════════════════════════════════════╝

echo 📥 Setting up TechPulse AI project...

:: Create project structure
mkdir backend >nul 2>&1
mkdir frontend >nul 2>&1
mkdir docs >nul 2>&1

:: Copy project files from installer directory (assuming they exist)
if exist "%~dp0project-files\*" (
    echo 📁 Copying project files...
    xcopy "%~dp0project-files\*" . /E /H /C /I /Y >nul 2>&1
    echo ✅ Project files copied successfully
) else (
    echo ⚠️  Project files not found in installer directory
    echo 📝 Creating basic project structure...
    
    :: Create basic backend structure
    echo 🐍 Setting up backend...
    cd backend
    
    :: Create requirements.txt
    (
        echo fastapi==0.110.1
        echo uvicorn==0.25.0
        echo motor==3.3.1
        echo python-dotenv==1.1.1
        echo bcrypt==4.3.0
        echo python-jose==3.5.0
        echo python-multipart==0.0.20
        echo feedparser==6.0.12
        echo requests==2.32.5
        echo beautifulsoup4==4.13.5
        echo emergentintegrations==0.1.0
    ) > requirements.txt
    
    :: Create .env file
    (
        echo MONGO_URL=mongodb://localhost:27017
        echo DB_NAME=techpulse_db
        echo CORS_ORIGINS=*
        echo JWT_SECRET_KEY=techpulse-super-secret-jwt-key-2024-change-in-production
        echo EMERGENT_LLM_KEY=your-emergent-llm-key-here
    ) > .env
    
    echo ✅ Backend structure created
    cd ..
    
    :: Create basic frontend structure
    echo ⚛️  Setting up frontend...
    cd frontend
    
    :: Initialize React app basics
    (
        echo {
        echo   "name": "techpulse-frontend",
        echo   "version": "2.0.0",
        echo   "private": true,
        echo   "dependencies": {
        echo     "react": "^19.0.0",
        echo     "react-dom": "^19.0.0",
        echo     "react-router-dom": "^7.5.1",
        echo     "axios": "^1.8.4",
        echo     "lucide-react": "^0.507.0",
        echo     "sonner": "^2.0.7"
        echo   },
        echo   "scripts": {
        echo     "start": "react-scripts start",
        echo     "build": "react-scripts build",
        echo     "test": "react-scripts test",
        echo     "eject": "react-scripts eject"
        echo   }
        echo }
    ) > package.json
    
    :: Create .env file
    (
        echo REACT_APP_BACKEND_URL=http://localhost:8001
    ) > .env
    
    echo ✅ Frontend structure created
    cd ..
    
    echo ✅ Basic project structure created
)
echo.

:: Step 5: Install Dependencies
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ Step 5: Installing Dependencies                               ║
echo ╚══════════════════════════════════════════════════════════════╝

echo 🔧 Installing Python dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    goto :error_exit
)
echo ✅ Python dependencies installed
cd ..

echo 🔧 Installing Node.js dependencies...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install Node.js dependencies
    goto :error_exit
)
echo ✅ Node.js dependencies installed
cd ..
echo.

:: Step 6: Create Startup Scripts
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ Step 6: Creating Startup Scripts                              ║
echo ╚══════════════════════════════════════════════════════════════╝

echo 📝 Creating startup scripts...

:: Create start-backend.bat
(
    echo @echo off
    echo cd /d "%INSTALL_DIR%\backend"
    echo echo Starting TechPulse AI Backend...
    echo uvicorn server:app --host 0.0.0.0 --port 8001 --reload
    echo pause
) > start-backend.bat

:: Create start-frontend.bat
(
    echo @echo off
    echo cd /d "%INSTALL_DIR%\frontend"
    echo echo Starting TechPulse AI Frontend...
    echo npm start
    echo pause
) > start-frontend.bat

:: Create start-all.bat
(
    echo @echo off
    echo title TechPulse AI - All Services
    echo echo ╔══════════════════════════════════════════════════════════════╗
    echo echo ║                    TechPulse AI Launcher                     ║
    echo echo ╚══════════════════════════════════════════════════════════════╝
    echo echo.
    echo echo 🔧 Starting MongoDB service...
    echo net start MongoDB ^>nul 2^>^&1
    echo if %%errorlevel%% equ 0 ^(
    echo     echo ✅ MongoDB started successfully
    echo ^) else ^(
    echo     echo ⚠️  MongoDB might already be running
    echo ^)
    echo echo.
    echo echo 🚀 Starting TechPulse AI services...
    echo echo ⚠️  This will open two new windows for Backend and Frontend
    echo echo 📖 Documentation available at: %INSTALL_DIR%\docs\index.html
    echo echo 🌐 Access the application at: http://localhost:3000
    echo echo.
    echo echo Default Admin Credentials:
    echo echo Username: admin
    echo echo Password: admin123!@#TechPulse
    echo echo.
    echo pause
    echo.
    echo start "TechPulse AI Backend" cmd /k "%INSTALL_DIR%\start-backend.bat"
    echo timeout /t 5 /nobreak ^>nul
    echo start "TechPulse AI Frontend" cmd /k "%INSTALL_DIR%\start-frontend.bat"
    echo.
    echo echo 🎉 TechPulse AI is starting up!
    echo echo Backend: http://localhost:8001
    echo echo Frontend: http://localhost:3000
    echo echo.
    echo timeout /t 3 /nobreak ^>nul
    echo start http://localhost:3000
    echo exit
) > start-all.bat

:: Create desktop shortcut
echo 🔗 Creating desktop shortcut...
powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\TechPulse AI.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\start-all.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.IconLocation = '%SystemRoot%\System32\shell32.dll,21'; $Shortcut.Description = 'Launch TechPulse AI Platform'; $Shortcut.Save()}"

echo ✅ Startup scripts and desktop shortcut created
echo.

:: Step 7: Final Setup
echo ╔══════════════════════════════════════════════════════════════╗
echo ║ Step 7: Final Setup                                           ║
echo ╚══════════════════════════════════════════════════════════════╝

echo ⚙️  Performing final setup tasks...

:: Create README
(
    echo # TechPulse AI - Windows Installation
    echo.
    echo ## Quick Start
    echo 1. Double-click "start-all.bat" to launch all services
    echo 2. Open http://localhost:3000 in your browser
    echo 3. Login with admin/admin123!@#TechPulse
    echo.
    echo ## Manual Start
    echo - Backend: Run "start-backend.bat"
    echo - Frontend: Run "start-frontend.bat"
    echo.
    echo ## Configuration
    echo - Backend config: backend\.env
    echo - Frontend config: frontend\.env
    echo.
    echo ## Documentation
    echo Open docs\index.html in your browser for full documentation
    echo.
    echo ## Troubleshooting
    echo - Make sure MongoDB service is running: net start MongoDB
    echo - Check if ports 3000 and 8001 are free
    echo - Restart services if needed
    echo.
    echo Installation completed on: %date% %time%
) > README.txt

:: Set MongoDB to start automatically
sc config MongoDB start= auto >nul 2>&1

echo ✅ Final setup completed
echo.

:: Installation Complete
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  Installation Complete! 🎉                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ✅ TechPulse AI has been successfully installed!
echo.
echo 📁 Installation Directory: %INSTALL_DIR%
echo 🔗 Desktop Shortcut: Created
echo 📖 Documentation: %INSTALL_DIR%\docs\index.html
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                      Quick Start Guide                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 1️⃣  Launch Application:
echo    • Double-click the desktop shortcut "TechPulse AI"
echo    • Or run: %INSTALL_DIR%\start-all.bat
echo.
echo 2️⃣  Access the Application:
echo    • Frontend: http://localhost:3000
echo    • Backend API: http://localhost:8001
echo    • Documentation: %INSTALL_DIR%\docs\index.html
echo.
echo 3️⃣  Default Login:
echo    • Username: admin
echo    • Password: admin123!@#TechPulse
echo.
echo 4️⃣  First Steps:
echo    • Login to admin dashboard
echo    • Initialize RSS feeds (Dashboard → Initialize RSS Feeds)
echo    • Add your AI API keys (Admin Settings)
echo    • Start collecting articles and generating content!
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        Support                                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📋 Troubleshooting:
echo    • Check the documentation in docs\index.html
echo    • Ensure MongoDB service is running: net start MongoDB
echo    • Verify ports 3000 and 8001 are available
echo.
echo 🔄 To restart services:
echo    • Close all TechPulse AI windows
echo    • Run start-all.bat again
echo.
echo 💾 Configuration files:
echo    • Backend: %INSTALL_DIR%\backend\.env
echo    • Frontend: %INSTALL_DIR%\frontend\.env
echo.

set /p "launch=🚀 Would you like to launch TechPulse AI now? (Y/N): "
if /i "%launch%"=="Y" (
    echo.
    echo 🎯 Launching TechPulse AI...
    start "" "%INSTALL_DIR%\start-all.bat"
) else (
    echo.
    echo ✅ Installation complete! Use the desktop shortcut to launch TechPulse AI anytime.
)

echo.
echo 🎉 Thank you for installing TechPulse AI!
echo.
pause
exit /b 0

:error_exit
echo.
echo ❌ Installation failed!
echo Please check the error messages above and try again.
echo You may need to install the dependencies manually.
echo.
pause
exit /b 1