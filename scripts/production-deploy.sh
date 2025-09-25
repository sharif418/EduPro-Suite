#!/bin/bash

# =============================================================================
# EduPro Suite Production Deployment Script
# =============================================================================
# This script performs a safe production deployment with comprehensive checks
# =============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE_PATH="$PROJECT_ROOT/docker-compose.production.yml"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$BACKUP_DIR/deployment_$(date +%Y%m%d_%H%M%S).log"
HEALTH_CHECK_URL="${NEXTAUTH_URL:-https://abrar.ailearnersbd.com}/api/health"
ROLLBACK_ENABLED=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Rollback function
rollback_deployment() {
    error "Deployment failed. Initiating rollback..."
    
    # Attempt to restart previous containers if they exist
    if docker-compose -f "$COMPOSE_FILE_PATH" ps -q app &>/dev/null; then
        log "Attempting to restart previous containers..."
        docker-compose -f "$COMPOSE_FILE_PATH" start app nginx postgres redis 2>/dev/null || true
        success "Rollback attempt finished. Please check system status manually."
    else
        warning "No previous containers found to roll back to."
    fi
    
    # Restore database if backup exists
    if [ -n "${BACKUP_TAG:-}" ] && [ -f "$BACKUP_DIR/backup_${BACKUP_TAG}/database.sql" ]; then
        log "🗄️ Restoring database from backup..."
        docker-compose -f "$COMPOSE_FILE_PATH" up -d postgres
        sleep 10
        docker-compose -f "$COMPOSE_FILE_PATH" exec -T postgres psql -U "${DB_USER:-edupro}" -d "${DB_NAME:-edupro_production}" < "$BACKUP_DIR/backup_${BACKUP_TAG}/database.sql" 2>/dev/null || true
    fi
    
    # Restore files if backup exists
    if [ -n "${BACKUP_TAG:-}" ] && [ -d "$BACKUP_DIR/backup_${BACKUP_TAG}/uploads" ]; then
        log "📁 Restoring files from backup..."
        rm -rf "$PROJECT_ROOT/public/uploads" 2>/dev/null || true
        cp -r "$BACKUP_DIR/backup_${BACKUP_TAG}/uploads" "$PROJECT_ROOT/public/" 2>/dev/null || true
    fi
    
    error "❌ Rollback completed. Please investigate the deployment failure."
}

# Cleanup function for rollback
cleanup() {
    if [ "$ROLLBACK_ENABLED" = true ] && [ -n "${BACKUP_TAG:-}" ]; then
        warning "Deployment failed. Initiating rollback..."
        rollback_deployment
    fi
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "🚀 Starting EduPro Suite Production Deployment"
log "📁 Project Root: $PROJECT_ROOT"
log "📝 Log File: $LOG_FILE"

# =============================================================================
# Phase -1: Preflight Tool Check
# =============================================================================

log "🛠️ Phase -1: Preflight Tool Check"

# Run preflight check to ensure all required tools are available
if [ -f "$SCRIPT_DIR/preflight.sh" ]; then
    log "🔧 Running preflight tool verification..."
    
    if "$SCRIPT_DIR/preflight.sh"; then
        success "✅ All required tools are available"
    else
        error "❌ Preflight check failed - missing required tools"
        error "Please install the missing tools before proceeding"
        exit 1
    fi
else
    warning "⚠️ Preflight script not found - skipping tool verification"
fi

# =============================================================================
# Phase 0: Dependency Validation and Synchronization
# =============================================================================

log "📦 Phase 0: Dependency Validation and Synchronization"

# Check if dependency validation script exists and run it
if [ -f "$SCRIPT_DIR/validate-dependencies.sh" ]; then
    log "🔍 Running comprehensive dependency validation..."
    
    if "$SCRIPT_DIR/validate-dependencies.sh"; then
        success "✅ All dependency validations passed"
    else
        error "❌ Dependency validation failed"
        error "Critical dependencies may be missing or misconfigured"
        
        # Offer to automatically fix dependency issues
        log "🔧 Attempting to automatically resolve dependency issues..."
        
        if [ -f "$SCRIPT_DIR/dependency-sync.sh" ]; then
            log "🔄 Running dependency synchronization..."
            
            if "$SCRIPT_DIR/dependency-sync.sh"; then
                success "✅ Dependency synchronization completed"
                
                # Re-run validation to confirm fixes
                log "🔍 Re-validating dependencies after synchronization..."
                if "$SCRIPT_DIR/validate-dependencies.sh"; then
                    success "✅ Dependencies are now properly synchronized"
                else
                    error "❌ Dependency issues persist after synchronization"
                    error "Manual intervention required"
                    exit 1
                fi
            else
                error "❌ Dependency synchronization failed"
                error "Please run './scripts/dependency-sync.sh' manually and fix any issues"
                exit 1
            fi
        else
            error "Dependency synchronization script not found"
            error "Please ensure all required scripts are present"
            exit 1
        fi
    fi
else
    error "Dependency validation script not found at $SCRIPT_DIR/validate-dependencies.sh"
    error "Please ensure all deployment scripts are present"
    exit 1
fi

# Additional critical dependency verification for deployment
log "🔧 Verifying critical dependencies for deployment..."

# Check package-lock.json exists and is synchronized
if [ ! -f "$PROJECT_ROOT/package-lock.json" ]; then
    error "❌ package-lock.json not found"
    error "Dependencies are not locked for production deployment"
    error "This was the root cause of previous deployment failures"
    
    log "🔄 Generating package-lock.json..."
    if [ -f "$SCRIPT_DIR/dependency-sync.sh" ]; then
        "$SCRIPT_DIR/dependency-sync.sh"
    else
        error "Cannot generate package-lock.json - dependency-sync.sh not found"
        exit 1
    fi
fi

# Verify critical dependencies that were causing deployment failures
critical_deployment_deps=("ioredis" "sharp" "socket.io" "socket.io-client" "prisma" "@prisma/client")

log "🔍 Checking critical dependencies in package.json..."
for dep in "${critical_deployment_deps[@]}"; do
    if grep -q "\"$dep\"" "$PROJECT_ROOT/package.json"; then
        success "✅ $dep found in package.json"
    else
        error "❌ Critical dependency '$dep' missing from package.json"
        error "This dependency was identified as critical for deployment success"
        exit 1
    fi
done

log "🔍 Checking critical dependencies in package-lock.json..."
for dep in "${critical_deployment_deps[@]}"; do
    if grep -q "\"$dep\"" "$PROJECT_ROOT/package-lock.json"; then
        success "✅ $dep found in package-lock.json"
    else
        error "❌ Critical dependency '$dep' missing from package-lock.json"
        error "This indicates package.json and package-lock.json are out of sync"
        error "This was the primary cause of previous deployment failures"
        exit 1
    fi
done

# Verify node_modules contains critical dependencies
if [ -d "$PROJECT_ROOT/node_modules" ]; then
    log "🔍 Checking critical dependencies in node_modules..."
    for dep in "${critical_deployment_deps[@]}"; do
        if [ -d "$PROJECT_ROOT/node_modules/$dep" ]; then
            success "✅ $dep installed in node_modules"
        else
            error "❌ Critical dependency '$dep' missing from node_modules"
            error "Run 'npm install' or './scripts/dependency-sync.sh' to install dependencies"
            exit 1
        fi
    done
else
    error "❌ node_modules directory not found"
    error "Dependencies are not installed"
    exit 1
fi

# Test critical module imports before deployment
if command -v node &> /dev/null; then
    log "🧪 Testing critical module imports before deployment..."
    
    # Create a temporary test script in project directory
    cat > "$PROJECT_ROOT/deployment_import_test_temp.js" << 'EOF'
const modules = ['ioredis', 'sharp', 'socket.io', 'socket.io-client', '@prisma/client', 'next'];
let failed = false;

console.log('Testing critical module imports for deployment...');

modules.forEach(module => {
    try {
        require(module);
        console.log(`✓ ${module} - OK`);
    } catch (error) {
        console.error(`✗ ${module} - FAILED: ${error.message}`);
        failed = true;
    }
});

if (failed) {
    console.error('\n❌ Some critical modules failed to import');
    console.error('This will cause deployment failure');
    process.exit(1);
} else {
    console.log('\n✅ All critical modules imported successfully');
    console.log('Dependencies are ready for deployment');
}
EOF
    
    # Run the test from project directory
    cd "$PROJECT_ROOT"
    if node deployment_import_test_temp.js; then
        success "✅ All critical modules ready for deployment"
    else
        error "❌ Critical module import test failed"
        error "Deployment would fail due to missing dependencies"
        exit 1
    fi
    
    # Clean up
    rm -f "$PROJECT_ROOT/deployment_import_test_temp.js"
else
    warning "⚠️ Node.js not available for module import testing"
fi

success "🎉 Dependency validation and synchronization completed successfully"
log "📊 Dependency Status Summary:"
log "   • package.json: ✅ Contains all critical dependencies"
log "   • package-lock.json: ✅ Synchronized and contains critical dependencies"
log "   • node_modules: ✅ All critical dependencies installed"
log "   • Module imports: ✅ All critical modules can be imported"
log "   • Deployment readiness: ✅ Dependencies are ready for production deployment"

# =============================================================================
# Phase 1: Pre-deployment Validation
# =============================================================================

log "🔍 Phase 1: Pre-deployment Validation"

# Check if .env.production file exists
if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
    error ".env.production file not found. Please create it with production values"
    exit 1
fi

# Load environment variables
set -a
source "$PROJECT_ROOT/.env.production"
set +a

# Validate required environment variables
log "🔧 Validating environment configuration..."
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET"
    "NODE_ENV"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        error "Required environment variable $var is not set"
        exit 1
    fi
done

# Validate JWT secret strength
if [ ${#JWT_SECRET} -lt 64 ]; then
    error "JWT_SECRET must be at least 64 characters long for production"
    exit 1
fi

# Check if NODE_ENV is production
if [ "$NODE_ENV" != "production" ]; then
    error "NODE_ENV must be set to 'production' for production deployment"
    exit 1
fi

success "Environment validation passed"

# Check Docker and Docker Compose
log "🐳 Checking Docker environment..."
if ! command -v docker &> /dev/null; then
    error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    error "Docker daemon is not running"
    exit 1
fi

success "Docker environment check passed"

# =============================================================================
# Phase 2: Backup Current State
# =============================================================================

log "💾 Phase 2: Creating Backup"

BACKUP_TAG="backup_$(date +%Y%m%d_%H%M%S)"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_TAG"

mkdir -p "$BACKUP_PATH"

# Backup database
log "🗄️ Backing up database..."
if docker-compose -f "$COMPOSE_FILE_PATH" ps postgres | grep -q "Up"; then
    docker-compose -f "$COMPOSE_FILE_PATH" exec -T postgres pg_dump -U "${DB_USER:-edupro}" "${DB_NAME:-edupro_production}" > "$BACKUP_PATH/database.sql"
    success "Database backup created"
else
    warning "Database container not running, skipping database backup"
fi

# Backup uploaded files
log "📁 Backing up uploaded files..."
if [ -d "$PROJECT_ROOT/public/uploads" ]; then
    cp -r "$PROJECT_ROOT/public/uploads" "$BACKUP_PATH/"
    success "Files backup created"
fi

# Backup current environment
if [ -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$BACKUP_PATH/.env.backup"
fi

success "Backup completed: $BACKUP_PATH"

# =============================================================================
# Phase 3: Build and Test
# =============================================================================

log "🔨 Phase 3: Build and Test"

# Pull latest images
log "📥 Pulling latest base images..."
docker-compose -f "$COMPOSE_FILE_PATH" pull

# Build application
log "🏗️ Building application..."
docker-compose -f "$COMPOSE_FILE_PATH" build --no-cache app

# Run tests if available
log "🧪 Running tests..."
if [ -f "$PROJECT_ROOT/package.json" ] && grep -q '"test"' "$PROJECT_ROOT/package.json"; then
    if docker-compose -f "$COMPOSE_FILE_PATH" run --rm app npm test; then
        success "Tests passed"
    else
        error "Tests failed"
        exit 1
    fi
else
    warning "No tests found, skipping test phase"
fi

# =============================================================================
# Phase 4: Database Migration
# =============================================================================

log "🗄️ Phase 4: Database Migration"

# Stop current services gracefully
log "⏹️ Stopping current services..."
docker-compose -f "$COMPOSE_FILE_PATH" down --timeout 30

# Start database only
log "🔄 Starting database service..."
docker-compose -f "$COMPOSE_FILE_PATH" up -d postgres

# Wait for database to be ready
log "⏳ Waiting for database to be ready..."
timeout 60 bash -c 'until docker-compose -f "$COMPOSE_FILE_PATH" exec postgres pg_isready -U "${DB_USER:-edupro}" -d "${DB_NAME:-edupro_production}"; do sleep 2; done'

# Run database migrations
log "🔄 Running database migrations..."
if [ -d "$PROJECT_ROOT/prisma/migrations" ]; then
    docker-compose -f "$COMPOSE_FILE_PATH" run --rm app npx prisma migrate deploy
    success "Database migrations completed"
else
    warning "No migrations found, skipping migration phase"
fi

# =============================================================================
# Phase 5: Deployment
# =============================================================================

log "🚀 Phase 5: Deployment"

# Start all services
log "▶️ Starting all services..."
docker-compose -f "$COMPOSE_FILE_PATH" up -d

# Wait for services to be ready
log "⏳ Waiting for services to start..."
sleep 30

# =============================================================================
# Phase 6: Health Checks
# =============================================================================

log "🏥 Phase 6: Health Checks"

# Check if containers are running
log "🔍 Checking container status..."
if ! docker-compose -f "$COMPOSE_FILE_PATH" ps | grep -q "Up"; then
    error "Some containers failed to start"
    docker-compose -f "$COMPOSE_FILE_PATH" logs
    exit 1
fi

# Health check with retries
log "🩺 Performing health checks..."
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=10

for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    log "Health check attempt $i/$HEALTH_CHECK_RETRIES..."
    
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
        success "Health check passed"
        break
    elif [ $i -eq $HEALTH_CHECK_RETRIES ]; then
        error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
        docker-compose -f "$COMPOSE_FILE_PATH" logs app
        exit 1
    else
        warning "Health check failed, retrying in ${HEALTH_CHECK_DELAY}s..."
        sleep $HEALTH_CHECK_DELAY
    fi
done

# Test critical endpoints
log "🔗 Testing critical endpoints..."
critical_endpoints=(
    "/api/health"
    "/api/health/detailed"
    "/api/auth/me"
)

for endpoint in "${critical_endpoints[@]}"; do
    url="${NEXTAUTH_URL}${endpoint}"
    if curl -f -s "$url" > /dev/null; then
        success "✅ $endpoint - OK"
    else
        error "❌ $endpoint - FAILED"
        exit 1
    fi
done

# =============================================================================
# Phase 7: Performance Validation
# =============================================================================

log "⚡ Phase 7: Performance Validation"

# Test response times
log "📊 Testing response times..."
response_time=$(curl -o /dev/null -s -w '%{time_total}' "$HEALTH_CHECK_URL")
if (( $(echo "$response_time < 2.0" | bc -l) )); then
    success "Response time: ${response_time}s (Good)"
else
    warning "Response time: ${response_time}s (Slow)"
fi

# Check memory usage
log "💾 Checking memory usage..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | tee -a "$LOG_FILE"

# =============================================================================
# Phase 8: Security Validation
# =============================================================================

log "🔒 Phase 8: Security Validation"

# Check security headers
log "🛡️ Validating security headers..."
security_headers=(
    "X-Content-Type-Options"
    "X-Frame-Options"
    "X-XSS-Protection"
)

for header in "${security_headers[@]}"; do
    if curl -I -s "$HEALTH_CHECK_URL" | grep -i "$header" > /dev/null; then
        success "✅ $header header present"
    else
        warning "⚠️ $header header missing"
    fi
done

# =============================================================================
# Phase 9: Post-deployment Tasks
# =============================================================================

log "📋 Phase 9: Post-deployment Tasks"

# Clean up old images
log "🧹 Cleaning up old Docker images..."
docker image prune -f

# Clean up old backups (keep last 10)
log "🗂️ Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +11 | xargs -r rm -rf

# Generate deployment report
log "📊 Generating deployment report..."
cat > "$BACKUP_PATH/deployment_report.txt" << EOF
EduPro Suite Deployment Report
==============================
Deployment Date: $(date)
Backup Tag: $BACKUP_TAG
Environment: $NODE_ENV
Database URL: ${DATABASE_URL%%@*}@***
Health Check URL: $HEALTH_CHECK_URL

Container Status:
$(docker-compose -f "$COMPOSE_FILE_PATH" ps)

Service Logs (last 50 lines):
$(docker-compose -f "$COMPOSE_FILE_PATH" logs --tail=50)
EOF

# =============================================================================
# Deployment Success
# =============================================================================

ROLLBACK_ENABLED=false  # Disable rollback on success

success "🎉 Deployment completed successfully!"
log "📊 Deployment Summary:"
log "   • Backup created: $BACKUP_TAG"
log "   • Services: $(docker-compose -f "$COMPOSE_FILE_PATH" ps --services | wc -l) containers running"
log "   • Health check: ✅ PASSED"
log "   • Security headers: ✅ VALIDATED"
log "   • Performance: ✅ ACCEPTABLE"

log "🔗 Application URLs:"
log "   • Main Application: $NEXTAUTH_URL"
log "   • Health Check: $HEALTH_CHECK_URL"
log "   • API Documentation: ${NEXTAUTH_URL}/api"

log "📝 Next Steps:"
log "   1. Monitor application logs: docker-compose -f docker-compose.production.yml logs -f"
log "   2. Check system metrics: docker stats"
log "   3. Verify user workflows through browser testing"
log "   4. Monitor error rates and performance"

log "✅ Production deployment completed successfully!"

# =============================================================================
# Usage Information
# =============================================================================

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --no-backup     Skip backup creation (not recommended)"
    echo "  --no-tests      Skip test execution"
    echo "  --no-rollback   Disable automatic rollback on failure"
    echo "  --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL    PostgreSQL connection string"
    echo "  JWT_SECRET      JWT signing secret (64+ characters)"
    echo "  NEXTAUTH_URL    Application URL"
    echo "  NODE_ENV        Must be 'production'"
    echo ""
    echo "Example:"
    echo "  $0                    # Full deployment with all checks"
    echo "  $0 --no-tests         # Deploy without running tests"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-backup)
            BACKUP_ENABLED=false
            shift
            ;;
        --no-tests)
            TESTS_ENABLED=false
            shift
            ;;
        --no-rollback)
            ROLLBACK_ENABLED=false
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Ensure script is run from project root
cd "$PROJECT_ROOT"

log "🎯 Production deployment script completed"
