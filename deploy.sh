#!/bin/bash

# EduPro Suite - Automated Deployment Script for VPS
# This script automates the deployment process on a fresh VPS server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Run as a regular user with sudo privileges."
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "=========================================="
echo "  EduPro Suite - VPS Deployment Script  "
echo "=========================================="
echo ""

# Step 1: System Update
print_info "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Step 2: Install required packages
print_info "Step 2: Installing required packages..."
sudo apt install -y git nginx certbot python3-certbot-nginx curl
print_success "Required packages installed"

# Step 3: Install Node.js
if ! command_exists node; then
    print_info "Step 3: Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

# Step 4: Install Docker (if not already installed)
if ! command_exists docker; then
    print_info "Step 4: Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

# Step 5: Get user input for configuration
echo ""
print_info "Please provide the following information:"
echo ""

read -p "Enter your domain name (e.g., example.com): " DOMAIN_NAME
read -p "Enter your GitHub repository URL: " GITHUB_REPO
read -p "Enter GitHub branch to deploy (default: main): " GITHUB_BRANCH
GITHUB_BRANCH=${GITHUB_BRANCH:-main}

# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
NEXTAUTH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Step 6: Clone repository
print_info "Step 5: Cloning repository..."
sudo mkdir -p /var/www
cd /var/www
if [ -d "edupro-suite" ]; then
    print_info "Directory exists, updating..."
    cd edupro-suite
    sudo git pull origin $GITHUB_BRANCH
else
    sudo git clone $GITHUB_REPO edupro-suite
    cd edupro-suite
    sudo git checkout $GITHUB_BRANCH
fi
sudo chown -R $USER:$USER /var/www/edupro-suite
print_success "Repository cloned/updated"

# Step 7: Setup PostgreSQL with Docker
print_info "Step 6: Setting up PostgreSQL database..."
docker network create edupro-network 2>/dev/null || true

# Stop and remove existing container if exists
docker stop edupro-postgres 2>/dev/null || true
docker rm edupro-postgres 2>/dev/null || true

# Start new PostgreSQL container
docker run -d \
  --name edupro-postgres \
  --network edupro-network \
  -e POSTGRES_USER=edupro_admin \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -e POSTGRES_DB=edupro_db \
  -p 5432:5432 \
  -v edupro-postgres-data:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:15-alpine

# Wait for PostgreSQL to be ready
sleep 5
print_success "PostgreSQL database created"

# Step 8: Create environment file
print_info "Step 7: Creating environment configuration..."
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL="postgresql://edupro_admin:$POSTGRES_PASSWORD@localhost:5432/edupro_db?schema=public"
JWT_SECRET="$JWT_SECRET"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="https://$DOMAIN_NAME"
NEXT_PUBLIC_APP_URL="https://$DOMAIN_NAME"
ALLOWED_ORIGINS="https://$DOMAIN_NAME,https://www.$DOMAIN_NAME"
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
EOF
print_success "Environment file created"

# Step 9: Install dependencies and build
print_info "Step 8: Installing dependencies..."
npm install
print_success "Dependencies installed"

print_info "Step 9: Setting up database..."
npx prisma generate
npx prisma migrate deploy
npm run db:seed
print_success "Database configured and seeded"

print_info "Step 10: Building application..."
npm run build
print_success "Application built"

# Step 10: Setup Nginx
print_info "Step 11: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/edupro > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/edupro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
print_success "Nginx configured"

# Step 11: Setup PM2
print_info "Step 12: Setting up PM2 process manager..."
if ! command_exists pm2; then
    sudo npm install -g pm2
fi

sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'edupro-suite',
    script: 'npx',
    args: 'tsx server.ts',
    cwd: '/var/www/edupro-suite',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_file: '.env.production',
    error_file: '/var/log/pm2/edupro-error.log',
    out_file: '/var/log/pm2/edupro-out.log',
    log_file: '/var/log/pm2/edupro-combined.log',
    time: true
  }]
};
EOF

# Load environment and start application
export $(cat .env.production | xargs)
pm2 delete edupro-suite 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | bash
print_success "PM2 configured and application started"

# Step 12: SSL Certificate
print_info "Step 13: Setting up SSL certificate..."
read -p "Do you want to install SSL certificate with Let's Encrypt? (y/n): " INSTALL_SSL
if [ "$INSTALL_SSL" = "y" ] || [ "$INSTALL_SSL" = "Y" ]; then
    sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --register-unsafely-without-email
    print_success "SSL certificate installed"
else
    print_info "Skipping SSL installation. You can run 'sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME' later."
fi

# Step 13: Firewall
print_info "Step 14: Configuring firewall..."
read -p "Do you want to enable UFW firewall? (y/n): " ENABLE_FW
if [ "$ENABLE_FW" = "y" ] || [ "$ENABLE_FW" = "Y" ]; then
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
    sudo ufw --force enable
    print_success "Firewall configured"
else
    print_info "Skipping firewall setup"
fi

# Print summary
echo ""
echo "=========================================="
echo "      Deployment Complete! 🎉           "
echo "=========================================="
echo ""
print_success "Application deployed successfully!"
echo ""
echo "Configuration Details:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Domain: https://$DOMAIN_NAME"
echo "Database: PostgreSQL (Docker)"
echo "Database Password: $POSTGRES_PASSWORD"
echo ""
echo "Default Login Credentials:"
echo "  SUPERADMIN: admin@edupro.com / admin123"
echo "  TEACHER: teacher@edupro.com / teacher123"
echo "  STUDENT: student@edupro.com / student123"
echo "  GUARDIAN: guardian@edupro.com / guardian123"
echo ""
echo "Important: Change default passwords after first login!"
echo ""
echo "Useful Commands:"
echo "  View logs: pm2 logs edupro-suite"
echo "  Restart app: pm2 restart edupro-suite"
echo "  Check status: pm2 status"
echo "  Database backup: docker exec edupro-postgres pg_dump -U edupro_admin edupro_db > backup.sql"
echo ""
echo "Credentials saved to: /var/www/edupro-suite/.deployment-info.txt"

# Save credentials
cat > .deployment-info.txt << EOF
Deployment Information
=====================
Date: $(date)
Domain: https://$DOMAIN_NAME
Database Password: $POSTGRES_PASSWORD
JWT Secret: $JWT_SECRET
NextAuth Secret: $NEXTAUTH_SECRET

Default Login Credentials:
  SUPERADMIN: admin@edupro.com / admin123
  TEACHER: teacher@edupro.com / teacher123
  STUDENT: student@edupro.com / student123
  GUARDIAN: guardian@edupro.com / guardian123
EOF

chmod 600 .deployment-info.txt
print_success "Deployment information saved to .deployment-info.txt"

echo ""
print_info "Visit https://$DOMAIN_NAME to access your application!"
