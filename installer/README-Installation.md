# TechPulse AI - Installation Guide

## 🚀 Quick Installation Options

### Option 1: Windows 10/11 One-Click Installer (Recommended)

1. **Download the Quick Installer**
   - Download `TechPulse-Quick-Install.bat` from the installer folder
   - Right-click and select "Run as administrator"

2. **Automatic Installation**
   - The installer will automatically download and install:
     - Python 3.11
     - Node.js 20 LTS
     - MongoDB 7.0
     - Git for Windows
     - All project dependencies

3. **Desktop Shortcuts**
   - "TechPulse AI" - Main application launcher
   - "TechPulse Docs" - Documentation

### Option 2: Fedora Linux Installer

1. **Download and Run**
   ```bash
   chmod +x install-fedora.sh
   ./install-fedora.sh
   ```

2. **Systemd Services**
   - Automatic service creation and management
   - Background operation with proper logging

### Option 3: Manual Installation

See the main documentation for detailed manual installation steps.

## 📋 System Requirements

### Windows
- Windows 10/11 (64-bit)
- 4GB RAM minimum, 8GB recommended
- 2GB free disk space
- Internet connection for initial setup

### Linux (Fedora)
- Fedora 37+ or compatible RHEL-based system
- 4GB RAM minimum, 8GB recommended
- 2GB free disk space
- sudo privileges

## 🔧 What Gets Installed

### Core Components
- **Backend**: FastAPI server with Python 3.11
- **Frontend**: React 19 application with modern UI
- **Database**: MongoDB 7.0 for data storage
- **AI Integration**: Emergent LLM with multi-provider support

### System Services
- **Windows**: Background services via batch scripts
- **Linux**: Systemd services for proper daemon management

### Pre-configured Features
- 50+ RSS news sources
- Admin user account
- Complete API documentation
- Professional UI with responsive design

## 🎯 Quick Start After Installation

### Windows
1. Double-click "TechPulse AI" on desktop
2. Wait for services to start (2-3 minutes)
3. Browser will open to http://localhost:3000
4. Login with: `admin` / `admin123!@#TechPulse`

### Linux
```bash
cd ~/TechPulse-AI/techpulse
./start-techpulse.sh
```

## 📚 Key Features Included

### RSS Management
- ✅ Automatic article collection from 50+ sources
- ✅ Duplicate detection and filtering
- ✅ Category-based organization
- ✅ Real-time feed monitoring

### AI Content Generation
- ✅ Multi-language support (English, Hindi, Bangla)
- ✅ Professional rewriting with SEO optimization
- ✅ Multiple AI providers with automatic failover
- ✅ Customizable tone and length

### Professional UI
- ✅ Modern news portal design
- ✅ Advanced search and filtering
- ✅ Responsive mobile-friendly layout
- ✅ Admin dashboard with analytics

### Security & Management
- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ API key management
- ✅ Usage monitoring and limits

## 🔍 Verification Steps

After installation, verify everything is working:

### 1. Service Check
**Windows:**
```cmd
# Check if services are running
netstat -an | findstr ":8001 :3000"
```

**Linux:**
```bash
./status-techpulse.sh
```

### 2. API Health Check
```bash
curl http://localhost:8001/api/health
```
Should return JSON with status information.

### 3. Frontend Access
Open browser to http://localhost:3000
- Should show the TechPulse AI homepage
- Login functionality should work
- Admin panel should be accessible

### 4. Database Check
**Windows:**
```cmd
mongo --eval "db.runCommand('ping')"
```

**Linux:**
```bash
mongosh --eval "db.runCommand('ping')"
```

## 🛠️ Troubleshooting

### Common Issues

#### Services Not Starting
**Windows:**
- Run `system-info.bat` for diagnostics
- Check Windows Event Viewer for errors
- Ensure no antivirus blocking

**Linux:**
```bash
./system-info.sh
sudo journalctl -u techpulse-backend -n 50
sudo journalctl -u techpulse-frontend -n 50
```

#### Port Conflicts
- Default ports: 3000 (frontend), 8001 (backend), 27017 (MongoDB)
- Change ports in `.env` files if needed
- Restart services after changes

#### Database Connection Issues
1. Verify MongoDB is running
2. Check connection string in `backend/.env`
3. Ensure no firewall blocking port 27017

#### Frontend Not Loading
1. Check Node.js version: `node --version` (should be 18+)
2. Clear browser cache
3. Check console for JavaScript errors

### Emergency Recovery

#### Complete Reset
**Windows:**
```cmd
# Stop all services
taskkill /f /im python.exe
taskkill /f /im node.exe

# Re-run installer
TechPulse-Quick-Install.bat
```

**Linux:**
```bash
# Stop services
sudo systemctl stop techpulse-*

# Reset database
mongo
use techpulse_production
db.dropDatabase()

# Restart services
./start-techpulse.sh
```

## 📞 Support

### Built-in Help
- **Documentation**: Click "TechPulse Docs" desktop shortcut
- **System Info**: Run diagnostics scripts
- **Logs**: Check service logs for detailed error information

### Common Solutions
1. **Installation fails**: Run as administrator/with sudo
2. **Services won't start**: Check system requirements met
3. **Can't access frontend**: Verify no firewall blocking ports
4. **AI generation fails**: Check API keys in admin panel

### Manual Backup
Important files to backup:
- `backend/.env` - Configuration
- Database: Use MongoDB backup tools
- `frontend/.env` - Frontend configuration

## 🔄 Updates

The installer creates a complete standalone installation. For updates:

1. **Backup your data** (especially database)
2. **Download new version** of installer
3. **Run installer again** (will preserve data)
4. **Restore custom configurations** if needed

## 🗑️ Uninstallation

### Windows
Run `uninstall-techpulse.bat` in the installation directory

### Linux
```bash
./uninstall-techpulse.sh
```

This removes:
- All TechPulse AI files
- System services
- Desktop shortcuts
- Firewall rules

**Note**: MongoDB and system packages are preserved for safety.

---

**Need Help?** Check the complete documentation by opening `docs/index.html` in your browser after installation.