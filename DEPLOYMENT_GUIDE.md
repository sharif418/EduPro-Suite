# EduPro Suite - VPS Deployment Guide

## Prerequisites
- VPS Server with Ubuntu/Debian (Contabo)
- Docker and Docker Compose installed ✅
- Domain name configured
- GitHub repository access
- Root or sudo access

## Step 1: Initial Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Required Packages
```bash
sudo apt install -y git nginx certbot python3-certbot-nginx curl
```

### 1.3 Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Step 2: Clone Repository

### 2.1 Navigate to project directory
```bash
cd /var/www
```

### 2.2 Clone your repository
```bash
sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git edupro-suite
cd edupro-suite
```

### 2.3 Set permissions
```bash
sudo chown -R $USER:$USER /var/www/edupro-suite
```

## Step 3: Environment Configuration

### 3.1 Create PostgreSQL Database with Docker
```bash
# Create Docker network
docker network create edupro-network

# Start PostgreSQL container
docker run -d \
  --name edupro-postgres \
  --network edupro-network \
  -e POSTGRES_USER=edupro_admin \
  -e POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE \
  -e POSTGRES_DB=edupro_db \
  -p 5432:5432 \
  -v edupro-postgres-data:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:15-alpine
```

### 3.2 Create Environment File
Create a `.env.production` file:
```bash
cat > .env.production << 'EOF'
# Node Environment
NODE_ENV=production

# Database Configuration (use your actual password)
DATABASE_URL="postgresql://edupro_admin:YOUR_SECURE_PASSWORD_HERE@localhost:5432/edupro_db?schema=public"

# JWT Configuration (MUST be 64+ characters for production)
JWT_SECRET="GENERATE_A_SECURE_64_CHAR_SECRET_KEY_HERE_USE_openssl_rand_base64_64"
NEXTAUTH_SECRET="GENERATE_ANOTHER_64_CHAR_SECRET_KEY_HERE_USE_openssl_rand_base64_64"

# Application URLs (replace with your domain)
NEXTAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# CORS Configuration
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Optional: Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@yourdomain.com"

# Security
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
EOF
```

### 3.3 Generate Secure Secrets
```bash
# Generate JWT_SECRET
openssl rand -base64 64 | tr -d '\n' && echo

# Generate NEXTAUTH_SECRET
openssl rand -base64 64 | tr -d '\n' && echo
```

Copy the generated secrets and update them in `.env.production` file.

## Step 4: Install Dependencies and Build

### 4.1 Install npm packages
```bash
npm install
```

### 4.2 Generate Prisma Client
```bash
npx prisma generate
```

### 4.3 Run Database Migrations
```bash
npx prisma migrate deploy
```

### 4.4 Seed Database (Optional - for test data)
```bash
npm run db:seed
```

### 4.5 Build for Production
```bash
npm run build
```

## Step 5: Setup Nginx Reverse Proxy

### 5.1 Create Nginx Configuration
```bash
sudo tee /etc/nginx/sites-available/edupro << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase upload size
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
```

### 5.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/edupro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: SSL Certificate (HTTPS)

### 6.1 Install SSL Certificate with Certbot
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts to complete SSL setup.

## Step 7: Setup PM2 Process Manager

### 7.1 Install PM2 globally
```bash
sudo npm install -g pm2
```

### 7.2 Create PM2 Ecosystem File
```bash
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
```

### 7.3 Create log directory
```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 7.4 Start Application with PM2
```bash
# Load environment variables and start
export $(cat .env.production | xargs)
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command output to complete startup configuration
```

## Step 8: Verify Deployment

### 8.1 Check Application Status
```bash
pm2 status
pm2 logs edupro-suite --lines 50
```

### 8.2 Check Nginx Status
```bash
sudo systemctl status nginx
```

### 8.3 Check Database Connection
```bash
docker logs edupro-postgres
```

### 8.4 Test Application
Visit: https://yourdomain.com

## Step 9: Firewall Configuration (Optional but Recommended)

```bash
# Allow Nginx
sudo ufw allow 'Nginx Full'

# Allow SSH
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable
```

## Maintenance Commands

### View Logs
```bash
# Application logs
pm2 logs edupro-suite

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Database logs
docker logs edupro-postgres -f
```

### Restart Application
```bash
pm2 restart edupro-suite
```

### Update Application
```bash
cd /var/www/edupro-suite
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart edupro-suite
```

### Database Backup
```bash
docker exec edupro-postgres pg_dump -U edupro_admin edupro_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore
```bash
docker exec -i edupro-postgres psql -U edupro_admin edupro_db < backup_file.sql
```

## Troubleshooting

### Application won't start
1. Check logs: `pm2 logs edupro-suite`
2. Verify environment variables: `cat .env.production`
3. Check database connection: `docker exec -it edupro-postgres psql -U edupro_admin -d edupro_db`

### SSL issues
1. Renew certificate: `sudo certbot renew`
2. Check Nginx config: `sudo nginx -t`
3. Reload Nginx: `sudo systemctl reload nginx`

### Database connection issues
1. Check container: `docker ps | grep postgres`
2. Restart container: `docker restart edupro-postgres`
3. Check DATABASE_URL in `.env.production`

## Production Checklist

- [ ] Domain DNS configured correctly
- [ ] PostgreSQL database running
- [ ] Environment variables set in `.env.production`
- [ ] Database migrations applied
- [ ] Application built successfully
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] PM2 running application
- [ ] PM2 startup configured
- [ ] Firewall configured
- [ ] Database backup scheduled
- [ ] Monitoring setup (optional)

## Default Login Credentials

After deployment, use these credentials to login:
- **SUPERADMIN**: admin@edupro.com / admin123
- **TEACHER**: teacher@edupro.com / teacher123
- **STUDENT**: student@edupro.com / student123
- **GUARDIAN**: guardian@edupro.com / guardian123

**Important**: Change these passwords immediately after first login!

## Support

For issues, check:
1. Application logs: `pm2 logs edupro-suite`
2. Nginx logs: `/var/log/nginx/`
3. Database logs: `docker logs edupro-postgres`
