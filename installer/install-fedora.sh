#!/bin/bash

# ========================================
# TechPulse AI - Fedora Linux Installer
# Professional RSS News Portal
# ========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons."
        error "Please run as regular user. The script will use sudo when needed."
        exit 1
    fi
}

# Print banner
print_banner() {
    clear
    echo -e "${BLUE}"
    echo "====================================================="
    echo "    TechPulse AI - Fedora Linux Installer"
    echo "    Professional RSS News Portal & AI Content"
    echo "====================================================="
    echo -e "${NC}"
    echo
}

# Check system requirements
check_system() {
    log "Checking system requirements..."
    
    # Check Fedora version
    if ! grep -q "Fedora" /etc/os-release; then
        error "This installer is designed for Fedora Linux."
        error "For other distributions, please use the manual installation guide."
        exit 1
    fi
    
    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" != "x86_64" ]]; then
        warning "Architecture $ARCH detected. This installer is optimized for x86_64."
    fi
    
    success "System check passed."
}

# Update system packages
update_system() {
    log "Updating system packages..."
    sudo dnf update -y
    success "System updated successfully."
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Core development tools
    sudo dnf groupinstall -y "Development Tools"
    
    # Essential packages
    sudo dnf install -y \
        python3.11 \
        python3.11-pip \
        python3.11-devel \
        nodejs \
        npm \
        git \
        curl \
        wget \
        unzip \
        supervisor \
        nginx \
        sqlite \
        sqlite-devel \
        openssl-devel \
        libffi-devel \
        zlib-devel \
        bzip2-devel \
        readline-devel \
        xz-devel
    
    success "System dependencies installed."
}

# Install MongoDB
install_mongodb() {
    log "Installing MongoDB..."
    
    # Add MongoDB repository
    sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo > /dev/null <<EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
    
    # Install MongoDB
    sudo dnf install -y mongodb-org
    
    # Start and enable MongoDB
    sudo systemctl enable mongod
    sudo systemctl start mongod
    
    # Verify MongoDB is running
    if systemctl is-active --quiet mongod; then
        success "MongoDB installed and running."
    else
        error "MongoDB installation failed."
        exit 1
    fi
}

# Install Python dependencies
install_python_deps() {
    log "Setting up Python environment..."
    
    # Install pip if not present
    if ! command -v pip3.11 &> /dev/null; then
        python3.11 -m ensurepip --upgrade
    fi
    
    # Upgrade pip
    python3.11 -m pip install --upgrade pip
    
    success "Python environment ready."
}

# Install Node.js dependencies
install_nodejs_deps() {
    log "Setting up Node.js environment..."
    
    # Install Yarn
    sudo npm install -g yarn
    
    # Verify installations
    node --version
    npm --version
    yarn --version
    
    success "Node.js environment ready."
}

# Setup project directory
setup_project() {
    log "Setting up TechPulse AI project..."
    
    # Set installation directory
    INSTALL_DIR="$HOME/TechPulse-AI"
    PROJECT_DIR="$INSTALL_DIR/techpulse"
    BACKUP_DIR="$INSTALL_DIR/backup"
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$PROJECT_DIR"
    mkdir -p "$BACKUP_DIR"
    
    cd "$INSTALL_DIR"
    
    # Check if project files exist locally
    if [[ -d "$(dirname $(dirname $(realpath $0)))/backend" ]]; then
        log "Copying project files from local directory..."
        cp -r "$(dirname $(dirname $(realpath $0)))"/* "$PROJECT_DIR/"
    else
        error "Project files not found. Please ensure you have the TechPulse AI source code."
        error "Download from: https://github.com/your-repo/techpulse-ai"
        exit 1
    fi
    
    success "Project files copied to $PROJECT_DIR"
}

# Setup backend
setup_backend() {
    log "Setting up backend..."
    
    cd "$PROJECT_DIR/backend"
    
    # Create virtual environment
    python3.11 -m venv venv
    source venv/bin/activate
    
    # Upgrade pip in virtual environment
    pip install --upgrade pip
    
    # Install Python dependencies
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [[ ! -f .env ]]; then
        cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=techpulse_production
CORS_ORIGINS=http://localhost:3000
JWT_SECRET_KEY=techpulse-secret-key-change-in-production-$(openssl rand -hex 16)
EMERGENT_LLM_KEY=your_emergent_key_here
EOF
        log "Backend .env file created."
    fi
    
    success "Backend setup completed."
}

# Setup frontend
setup_frontend() {
    log "Setting up frontend..."
    
    cd "$PROJECT_DIR/frontend"
    
    # Install dependencies
    yarn install
    
    # Create .env file if it doesn't exist
    if [[ ! -f .env ]]; then
        cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
        log "Frontend .env file created."
    fi
    
    success "Frontend setup completed."
}

# Create systemd services
create_services() {
    log "Creating systemd services..."
    
    # Backend service
    sudo tee /etc/systemd/system/techpulse-backend.service > /dev/null << EOF
[Unit]
Description=TechPulse AI Backend
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/backend/venv/bin:\$PATH
ExecStart=$PROJECT_DIR/backend/venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Frontend service
    sudo tee /etc/systemd/system/techpulse-frontend.service > /dev/null << EOF
[Unit]
Description=TechPulse AI Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/frontend
Environment=PATH=/usr/bin:\$PATH
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    success "Systemd services created."
}

# Create management scripts
create_scripts() {
    log "Creating management scripts..."
    
    cd "$PROJECT_DIR"
    
    # Start script
    cat > start-techpulse.sh << 'EOF'
#!/bin/bash

echo "====================================================="
echo "    TechPulse AI - Starting All Services"
echo "====================================================="
echo

# Start MongoDB
echo "[INFO] Starting MongoDB..."
sudo systemctl start mongod

# Start backend
echo "[INFO] Starting backend service..."
sudo systemctl start techpulse-backend

# Start frontend
echo "[INFO] Starting frontend service..."
sudo systemctl start techpulse-frontend

echo
echo "[SUCCESS] All services started!"
echo "[INFO] Backend: http://localhost:8001"
echo "[INFO] Frontend: http://localhost:3000"
echo
echo "[INFO] Check status with: sudo systemctl status techpulse-backend techpulse-frontend"
echo
EOF
    
    # Stop script
    cat > stop-techpulse.sh << 'EOF'
#!/bin/bash

echo "[INFO] Stopping TechPulse AI services..."

sudo systemctl stop techpulse-frontend
sudo systemctl stop techpulse-backend

echo "[SUCCESS] All services stopped."
EOF
    
    # Status script
    cat > status-techpulse.sh << 'EOF'
#!/bin/bash

echo "====================================================="
echo "    TechPulse AI - Service Status"
echo "====================================================="
echo

echo "[MongoDB Status]"
sudo systemctl status mongod --no-pager -l

echo
echo "[Backend Status]"
sudo systemctl status techpulse-backend --no-pager -l

echo
echo "[Frontend Status]"
sudo systemctl status techpulse-frontend --no-pager -l

echo
echo "[Network Ports]"
sudo netstat -tlnp | grep -E ':8001|:3000|:27017'

echo
EOF
    
    # Setup script
    cat > setup-techpulse.sh << 'EOF'
#!/bin/bash

echo "====================================================="
echo "    TechPulse AI - Initial Setup"
echo "====================================================="
echo

cd "$(dirname "$0")/backend"
source venv/bin/activate

echo "[INFO] Waiting for backend to be ready..."
sleep 10

echo "[INFO] Creating admin user..."
curl -X POST "http://localhost:8001/api/auth/create-admin" || echo "Admin might already exist"

echo
echo "[INFO] Initializing RSS feeds..."
# Note: This would need proper token handling in production
echo "Please run RSS feed initialization from the admin panel"

echo
echo "[SUCCESS] Setup completed!"
echo "[INFO] Default admin credentials:"
echo "   Username: admin"
echo "   Password: admin123!@#TechPulse"
echo
EOF
    
    # System info script
    cat > system-info.sh << 'EOF'
#!/bin/bash

echo "====================================================="
echo "    TechPulse AI - System Information"
echo "====================================================="
echo

echo "[SYSTEM INFO]"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo

echo "[SOFTWARE VERSIONS]"
echo "Python: $(python3.11 --version 2>&1)"
echo "Node.js: $(node --version 2>&1)"
echo "NPM: $(npm --version 2>&1)"
echo "Yarn: $(yarn --version 2>&1)"
echo

echo "[SERVICES STATUS]"
echo "MongoDB: $(systemctl is-active mongod)"
echo "Backend: $(systemctl is-active techpulse-backend)"
echo "Frontend: $(systemctl is-active techpulse-frontend)"
echo

echo "[NETWORK PORTS]"
sudo netstat -tlnp | grep -E ':8001|:3000|:27017' || echo "No services listening"
echo

echo "[DISK USAGE]"
df -h "$PROJECT_DIR" 2>/dev/null || echo "Project directory not found"
echo
EOF
    
    # Make scripts executable
    chmod +x *.sh
    
    success "Management scripts created."
}

# Create desktop entries (if running in GUI environment)
create_desktop_entries() {
    if [[ -n "$DISPLAY" || -n "$WAYLAND_DISPLAY" ]]; then
        log "Creating desktop entries..."
        
        mkdir -p "$HOME/.local/share/applications"
        
        # Main application
        cat > "$HOME/.local/share/applications/techpulse-ai.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=TechPulse AI
Comment=Professional RSS News Portal
Exec=$PROJECT_DIR/start-techpulse.sh
Icon=applications-internet
Path=$PROJECT_DIR
Terminal=true
Categories=Network;WebBrowser;
EOF
        
        # Documentation
        cat > "$HOME/.local/share/applications/techpulse-docs.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=TechPulse AI Documentation
Comment=TechPulse AI User Guide and API Documentation
Exec=xdg-open $PROJECT_DIR/docs/index.html
Icon=text-html
Path=$PROJECT_DIR/docs
Terminal=false
Categories=Documentation;
EOF
        
        success "Desktop entries created."
    else
        log "GUI not detected, skipping desktop entries."
    fi
}

# Setup firewall
setup_firewall() {
    log "Configuring firewall..."
    
    if command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --add-port=8001/tcp --permanent
        sudo firewall-cmd --add-port=3000/tcp --permanent
        sudo firewall-cmd --reload
        success "Firewall configured."
    else
        warning "Firewall not detected or not using firewalld."
    fi
}

# Create uninstaller
create_uninstaller() {
    log "Creating uninstaller..."
    
    cat > "$PROJECT_DIR/uninstall-techpulse.sh" << EOF
#!/bin/bash

echo "====================================================="
echo "    TechPulse AI - Uninstaller"
echo "====================================================="
echo

echo "[WARNING] This will remove TechPulse AI completely."
read -p "Are you sure? (y/N): " confirm

if [[ "\$confirm" != [yY] ]]; then
    echo "Uninstallation cancelled."
    exit 0
fi

echo
echo "[INFO] Stopping services..."
sudo systemctl stop techpulse-frontend techpulse-backend 2>/dev/null
sudo systemctl disable techpulse-frontend techpulse-backend 2>/dev/null

echo "[INFO] Removing systemd services..."
sudo rm -f /etc/systemd/system/techpulse-*.service
sudo systemctl daemon-reload

echo "[INFO] Removing files..."
rm -rf "$PROJECT_DIR"
rm -f "\$HOME/.local/share/applications/techpulse-*.desktop"

echo "[INFO] Removing firewall rules..."
sudo firewall-cmd --remove-port=8001/tcp --permanent 2>/dev/null
sudo firewall-cmd --remove-port=3000/tcp --permanent 2>/dev/null
sudo firewall-cmd --reload 2>/dev/null

echo "[SUCCESS] TechPulse AI has been uninstalled."
echo "[INFO] MongoDB and system packages were left untouched."
echo
EOF
    
    chmod +x "$PROJECT_DIR/uninstall-techpulse.sh"
    
    success "Uninstaller created."
}

# Create offline installer
create_offline_installer() {
    log "Creating offline installer package..."
    
    OFFLINE_DIR="$INSTALL_DIR/offline-installer"
    mkdir -p "$OFFLINE_DIR"
    
    # Download offline packages
    cd "$OFFLINE_DIR"
    
    # Create package list
    cat > packages.txt << EOF
# Core packages for offline installation
python3.11
python3.11-pip
python3.11-devel
nodejs
npm
git
curl
wget
supervisor
EOF
    
    # Create offline setup script
    cat > install-offline.sh << 'EOF'
#!/bin/bash

echo "====================================================="
echo "    TechPulse AI - Offline Installer"
echo "====================================================="
echo

# This script would handle offline installation
# In a production environment, you would:
# 1. Download all RPM packages
# 2. Create a local repository
# 3. Install from local packages

echo "[INFO] Offline installation requires pre-downloaded packages."
echo "[INFO] Please use the online installer for automated setup."
echo

read -p "Continue with online installation? (y/N): " confirm
if [[ "$confirm" == [yY] ]]; then
    exec "$(dirname "$0")/../install-fedora.sh"
fi
EOF
    
    chmod +x install-offline.sh
    
    success "Offline installer framework created."
}

# Final setup and verification
final_setup() {
    log "Performing final setup..."
    
    # Enable services
    sudo systemctl enable techpulse-backend
    sudo systemctl enable techpulse-frontend
    
    # Start services
    sudo systemctl start mongod
    sleep 5
    sudo systemctl start techpulse-backend
    sleep 10
    sudo systemctl start techpulse-frontend
    
    # Verify services
    if systemctl is-active --quiet techpulse-backend && systemctl is-active --quiet techpulse-frontend; then
        success "All services are running!"
    else
        warning "Some services may not be running. Check status with './status-techpulse.sh'"
    fi
    
    success "Installation completed successfully!"
}

# Main installation process
main() {
    print_banner
    check_root
    check_system
    
    log "Starting TechPulse AI installation for Fedora Linux..."
    echo
    
    update_system
    install_dependencies
    install_mongodb
    install_python_deps
    install_nodejs_deps
    setup_project
    setup_backend
    setup_frontend
    create_services
    create_scripts
    create_desktop_entries
    setup_firewall
    create_uninstaller
    create_offline_installer
    final_setup
    
    echo
    echo "====================================================="
    echo "    Installation Complete!"
    echo "====================================================="
    echo
    success "TechPulse AI has been installed successfully!"
    echo
    echo "Installation Directory: $PROJECT_DIR"
    echo
    echo "Quick Start:"
    echo "1. Run: cd $PROJECT_DIR && ./start-techpulse.sh"
    echo "2. Visit: http://localhost:3000"
    echo "3. Login: admin / admin123!@#TechPulse"
    echo
    echo "Management Commands:"
    echo "- Start: ./start-techpulse.sh"
    echo "- Stop: ./stop-techpulse.sh"
    echo "- Status: ./status-techpulse.sh"
    echo "- Setup: ./setup-techpulse.sh"
    echo
    echo "Documentation: Open docs/index.html in browser"
    echo
    echo "Troubleshooting:"
    echo "- System info: ./system-info.sh"
    echo "- Logs: sudo journalctl -u techpulse-backend -f"
    echo "- Uninstall: ./uninstall-techpulse.sh"
    echo
    
    read -p "Start TechPulse AI now? (y/N): " start_now
    if [[ "$start_now" == [yY] ]]; then
        cd "$PROJECT_DIR"
        ./start-techpulse.sh
    fi
}

# Export variables for use in subscripts
export INSTALL_DIR PROJECT_DIR BACKUP_DIR

# Run main function
main "$@"