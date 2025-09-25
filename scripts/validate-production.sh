#!/bin/bash

# =============================================================================
# EduPro Suite Production Validation Script
# =============================================================================
# This script validates all prerequisites before production deployment
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/validation_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

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

# Validation counters
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0

# Function to increment error counter
increment_error() {
    ((VALIDATION_ERRORS++))
}

# Function to increment warning counter
increment_warning() {
    ((VALIDATION_WARNINGS++))
}

log "🔍 Starting EduPro Suite Production Validation"
log "📁 Project Root: $PROJECT_ROOT"
log "📝 Log File: $LOG_FILE"

# =============================================================================
# Preflight Tool Check
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
        increment_error
        exit 1
    fi
else
    warning "⚠️ Preflight script not found - skipping tool verification"
    increment_warning
fi

# =============================================================================
# Dependency Consistency Validation
# =============================================================================

log "📦 Phase 0: Dependency Consistency Validation"

# Check if dependency validation script exists
if [ -f "$SCRIPT_DIR/validate-dependencies.sh" ]; then
    log "🔍 Running comprehensive dependency validation..."
    
    # Run the dependency validation script
    if "$SCRIPT_DIR/validate-dependencies.sh"; then
        success "✅ All dependency validations passed"
    else
        error "❌ Dependency validation failed"
        error "Critical dependencies (ioredis, sharp, socket.io, etc.) may be missing or misconfigured"
        error "Run './scripts/dependency-sync.sh' to resolve dependency issues"
        increment_error
    fi
else
    error "Dependency validation script not found at $SCRIPT_DIR/validate-dependencies.sh"
    increment_error
fi

# Additional critical dependency checks
log "🔧 Checking critical dependencies in package.json..."

if [ -f "$PROJECT_ROOT/package.json" ]; then
    # Check for critical dependencies that were causing deployment failures
    critical_deps=("ioredis" "sharp" "socket.io" "socket.io-client" "prisma" "@prisma/client")
    
    for dep in "${critical_deps[@]}"; do
        if grep -q "\"$dep\"" "$PROJECT_ROOT/package.json"; then
            success "✅ Critical dependency '$dep' found in package.json"
        else
            error "❌ Critical dependency '$dep' missing from package.json"
            increment_error
        fi
    done
else
    error "package.json not found"
    increment_error
fi

# Check package-lock.json synchronization
log "🔒 Checking package-lock.json synchronization..."

if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
    success "✅ package-lock.json exists"
    
    # Check if package-lock.json contains critical dependencies
    critical_lock_deps=("ioredis" "sharp" "socket.io" "socket.io-client")
    
    for dep in "${critical_lock_deps[@]}"; do
        if grep -q "\"$dep\"" "$PROJECT_ROOT/package-lock.json"; then
            success "✅ Critical dependency '$dep' found in package-lock.json"
        else
            error "❌ Critical dependency '$dep' missing from package-lock.json"
            error "This indicates package.json and package-lock.json are out of sync"
            error "Run './scripts/dependency-sync.sh' to regenerate package-lock.json"
            increment_error
        fi
    done
    
    # Check lock file version
    if command -v jq &> /dev/null; then
        LOCK_VERSION=$(jq -r '.lockfileVersion' "$PROJECT_ROOT/package-lock.json" 2>/dev/null || echo "unknown")
        if [ "$LOCK_VERSION" = "3" ]; then
            success "✅ package-lock.json version is correct (v3)"
        else
            warning "⚠️ package-lock.json version is $LOCK_VERSION (expected: 3)"
            increment_warning
        fi
    fi
else
    error "❌ package-lock.json not found"
    error "Dependencies are not locked for production deployment"
    error "Run './scripts/dependency-sync.sh' to generate package-lock.json"
    increment_error
fi

# Check node_modules directory
log "📁 Checking node_modules directory..."

if [ -d "$PROJECT_ROOT/node_modules" ]; then
    success "✅ node_modules directory exists"
    
    # Check critical dependencies in node_modules
    for dep in "${critical_deps[@]}"; do
        if [ -d "$PROJECT_ROOT/node_modules/$dep" ]; then
            success "✅ Critical dependency '$dep' installed in node_modules"
        else
            error "❌ Critical dependency '$dep' missing from node_modules"
            error "Run 'npm install' or './scripts/dependency-sync.sh' to install dependencies"
            increment_error
        fi
    done
    
    # Check node_modules size (should be reasonable)
    NODE_MODULES_SIZE=$(du -sh "$PROJECT_ROOT/node_modules" 2>/dev/null | cut -f1 || echo "unknown")
    log "📊 node_modules size: $NODE_MODULES_SIZE"
    
else
    error "❌ node_modules directory not found"
    error "Dependencies are not installed"
    error "Run 'npm install' or './scripts/dependency-sync.sh' to install dependencies"
    increment_error
fi

# Check build prerequisites
log "🏗️ Checking build prerequisites..."

# Check if Prisma client is generated
if [ -d "$PROJECT_ROOT/node_modules/.prisma/client" ]; then
    success "✅ Prisma client is generated"
else
    error "❌ Prisma client not generated"
    error "Run 'npx prisma generate' to generate Prisma client"
    increment_error
fi

# Test critical module imports (if Node.js is available)
if command -v node &> /dev/null; then
    log "🧪 Testing critical module imports..."
    
    # Create a temporary test script in project directory
    cat > "$PROJECT_ROOT/test_imports_temp.js" << 'EOF'
const modules = ['ioredis', 'sharp', 'socket.io', 'socket.io-client', '@prisma/client', 'next'];
let failed = false;

modules.forEach(module => {
    try {
        require(module);
        console.log(`✓ ${module} imported successfully`);
    } catch (error) {
        console.error(`✗ Failed to import ${module}: ${error.message}`);
        failed = true;
    }
});

process.exit(failed ? 1 : 0);
EOF
    
    # Run the test from project directory
    cd "$PROJECT_ROOT"
    if node test_imports_temp.js; then
        success "✅ All critical modules can be imported successfully"
    else
        error "❌ Some critical modules failed to import"
        error "This indicates dependency installation or configuration issues"
        increment_error
    fi
    
    # Clean up
    rm -f "$PROJECT_ROOT/test_imports_temp.js"
else
    warning "⚠️ Node.js not available for module import testing"
    increment_warning
fi

# =============================================================================
# Environment File Validation
# =============================================================================

log "📋 Phase 1: Environment Configuration Validation"

# Check if .env.production exists
if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
    error ".env.production file not found"
    increment_error
else
    success ".env.production file exists"
    
    # Load environment variables
    set -a
    source "$PROJECT_ROOT/.env.production"
    set +a
    
    # Validate required environment variables
    log "🔧 Validating environment variables..."
    
    required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "JWT_SECRET"
        "NEXTAUTH_URL"
        "NEXTAUTH_SECRET"
        "ALLOWED_ORIGINS"
        "REDIS_URL"
        "SMTP_HOST"
        "SMTP_USER"
        "SMTP_PASS"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            error "Required environment variable $var is not set"
            increment_error
        else
            success "✅ $var is set"
        fi
    done
    
    # Validate NODE_ENV
    if [ "${NODE_ENV:-}" != "production" ]; then
        error "NODE_ENV must be set to 'production'"
        increment_error
    else
        success "NODE_ENV is correctly set to production"
    fi
    
    # Validate JWT secret strength
    if [ ${#JWT_SECRET} -lt 64 ]; then
        error "JWT_SECRET must be at least 64 characters long for production"
        increment_error
    else
        success "JWT_SECRET length is adequate"
    fi
    
    # Validate NEXTAUTH_SECRET strength
    if [ ${#NEXTAUTH_SECRET} -lt 64 ]; then
        error "NEXTAUTH_SECRET must be at least 64 characters long for production"
        increment_error
    else
        success "NEXTAUTH_SECRET length is adequate"
    fi
    
    # Validate NEXTAUTH_URL format
    if [[ ! "$NEXTAUTH_URL" =~ ^https:// ]]; then
        error "NEXTAUTH_URL must use HTTPS in production"
        increment_error
    else
        success "NEXTAUTH_URL uses HTTPS"
    fi
fi

# =============================================================================
# Docker Environment Validation
# =============================================================================

log "🐳 Phase 2: Docker Environment Validation"

# Check Docker installation
if ! command -v docker &> /dev/null; then
    error "Docker is not installed or not in PATH"
    increment_error
else
    success "Docker is installed"
    
    # Check Docker version
    DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    log "Docker version: $DOCKER_VERSION"
fi

# Check Docker Compose installation
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed or not in PATH"
    increment_error
else
    success "Docker Compose is installed"
    
    # Check Docker Compose version
    COMPOSE_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    log "Docker Compose version: $COMPOSE_VERSION"
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    error "Docker daemon is not running"
    increment_error
else
    success "Docker daemon is running"
fi

# =============================================================================
# SSL Certificate Validation
# =============================================================================

log "🔒 Phase 3: SSL Certificate Validation"

SSL_CERT_PATH="${SSL_CERT_PATH:-./ssl/cert.pem}"
SSL_KEY_PATH="${SSL_KEY_PATH:-./ssl/key.pem}"

if [ ! -f "$PROJECT_ROOT/$SSL_CERT_PATH" ]; then
    warning "SSL certificate not found at $SSL_CERT_PATH"
    increment_warning
else
    success "SSL certificate found"
    
    # Check certificate expiration
    if command -v openssl &> /dev/null; then
        CERT_EXPIRY=$(openssl x509 -enddate -noout -in "$PROJECT_ROOT/$SSL_CERT_PATH" | cut -d= -f2)
        CERT_EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s)
        CURRENT_EPOCH=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (CERT_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
        
        if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
            warning "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
            increment_warning
        else
            success "SSL certificate is valid for $DAYS_UNTIL_EXPIRY days"
        fi
    fi
fi

if [ ! -f "$PROJECT_ROOT/$SSL_KEY_PATH" ]; then
    warning "SSL private key not found at $SSL_KEY_PATH"
    increment_warning
else
    success "SSL private key found"
fi

# =============================================================================
# DNS Resolution Validation
# =============================================================================

log "🌐 Phase 4: DNS Resolution Validation"

DOMAIN="${DOMAIN:-abrar.ailearnersbd.com}"

if command -v nslookup &> /dev/null; then
    if nslookup "$DOMAIN" &> /dev/null; then
        success "DNS resolution for $DOMAIN is working"
    else
        error "DNS resolution for $DOMAIN failed"
        increment_error
    fi
elif command -v dig &> /dev/null; then
    if dig "$DOMAIN" &> /dev/null; then
        success "DNS resolution for $DOMAIN is working"
    else
        error "DNS resolution for $DOMAIN failed"
        increment_error
    fi
else
    warning "Neither nslookup nor dig available for DNS validation"
    increment_warning
fi

# =============================================================================
# System Resources Validation
# =============================================================================

log "💾 Phase 5: System Resources Validation"

# Check available disk space
AVAILABLE_SPACE=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
AVAILABLE_SPACE_GB=$((AVAILABLE_SPACE / 1024 / 1024))

if [ $AVAILABLE_SPACE_GB -lt 10 ]; then
    error "Insufficient disk space: ${AVAILABLE_SPACE_GB}GB available (minimum 10GB required)"
    increment_error
else
    success "Sufficient disk space: ${AVAILABLE_SPACE_GB}GB available"
fi

# Check available memory
if command -v free &> /dev/null; then
    AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ $AVAILABLE_MEMORY -lt 2048 ]; then
        warning "Low available memory: ${AVAILABLE_MEMORY}MB (recommended: 2GB+)"
        increment_warning
    else
        success "Sufficient available memory: ${AVAILABLE_MEMORY}MB"
    fi
fi

# Check CPU cores
CPU_CORES=$(nproc)
if [ $CPU_CORES -lt 2 ]; then
    warning "Low CPU cores: $CPU_CORES (recommended: 2+)"
    increment_warning
else
    success "Sufficient CPU cores: $CPU_CORES"
fi

# =============================================================================
# Network Connectivity Validation
# =============================================================================

log "🌍 Phase 6: Network Connectivity Validation"

# Test external connectivity
if command -v curl &> /dev/null; then
    if curl -s --max-time 10 https://google.com > /dev/null; then
        success "External network connectivity is working"
    else
        error "External network connectivity failed"
        increment_error
    fi
elif command -v wget &> /dev/null; then
    if wget -q --timeout=10 --spider https://google.com; then
        success "External network connectivity is working"
    else
        error "External network connectivity failed"
        increment_error
    fi
else
    warning "Neither curl nor wget available for connectivity validation"
    increment_warning
fi

# Test domain accessibility (if not localhost)
if [[ "$NEXTAUTH_URL" != *"localhost"* ]] && [[ "$NEXTAUTH_URL" != *"127.0.0.1"* ]]; then
    DOMAIN_FROM_URL=$(echo "$NEXTAUTH_URL" | sed 's|https\?://||' | sed 's|/.*||')
    if command -v curl &> /dev/null; then
        if curl -s --max-time 10 "$NEXTAUTH_URL" > /dev/null; then
            success "Domain $DOMAIN_FROM_URL is accessible"
        else
            warning "Domain $DOMAIN_FROM_URL is not accessible (may be expected before deployment)"
            increment_warning
        fi
    fi
fi

# =============================================================================
# File Permissions Validation
# =============================================================================

log "🔐 Phase 7: File Permissions Validation"

# Check script permissions
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
if [ -d "$SCRIPTS_DIR" ]; then
    for script in "$SCRIPTS_DIR"/*.sh; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                success "$(basename "$script") is executable"
            else
                warning "$(basename "$script") is not executable"
                increment_warning
            fi
        fi
    done
fi

# Check upload directory permissions
UPLOAD_DIR="$PROJECT_ROOT/public/uploads"
if [ -d "$UPLOAD_DIR" ]; then
    if [ -w "$UPLOAD_DIR" ]; then
        success "Upload directory is writable"
    else
        error "Upload directory is not writable"
        increment_error
    fi
else
    warning "Upload directory does not exist (will be created during deployment)"
    increment_warning
fi

# =============================================================================
# Configuration Files Validation
# =============================================================================

log "📄 Phase 8: Configuration Files Validation"

# Check required configuration files
config_files=(
    "docker-compose.production.yml"
    "Dockerfile"
    "next.config.ts"
    "package.json"
    "prisma/schema.prisma"
    "nginx/nginx.conf"
    "nginx/conf.d/default.conf"
    "monitoring/prometheus.yml"
    "monitoring/loki-config.yaml"
    "monitoring/grafana/provisioning/datasources/prometheus.yml"
)

for config_file in "${config_files[@]}"; do
    if [ -f "$PROJECT_ROOT/$config_file" ]; then
        success "✅ $config_file exists"
    else
        error "❌ $config_file is missing"
        increment_error
    fi
done

# Validate Docker Compose file
if [ -f "$PROJECT_ROOT/docker-compose.production.yml" ]; then
    if docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" config > /dev/null 2>&1; then
        success "Docker Compose configuration is valid"
    else
        error "Docker Compose configuration is invalid"
        increment_error
    fi
fi

# =============================================================================
# Security Validation
# =============================================================================

log "🛡️ Phase 9: Security Validation"

# Check for default passwords
if grep -q "your-secure" "$PROJECT_ROOT/.env.production" 2>/dev/null; then
    error "Default placeholder passwords found in .env.production"
    increment_error
else
    success "No default placeholder passwords found"
fi

# Check for exposed secrets
if [ -f "$PROJECT_ROOT/.env" ]; then
    warning ".env file exists alongside .env.production (ensure it's not used in production)"
    increment_warning
fi

# =============================================================================
# Validation Summary
# =============================================================================

log "📊 Validation Summary"
log "===================="

if [ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ]; then
    success "🎉 All validations passed! Ready for production deployment."
    exit 0
elif [ $VALIDATION_ERRORS -eq 0 ]; then
    warning "⚠️ Validation completed with $VALIDATION_WARNINGS warning(s). Review warnings before deployment."
    exit 0
else
    error "❌ Validation failed with $VALIDATION_ERRORS error(s) and $VALIDATION_WARNINGS warning(s)."
    error "Please fix all errors before attempting production deployment."
    exit 1
fi
