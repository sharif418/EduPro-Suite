# EduPro Suite Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Application Deployment](#application-deployment)
5. [SSL Certificate Setup](#ssl-certificate-setup)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Backup and Recovery](#backup-and-recovery)
8. [Scaling Considerations](#scaling-considerations)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance Procedures](#maintenance-procedures)

## Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04 LTS or higher / CentOS 8+ / RHEL 8+
- **CPU**: Minimum 4 cores (8 cores recommended for production)
- **RAM**: Minimum 8GB (16GB+ recommended for production)
- **Storage**: Minimum 100GB SSD (500GB+ recommended for production)
- **Network**: Stable internet connection with adequate bandwidth

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Node.js**: Version 18.x or higher (for development)
- **PostgreSQL**: Version 14 or higher
- **Redis**: Version 6.2 or higher
- **Nginx**: Version 1.20 or higher

### Domain and SSL
- Registered domain name
- SSL certificate (Let's Encrypt recommended)
- DNS configuration access

## Environment Setup

### 1. Install Docker and Docker Compose

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/edupro-suite.git
cd edupro-suite

# Create necessary directories
mkdir -p logs uploads backups ssl
```

### 3. Environment Variables

Create production environment file:

```bash
cp .env.example .env.production
```

Edit `.env.production` with production values:

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
PORT=3000

# Database
DATABASE_URL=postgresql://edupro_user:secure_password@postgres:5432/edupro_db
POSTGRES_DB=edupro_db
POSTGRES_USER=edupro_user
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@your-domain.com

# SMS Configuration (Bangladesh)
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=EduPro

# Payment Gateways (Bangladesh)
BKASH_APP_KEY=your-bkash-app-key
BKASH_APP_SECRET=your-bkash-app-secret
BKASH_USERNAME=your-bkash-username
BKASH_PASSWORD=your-bkash-password
BKASH_BASE_URL=https://tokenized.pay.bka.sh/v1.2.0-beta

NAGAD_MERCHANT_ID=your-nagad-merchant-id
NAGAD_MERCHANT_PRIVATE_KEY=your-nagad-private-key
NAGAD_PGP_PUBLIC_KEY=your-nagad-pgp-public-key

SSLCOMMERZ_STORE_ID=your-sslcommerz-store-id
SSLCOMMERZ_STORE_PASSWORD=your-sslcommerz-password
SSLCOMMERZ_IS_LIVE=true

# File Storage
UPLOAD_MAX_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## Database Configuration

### 1. PostgreSQL Setup

Create `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: edupro_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    networks:
      - edupro_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:6.2-alpine
    container_name: edupro_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - edupro_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: edupro_app
    restart: unless-stopped
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    networks:
      - edupro_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: edupro_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    networks:
      - edupro_network

volumes:
  postgres_data:
  redis_data:

networks:
  edupro_network:
    driver: bridge
```

### 2. Database Migration

```bash
# Run database migrations
docker-compose -f docker-compose.production.yml exec app npm run db:migrate

# Seed initial data
docker-compose -f docker-compose.production.yml exec app npm run db:seed
```

## Application Deployment

### 1. Build and Deploy

```bash
# Build production images
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Verify deployment
docker-compose -f docker-compose.production.yml ps
```

### 2. Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Upstream
    upstream app {
        server app:3000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Client max body size
        client_max_body_size 50M;

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Login rate limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /_next/static/ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Main application
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

## SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Stop nginx temporarily
docker-compose -f docker-compose.production.yml stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to ssl directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
sudo chown $USER:$USER ./ssl/*.pem

# Start nginx
docker-compose -f docker-compose.production.yml start nginx

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /path/to/edupro-suite/docker-compose.production.yml restart nginx" | sudo crontab -
```

## Monitoring and Logging

### 1. Application Monitoring

Create `monitoring/docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: edupro_prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - edupro_network

  grafana:
    image: grafana/grafana:latest
    container_name: edupro_grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - edupro_network

volumes:
  prometheus_data:
  grafana_data:

networks:
  edupro_network:
    external: true
```

### 2. Log Management

```bash
# Setup log rotation
sudo tee /etc/logrotate.d/edupro-suite << EOF
/path/to/edupro-suite/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /path/to/edupro-suite/docker-compose.production.yml restart app
    endscript
}
EOF
```

## Backup and Recovery

### 1. Database Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/path/to/edupro-suite/backups"
DB_CONTAINER="edupro_postgres"
DB_NAME="edupro_db"
DB_USER="edupro_user"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
BACKUP_FILE="edupro_backup_$(date +%Y%m%d_%H%M%S).sql"

# Create database backup
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Remove old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### 2. Automated Backup

```bash
# Make script executable
chmod +x scripts/backup.sh

# Add to crontab (daily backup at 2 AM)
echo "0 2 * * * /path/to/edupro-suite/scripts/backup.sh" | crontab -
```

### 3. Recovery Procedure

```bash
# Stop application
docker-compose -f docker-compose.production.yml stop app

# Restore database
gunzip -c backups/edupro_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i edupro_postgres psql -U edupro_user -d edupro_db

# Start application
docker-compose -f docker-compose.production.yml start app
```

## Scaling Considerations

### 1. Horizontal Scaling

For high-traffic scenarios, consider:

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  app:
    deploy:
      replicas: 3
    # ... other configuration

  nginx:
    # Update upstream configuration for load balancing
    # ... configuration
```

### 2. Database Scaling

```bash
# Read replicas for PostgreSQL
# Configure master-slave replication
# Use connection pooling (PgBouncer)
```

### 3. Caching Strategy

```yaml
# Add Redis Cluster for high availability
redis-cluster:
  image: redis:6.2-alpine
  deploy:
    replicas: 6
  # ... cluster configuration
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs app

# Check database connection
docker-compose -f docker-compose.production.yml exec app npm run db:status

# Verify environment variables
docker-compose -f docker-compose.production.yml exec app env | grep DATABASE_URL
```

#### 2. Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose -f docker-compose.production.yml exec postgres pg_isready

# Test connection
docker-compose -f docker-compose.production.yml exec postgres psql -U edupro_user -d edupro_db -c "SELECT 1;"
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in ssl/fullchain.pem -text -noout

# Test SSL configuration
curl -I https://your-domain.com
```

#### 4. Performance Issues

```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:3000/api/health

# Analyze slow queries
docker-compose -f docker-compose.production.yml exec postgres psql -U edupro_user -d edupro_db -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### Log Analysis

```bash
# Application logs
docker-compose -f docker-compose.production.yml logs -f app

# Database logs
docker-compose -f docker-compose.production.yml logs -f postgres

# Nginx logs
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log
```

## Maintenance Procedures

### 1. Regular Updates

```bash
# Update application
git pull origin main
docker-compose -f docker-compose.production.yml build app
docker-compose -f docker-compose.production.yml up -d app

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### 2. Database Maintenance

```bash
# Vacuum and analyze
docker-compose -f docker-compose.production.yml exec postgres psql -U edupro_user -d edupro_db -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.production.yml exec postgres psql -U edupro_user -d edupro_db -c "SELECT pg_size_pretty(pg_database_size('edupro_db'));"

# Monitor connections
docker-compose -f docker-compose.production.yml exec postgres psql -U edupro_user -d edupro_db -c "SELECT count(*) FROM pg_stat_activity;"
```

### 3. Security Updates

```bash
# Update SSL certificates
sudo certbot renew

# Security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image edupro-suite:latest

# Update dependencies
npm audit fix
```

### 4. Performance Optimization

```bash
# Optimize database
docker-compose -f docker-compose.production.yml exec postgres psql -U edupro_user -d edupro_db -c "REINDEX DATABASE edupro_db;"

# Clear application cache
docker-compose -f docker-compose.production.yml exec redis redis-cli FLUSHALL

# Optimize images
docker system prune -a
```

## Support and Documentation

### Getting Help

- **Documentation**: Check the `/docs` directory for detailed guides
- **Issues**: Report bugs on GitHub Issues
- **Community**: Join our Discord server for community support
- **Professional Support**: Contact support@edupro-suite.com

### Useful Commands

```bash
# Quick health check
docker-compose -f docker-compose.production.yml ps

# View resource usage
docker stats --no-stream

# Backup database quickly
docker exec edupro_postgres pg_dump -U edupro_user edupro_db > quick_backup.sql

# Restart specific service
docker-compose -f docker-compose.production.yml restart app

# View recent logs
docker-compose -f docker-compose.production.yml logs --tail=100 app
```

---

**Note**: Replace `your-domain.com` with your actual domain name throughout this guide. Ensure all passwords and secrets are properly secured and never committed to version control.
