# EduPro Suite - Comprehensive Deployment Checklist

## 🎯 Overview

This checklist addresses the dependency synchronization issues that were causing deployment failures and provides a step-by-step guide for successful production deployment of EduPro Suite.

**Root Cause Identified**: The primary issue was that `package-lock.json` was severely out of sync with `package.json`, missing critical dependencies like `ioredis` and `sharp`. This caused `npm ci` to fail during Docker builds.

**Solution Implemented**: Comprehensive dependency synchronization and validation pipeline with enhanced deployment scripts.

---

## 📋 Pre-deployment Checklist

### 1. Dependency Management ✅

- [ ] **Critical Dependencies Verification**
  ```bash
  # Verify critical dependencies are in package.json
  grep -E '"(ioredis|sharp|socket\.io|@prisma/client|prisma)"' edupro-suite/package.json
  ```

- [ ] **Package Lock File Synchronization**
  ```bash
  # Run dependency synchronization script
  cd edupro-suite
  ./scripts/dependency-sync.sh
  ```

- [ ] **Dependency Validation**
  ```bash
  # Run comprehensive dependency validation
  ./scripts/validate-dependencies.sh
  ```

- [ ] **Module Import Testing**
  ```bash
  # Test that critical modules can be imported
  node -e "
    const modules = ['ioredis', 'sharp', 'socket.io', 'socket.io-client', '@prisma/client'];
    modules.forEach(m => { require(m); console.log(\`✓ \${m}\`); });
  "
  ```

### 2. Environment Setup 🔧

- [ ] **Environment File Configuration**
  ```bash
  # Copy and configure production environment
  cp .env.production.example .env.production
  # Edit .env.production with actual production values
  ```

- [ ] **Required Environment Variables**
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL` (PostgreSQL connection string)
  - [ ] `REDIS_URL` (Redis connection string)
  - [ ] `JWT_SECRET` (64+ characters)
  - [ ] `NEXTAUTH_SECRET` (64+ characters)
  - [ ] `NEXTAUTH_URL` (https://abrar.ailearnersbd.com)
  - [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
  - [ ] `ALLOWED_ORIGINS`

- [ ] **Environment File Permissions**
  ```bash
  chmod 600 .env.production
  ```

### 3. Security Checks 🔒

- [ ] **Secret Strength Validation**
  ```bash
  # Ensure secrets are at least 64 characters
  echo $JWT_SECRET | wc -c  # Should be > 64
  echo $NEXTAUTH_SECRET | wc -c  # Should be > 64
  ```

- [ ] **HTTPS Configuration**
  - [ ] `NEXTAUTH_URL` uses HTTPS
  - [ ] SSL certificates are in place
  - [ ] Domain DNS is properly configured

- [ ] **Default Password Check**
  ```bash
  # Ensure no default passwords remain
  grep -i "change_this\|your-secure\|password123" .env.production || echo "✅ No default passwords found"
  ```

---

## 🚀 Deployment Steps

### Step 1: Pre-deployment Validation

```bash
# Run comprehensive production validation
./scripts/validate-production.sh
```

**Expected Output**: All validations should pass with no errors.

### Step 2: Fix Permissions

```bash
# Fix all file and directory permissions
./scripts/fix-permissions.sh
```

### Step 3: Dependency Synchronization (if needed)

```bash
# Only run if dependency validation failed
./scripts/dependency-sync.sh
```

### Step 4: Production Deployment

```bash
# Execute production deployment
./scripts/production-deploy.sh
```

**This script will automatically**:
- Validate all dependencies
- Create backups
- Build optimized Docker images
- Run database migrations
- Deploy all services
- Perform health checks
- Validate deployment success

---

## 🏥 Post-deployment Verification

### 1. Service Health Checks

```bash
# Check all containers are running
docker-compose -f docker-compose.production.yml ps

# Check application health
curl -f https://abrar.ailearnersbd.com/api/health

# Check detailed health status
curl -f https://abrar.ailearnersbd.com/api/health/detailed
```

### 2. Critical Endpoint Testing

```bash
# Test authentication endpoint
curl -f https://abrar.ailearnersbd.com/api/auth/me

# Test database connectivity
curl -f https://abrar.ailearnersbd.com/api/admin/dashboard/stats

# Test real-time features
curl -f https://abrar.ailearnersbd.com/api/socket
```

### 3. Dependency Verification in Production

```bash
# Verify critical dependencies are working in production
docker-compose -f docker-compose.production.yml exec app node -e "
  const modules = ['ioredis', 'sharp', 'socket.io', '@prisma/client'];
  modules.forEach(m => { require(m); console.log(\`✓ \${m} working in production\`); });
"
```

### 4. Performance Validation

```bash
# Check response times
curl -o /dev/null -s -w '%{time_total}' https://abrar.ailearnersbd.com/

# Monitor resource usage
docker stats --no-stream
```

---

## 🔧 Troubleshooting Guide

### Common Dependency Issues

#### Issue: "Module not found: ioredis"
**Solution**:
```bash
./scripts/dependency-sync.sh
./scripts/validate-dependencies.sh
```

#### Issue: "Sharp installation failed"
**Solution**:
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "package-lock.json out of sync"
**Solution**:
```bash
# Regenerate package-lock.json
rm package-lock.json
./scripts/dependency-sync.sh
```

### Docker Build Issues

#### Issue: "npm ci failed"
**Cause**: package-lock.json inconsistency
**Solution**:
```bash
# Use enhanced Dockerfile with fallback to npm install
docker-compose build --no-cache app
```

#### Issue: "Prisma client not generated"
**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate
docker-compose build --no-cache app
```

### Deployment Failures

#### Issue: "Health check failed"
**Investigation**:
```bash
# Check application logs
docker-compose logs app

# Check dependency status
docker-compose exec app node -e "require('ioredis'); console.log('Redis OK')"
docker-compose exec app node -e "require('sharp'); console.log('Sharp OK')"
```

#### Issue: "Database connection failed"
**Solution**:
```bash
# Check database status
docker-compose exec postgres pg_isready -U edupro -d edupro_production

# Verify DATABASE_URL format
echo $DATABASE_URL
```

---

## 🔄 Rollback Procedures

### Automatic Rollback
The deployment script includes automatic rollback on failure:
```bash
# Rollback is triggered automatically if deployment fails
# Check logs for rollback status
tail -f logs/deployment_*.log
```

### Manual Rollback
```bash
# Stop current deployment
docker-compose -f docker-compose.production.yml down

# Restore from latest backup
BACKUP_TAG=$(ls -t backups/ | head -1)
echo "Restoring from backup: $BACKUP_TAG"

# Restore database
docker-compose -f docker-compose.production.yml up -d postgres
sleep 10
docker-compose -f docker-compose.production.yml exec -T postgres psql -U edupro -d edupro_production < backups/$BACKUP_TAG/database.sql

# Restore files
rm -rf public/uploads
cp -r backups/$BACKUP_TAG/uploads public/

# Restart services
docker-compose -f docker-compose.production.yml up -d
```

---

## 📊 Monitoring and Maintenance

### 1. Continuous Monitoring

```bash
# Monitor application logs
docker-compose logs -f app

# Monitor system resources
docker stats

# Check dependency health
./scripts/validate-dependencies.sh
```

### 2. Regular Maintenance

- [ ] **Weekly**: Run dependency validation
- [ ] **Monthly**: Update dependencies and security patches
- [ ] **Quarterly**: Review and update deployment scripts

### 3. Backup Verification

```bash
# Verify backups are created
ls -la backups/

# Test backup restoration (in staging)
./scripts/restore-backup.sh backup_YYYYMMDD_HHMMSS
```

---

## 🎯 Success Criteria

### Deployment is considered successful when:

1. **✅ All dependency validations pass**
   - package.json and package-lock.json are synchronized
   - All critical dependencies (ioredis, sharp, socket.io, etc.) are installed
   - Module imports work correctly

2. **✅ All services are healthy**
   - Application responds to health checks
   - Database connectivity is established
   - Redis cache is operational

3. **✅ Critical endpoints are accessible**
   - Authentication endpoints work
   - API endpoints respond correctly
   - Real-time features are functional

4. **✅ Performance meets requirements**
   - Response times < 2 seconds
   - Memory usage within limits
   - No critical errors in logs

5. **✅ Security measures are active**
   - HTTPS is enforced
   - Security headers are present
   - Environment variables are properly secured

---

## 🚨 Emergency Contacts and Procedures

### Critical Issues
- **Database corruption**: Restore from latest backup
- **Security breach**: Immediately rotate all secrets
- **Service unavailability**: Check dependency status first

### Escalation Path
1. Check dependency synchronization
2. Validate environment configuration
3. Review application logs
4. Perform rollback if necessary
5. Contact system administrator

---

## 📝 Deployment Log Template

```
Deployment Date: ___________
Deployed By: ___________
Version/Tag: ___________

Pre-deployment Checks:
□ Dependency validation passed
□ Environment variables configured
□ Security checks completed
□ Backup created

Deployment Steps:
□ Services stopped gracefully
□ Database migrations applied
□ Application built successfully
□ Services started
□ Health checks passed

Post-deployment Verification:
□ All endpoints accessible
□ Dependencies working correctly
□ Performance acceptable
□ Monitoring active

Issues Encountered:
_________________________________

Resolution Steps:
_________________________________

Final Status: □ Success □ Failed □ Partial
```

---

## 🔗 Quick Reference Commands

```bash
# Complete deployment workflow
./scripts/validate-production.sh && ./scripts/production-deploy.sh

# Dependency troubleshooting
./scripts/dependency-sync.sh && ./scripts/validate-dependencies.sh

# Service management
docker-compose -f docker-compose.production.yml up -d    # Start
docker-compose -f docker-compose.production.yml down     # Stop
docker-compose -f docker-compose.production.yml logs -f  # Logs

# Health monitoring
curl https://abrar.ailearnersbd.com/api/health
curl https://abrar.ailearnersbd.com/api/health/detailed

# Emergency rollback
docker-compose down && ./scripts/restore-backup.sh $(ls -t backups/ | head -1)
```

---

**🎉 This checklist ensures that the dependency synchronization issues that were causing deployment failures are completely resolved, and EduPro Suite can be deployed successfully to production at https://abrar.ailearnersbd.com**
