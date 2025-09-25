# EduPro Suite - Production Deployment Guide

## 1. Overview and Prerequisites

### System Requirements
- **Server**: Linux (Ubuntu 20.04+ or CentOS 8+)
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: 50GB+ SSD storage
- **CPU**: 2+ cores (4+ cores recommended)
- **Network**: Static IP with domain name

### Required Software
- Docker 24.0+
- Docker Compose 2.20+
- Git
- SSL certificates (Let's Encrypt or commercial)

### Domain Setup
- Primary domain: `yourdomain.com`
- API subdomain: `api.yourdomain.com` (optional)
- Admin subdomain: `admin.yourdomain.com` (optional)

## 2. Environment Variables and Secrets

### Create Production Environment File
```bash
cp .env.production.example .env.production
```

### Required Environment Variables

#### Database Configuration
```env
DATABASE_URL="postgresql://edupro_user:secure_password@db:5432/edupro_production"
POSTGRES_DB=edupro_production
POSTGRES_USER=edupro_user
POSTGRES_PASSWORD=secure_password_here
```

#### Application Secrets
```env
JWT_SECRET=your_super_secure_jwt_secret_256_bits_minimum
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://yourdomain.com
```

#### External Services
```env
# Email Service (SendGrid, AWS SES, etc.)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your_sendgrid_api_key

# SMS Service (Twilio, AWS SNS, etc.)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# File Storage (AWS S3, CloudFlare R2, etc.)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=edupro-files-production
```

#### Security & Performance
```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
APP_VERSION=1.0.0
ALLOWED_IMAGE_DOMAINS=yourdomain.com,cdn.yourdomain.com
```

## 3. Database, Redis & Storage Setup

### PostgreSQL Configuration
- **Version**: PostgreSQL 15+
- **Memory**: Allocate 25% of system RAM
- **Connections**: Max 100 connections
- **Backup**: Daily automated backups with 30-day retention

### Redis Configuration
- **Version**: Redis 7+
- **Memory**: 512MB-1GB depending on usage
- **Persistence**: RDB + AOF for data durability
- **Eviction**: `allkeys-lru` policy

### File Storage Setup
```bash
# Create local storage directories
mkdir -p /var/edupro/uploads
mkdir -p /var/edupro/backups
chown -R 1001:1001 /var/edupro
```

### Database Migrations
```bash
# Run migrations
docker-compose exec app npm run db:migrate

# Seed initial data
docker-compose exec app npm run db:seed
```

## 4. Security Configuration

### SSL/TLS Setup
```nginx
# /etc/nginx/sites-available/edupro
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support for Socket.IO
    location /api/socket/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Configuration
```bash
# UFW Firewall Rules
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Content Security Policy
The CSP is configured in `next.config.ts` with production-safe settings:
- No `unsafe-inline` or `unsafe-eval` in production
- WebSocket connections allowed for Socket.IO
- Image sources restricted to trusted domains

## 5. Building and Running

### Production Build Process
```bash
# Clone repository
git clone https://github.com/yourusername/edupro-suite.git
cd edupro-suite

# Configure environment
cp .env.production.example .env.production
# Edit .env.production with your values

# Build and start services
docker-compose -f docker-compose.production.yml up -d --build
```

### Service Architecture
- **app**: Next.js application with Socket.IO server
- **db**: PostgreSQL database
- **redis**: Redis cache and session store
- **nginx**: Reverse proxy and SSL termination
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards
- **loki**: Log aggregation
- **promtail**: Log shipping

### Port Configuration
- **3000**: Application (internal)
- **80/443**: Nginx (external)
- **5432**: PostgreSQL (internal)
- **6379**: Redis (internal)
- **9090**: Prometheus (internal)
- **3001**: Grafana (internal)

### Health Checks
```bash
# Application health
curl https://yourdomain.com/api/health

# Detailed system health
curl https://yourdomain.com/api/health/detailed

# Docker container health
docker-compose ps
```

## 6. Scaling Strategy

### Horizontal Scaling
```yaml
# docker-compose.production.yml
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
```

### Load Balancer Configuration
```nginx
upstream edupro_backend {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s;
}

# Sticky sessions for Socket.IO
ip_hash;
```

### Database Scaling
- **Read Replicas**: Configure PostgreSQL read replicas
- **Connection Pooling**: Use PgBouncer for connection management
- **Caching**: Redis for session and application caching

## 7. Monitoring & Logging

### Prometheus Metrics
- Application performance metrics
- Database connection pools
- Redis cache hit rates
- HTTP request rates and latencies
- Socket.IO connection counts

### Grafana Dashboards
- **System Overview**: CPU, Memory, Disk usage
- **Application Metrics**: Response times, error rates
- **Database Performance**: Query performance, connections
- **User Activity**: Active users, feature usage

### Log Management with Loki
```yaml
# promtail configuration
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: edupro-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: edupro
          __path__: /var/log/edupro/*.log
```

### Alerting Rules
```yaml
# prometheus/alerts.yml
groups:
  - name: edupro-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: PostgreSQL database is down
```

## 8. Backups & Disaster Recovery

### Database Backup Script
```bash
#!/bin/bash
# /opt/edupro/backup-db.sh

BACKUP_DIR="/var/edupro/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="edupro_production"

# Create backup
docker-compose exec -T db pg_dump -U edupro_user $DB_NAME | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/db_backup_$DATE.sql.gz" s3://edupro-backups/database/
```

### File Backup Strategy
```bash
# Backup uploaded files
rsync -av /var/edupro/uploads/ s3://edupro-backups/files/

# Backup configuration
tar -czf /var/edupro/backups/config_$DATE.tar.gz \
    .env.production \
    docker-compose.production.yml \
    nginx/
```

### Disaster Recovery Plan
1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Frequency**: Database (hourly), Files (daily)
4. **Recovery Testing**: Monthly disaster recovery drills

## 9. CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/edupro-suite
            git pull origin main
            docker-compose -f docker-compose.production.yml up -d --build
```

### Deployment Checklist
- [ ] Run tests in staging environment
- [ ] Database migration dry-run
- [ ] Backup current production data
- [ ] Deploy during maintenance window
- [ ] Verify health checks pass
- [ ] Monitor error rates post-deployment
- [ ] Rollback plan ready

### Rollback Procedure
```bash
# Quick rollback to previous version
docker-compose -f docker-compose.production.yml down
git checkout HEAD~1
docker-compose -f docker-compose.production.yml up -d --build

# Database rollback (if needed)
docker-compose exec -T db psql -U edupro_user -d edupro_production < backup.sql
```

## 10. Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose logs app

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Port conflicts
```

#### Database Connection Issues
```bash
# Test database connectivity
docker-compose exec app npm run db:test

# Check PostgreSQL logs
docker-compose logs db

# Verify credentials
docker-compose exec db psql -U edupro_user -d edupro_production -c "SELECT 1;"
```

#### Socket.IO Connection Problems
```bash
# Check WebSocket connectivity
curl -H "Upgrade: websocket" -H "Connection: Upgrade" \
     https://yourdomain.com/api/socket/

# Verify custom server is running
docker-compose exec app ps aux | grep node
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check database performance
docker-compose exec db psql -U edupro_user -d edupro_production \
  -c "SELECT * FROM pg_stat_activity;"

# Redis memory usage
docker-compose exec redis redis-cli info memory
```

### Debug Commands
```bash
# Application shell access
docker-compose exec app /bin/sh

# Database shell
docker-compose exec db psql -U edupro_user -d edupro_production

# Redis CLI
docker-compose exec redis redis-cli

# View real-time logs
docker-compose logs -f app
```

### Performance Optimization
- Enable gzip compression in Nginx
- Configure proper caching headers
- Optimize database queries
- Use Redis for session storage
- Enable CDN for static assets

## Related Files
- [`docker-compose.production.yml`](../docker-compose.production.yml) - Production Docker configuration
- [`next.config.ts`](../next.config.ts) - Next.js production configuration with security headers
- [`app/api/health/detailed/route.ts`](../app/api/health/detailed/route.ts) - Health check endpoints
- [`.env.production.example`](../.env.production.example) - Environment variables template

## Support
For production support issues:
- Check monitoring dashboards first
- Review application logs
- Consult this troubleshooting guide
- Contact the development team with specific error messages and logs

---

**Last Updated**: December 2024  
**Version**: 1.0.0
