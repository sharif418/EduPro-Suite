#!/bin/bash

# =============================================================================
# EduPro Suite Permission Fix Script
# =============================================================================
# This script fixes file and directory permissions for production deployment
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/permissions_$(date +%Y%m%d_%H%M%S).log"

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

log "🔧 Starting EduPro Suite Permission Fix"
log "📁 Project Root: $PROJECT_ROOT"
log "📝 Log File: $LOG_FILE"

# =============================================================================
# Script Permissions
# =============================================================================

log "📜 Phase 1: Fixing Script Permissions"

SCRIPTS_DIR="$PROJECT_ROOT/scripts"
if [ -d "$SCRIPTS_DIR" ]; then
    for script in "$SCRIPTS_DIR"/*.sh; do
        if [ -f "$script" ]; then
            chmod +x "$script"
            success "Made $(basename "$script") executable"
        fi
    done
else
    warning "Scripts directory not found"
fi

# Make deploy.sh executable
if [ -f "$PROJECT_ROOT/deploy.sh" ]; then
    chmod +x "$PROJECT_ROOT/deploy.sh"
    success "Made deploy.sh executable"
fi

# =============================================================================
# Directory Permissions
# =============================================================================

log "📁 Phase 2: Fixing Directory Permissions"

# Create and fix upload directories
UPLOAD_DIRS=(
    "public/uploads"
    "public/uploads/avatars"
    "public/uploads/documents"
    "public/uploads/images"
    "public/uploads/temp"
)

for dir in "${UPLOAD_DIRS[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$dir"
    if [ ! -d "$FULL_PATH" ]; then
        mkdir -p "$FULL_PATH"
        success "Created directory: $dir"
    fi
    
    chmod 755 "$FULL_PATH"
    success "Set permissions for: $dir"
done

# Create and fix log directories
LOG_DIRS=(
    "logs"
    "backups"
    "data"
    "data/uploads"
    "data/logs"
    "data/postgres"
    "data/redis"
    "data/prometheus"
    "data/grafana"
    "data/loki"
    "data/nginx-logs"
    "data/backups"
)

for dir in "${LOG_DIRS[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$dir"
    if [ ! -d "$FULL_PATH" ]; then
        mkdir -p "$FULL_PATH"
        success "Created directory: $dir"
    fi
    
    chmod 755 "$FULL_PATH"
    success "Set permissions for: $dir"
done

# =============================================================================
# SSL Certificate Permissions
# =============================================================================

log "🔒 Phase 3: Fixing SSL Certificate Permissions"

SSL_DIR="$PROJECT_ROOT/ssl"
if [ -d "$SSL_DIR" ]; then
    # Set directory permissions
    chmod 700 "$SSL_DIR"
    success "Set SSL directory permissions"
    
    # Set certificate file permissions
    for cert_file in "$SSL_DIR"/*.pem "$SSL_DIR"/*.crt "$SSL_DIR"/*.key; do
        if [ -f "$cert_file" ]; then
            if [[ "$cert_file" == *".key" ]]; then
                # Private keys should be more restrictive
                chmod 600 "$cert_file"
                success "Set private key permissions: $(basename "$cert_file")"
            else
                # Certificates can be slightly less restrictive
                chmod 644 "$cert_file"
                success "Set certificate permissions: $(basename "$cert_file")"
            fi
        fi
    done
else
    warning "SSL directory not found - will be created during deployment if needed"
fi

# =============================================================================
# Configuration File Permissions
# =============================================================================

log "⚙️ Phase 4: Fixing Configuration File Permissions"

# Environment files should be restricted
ENV_FILES=(
    ".env"
    ".env.production"
    ".env.local"
    ".env.development"
)

for env_file in "${ENV_FILES[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$env_file"
    if [ -f "$FULL_PATH" ]; then
        chmod 600 "$FULL_PATH"
        success "Set restricted permissions for: $env_file"
    fi
done

# Configuration files should be readable
CONFIG_FILES=(
    "docker-compose.yml"
    "docker-compose.production.yml"
    "docker-compose.override.yml"
    "Dockerfile"
    "next.config.ts"
    "package.json"
    "tsconfig.json"
    "tailwind.config.ts"
    "postcss.config.mjs"
)

for config_file in "${CONFIG_FILES[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$config_file"
    if [ -f "$FULL_PATH" ]; then
        chmod 644 "$FULL_PATH"
        success "Set permissions for: $config_file"
    fi
done

# =============================================================================
# Monitoring Configuration Permissions
# =============================================================================

log "📊 Phase 5: Fixing Monitoring Configuration Permissions"

MONITORING_DIR="$PROJECT_ROOT/monitoring"
if [ -d "$MONITORING_DIR" ]; then
    # Set directory permissions
    find "$MONITORING_DIR" -type d -exec chmod 755 {} \;
    success "Set monitoring directory permissions"
    
    # Set file permissions
    find "$MONITORING_DIR" -type f -exec chmod 644 {} \;
    success "Set monitoring file permissions"
else
    warning "Monitoring directory not found"
fi

# =============================================================================
# Nginx Configuration Permissions
# =============================================================================

log "🌐 Phase 6: Fixing Nginx Configuration Permissions"

NGINX_DIR="$PROJECT_ROOT/nginx"
if [ -d "$NGINX_DIR" ]; then
    # Set directory permissions
    chmod 755 "$NGINX_DIR"
    success "Set nginx directory permissions"
    
    # Set configuration file permissions
    for nginx_file in "$NGINX_DIR"/*.conf; do
        if [ -f "$nginx_file" ]; then
            chmod 644 "$nginx_file"
            success "Set permissions for: $(basename "$nginx_file")"
        fi
    done
else
    warning "Nginx directory not found"
fi

# =============================================================================
# Database and Prisma Permissions
# =============================================================================

log "🗄️ Phase 7: Fixing Database and Prisma Permissions"

PRISMA_DIR="$PROJECT_ROOT/prisma"
if [ -d "$PRISMA_DIR" ]; then
    # Set directory permissions
    chmod 755 "$PRISMA_DIR"
    success "Set prisma directory permissions"
    
    # Set file permissions
    find "$PRISMA_DIR" -type f -exec chmod 644 {} \;
    success "Set prisma file permissions"
    
    # Make migration scripts executable if they exist
    if [ -d "$PRISMA_DIR/migrations" ]; then
        find "$PRISMA_DIR/migrations" -name "*.sql" -exec chmod 644 {} \;
        success "Set migration file permissions"
    fi
else
    warning "Prisma directory not found"
fi

# =============================================================================
# Node.js and Package Permissions (Enhanced for Dependency Synchronization)
# =============================================================================

log "📦 Phase 8: Fixing Node.js and Package Permissions"

# Set package.json and lock file permissions
NODE_FILES=(
    "package.json"
    "package-lock.json"
    "yarn.lock"
    "pnpm-lock.yaml"
)

for node_file in "${NODE_FILES[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$node_file"
    if [ -f "$FULL_PATH" ]; then
        chmod 644 "$FULL_PATH"
        success "Set permissions for: $node_file"
    fi
done

# Fix node_modules permissions if it exists
NODE_MODULES_DIR="$PROJECT_ROOT/node_modules"
if [ -d "$NODE_MODULES_DIR" ]; then
    warning "Fixing node_modules permissions (this may take a while)..."
    find "$NODE_MODULES_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
    find "$NODE_MODULES_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
    
    # Make executable files in node_modules/.bin executable
    BIN_DIR="$NODE_MODULES_DIR/.bin"
    if [ -d "$BIN_DIR" ]; then
        chmod +x "$BIN_DIR"/* 2>/dev/null || true
        success "Set executable permissions for node_modules/.bin"
    fi
    
    # Fix permissions for critical dependency directories
    CRITICAL_DEPS=(
        "ioredis"
        "sharp"
        "socket.io"
        "socket.io-client"
        "@prisma/client"
        "prisma"
        "next"
        "react"
        "react-dom"
    )
    
    log "🔧 Fixing permissions for critical dependencies..."
    for dep in "${CRITICAL_DEPS[@]}"; do
        DEP_PATH="$NODE_MODULES_DIR/$dep"
        if [ -d "$DEP_PATH" ]; then
            find "$DEP_PATH" -type d -exec chmod 755 {} \; 2>/dev/null || true
            find "$DEP_PATH" -type f -exec chmod 644 {} \; 2>/dev/null || true
            success "Fixed permissions for critical dependency: $dep"
        fi
    done
    
    # Fix permissions for Prisma generated client
    PRISMA_CLIENT_DIR="$NODE_MODULES_DIR/.prisma"
    if [ -d "$PRISMA_CLIENT_DIR" ]; then
        find "$PRISMA_CLIENT_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
        find "$PRISMA_CLIENT_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
        success "Fixed permissions for Prisma generated client"
    fi
    
    success "Fixed node_modules permissions"
fi

# =============================================================================
# Build Artifacts Permissions
# =============================================================================

log "🏗️ Phase 8.5: Fixing Build Artifacts Permissions"

# Fix .next directory permissions
NEXT_DIR="$PROJECT_ROOT/.next"
if [ -d "$NEXT_DIR" ]; then
    warning "Fixing .next build directory permissions..."
    find "$NEXT_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
    find "$NEXT_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
    success "Fixed .next directory permissions"
fi

# Fix TypeScript build cache permissions
TS_BUILD_INFO="$PROJECT_ROOT/tsconfig.tsbuildinfo"
if [ -f "$TS_BUILD_INFO" ]; then
    chmod 644 "$TS_BUILD_INFO"
    success "Fixed TypeScript build info permissions"
fi

# Fix npm cache directory permissions if it exists
NPM_CACHE_DIR="$PROJECT_ROOT/.npm-cache"
if [ -d "$NPM_CACHE_DIR" ]; then
    find "$NPM_CACHE_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
    find "$NPM_CACHE_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
    success "Fixed npm cache directory permissions"
fi

# =============================================================================
# Dependency Synchronization Script Permissions
# =============================================================================

log "🔄 Phase 8.6: Fixing Dependency Synchronization Script Permissions"

# Ensure dependency synchronization scripts are executable
DEPENDENCY_SCRIPTS=(
    "scripts/dependency-sync.sh"
    "scripts/validate-dependencies.sh"
)

for script in "${DEPENDENCY_SCRIPTS[@]}"; do
    SCRIPT_PATH="$PROJECT_ROOT/$script"
    if [ -f "$SCRIPT_PATH" ]; then
        chmod +x "$SCRIPT_PATH"
        success "Made dependency script executable: $(basename "$script")"
    else
        warning "Dependency script not found: $script"
    fi
done

# =============================================================================
# Test and Documentation Permissions
# =============================================================================

log "📚 Phase 9: Fixing Test and Documentation Permissions"

# Set test directory permissions
TEST_DIRS=(
    "tests"
    "__tests__"
    "test"
)

for test_dir in "${TEST_DIRS[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$test_dir"
    if [ -d "$FULL_PATH" ]; then
        find "$FULL_PATH" -type d -exec chmod 755 {} \;
        find "$FULL_PATH" -type f -exec chmod 644 {} \;
        success "Set permissions for: $test_dir"
    fi
done

# Set documentation file permissions
DOC_FILES=(
    "README.md"
    "CHANGELOG.md"
    "LICENSE"
    "CONTRIBUTING.md"
    "*.md"
)

for doc_pattern in "${DOC_FILES[@]}"; do
    for doc_file in $PROJECT_ROOT/$doc_pattern; do
        if [ -f "$doc_file" ]; then
            chmod 644 "$doc_file"
            success "Set permissions for: $(basename "$doc_file")"
        fi
    done
done

# =============================================================================
# Docker-specific Permissions
# =============================================================================

log "🐳 Phase 10: Fixing Docker-specific Permissions"

# Ensure Docker-related files have correct permissions
DOCKER_FILES=(
    "Dockerfile"
    "docker-compose.yml"
    "docker-compose.production.yml"
    "docker-compose.override.yml"
    ".dockerignore"
)

for docker_file in "${DOCKER_FILES[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$docker_file"
    if [ -f "$FULL_PATH" ]; then
        chmod 644 "$FULL_PATH"
        success "Set permissions for: $docker_file"
    fi
done

# =============================================================================
# Final Ownership Fix (if running as root)
# =============================================================================

log "👤 Phase 11: Final Ownership Check"

# Check if running as root and fix ownership
if [ "$EUID" -eq 0 ]; then
    warning "Running as root - fixing ownership to user 1000:1000"
    
    # Change ownership of critical directories to user 1000 (typical Docker user)
    OWNERSHIP_DIRS=(
        "public/uploads"
        "logs"
        "backups"
        "data"
    )
    
    for dir in "${OWNERSHIP_DIRS[@]}"; do
        FULL_PATH="$PROJECT_ROOT/$dir"
        if [ -d "$FULL_PATH" ]; then
            chown -R 1000:1000 "$FULL_PATH" 2>/dev/null || true
            success "Changed ownership for: $dir"
        fi
    done
else
    success "Running as non-root user - ownership is appropriate"
fi

# =============================================================================
# Verification
# =============================================================================

log "✅ Phase 12: Permission Verification"

# Verify critical permissions
CRITICAL_CHECKS=(
    "$PROJECT_ROOT/deploy.sh:executable"
    "$PROJECT_ROOT/scripts/production-deploy.sh:executable"
    "$PROJECT_ROOT/scripts/validate-production.sh:executable"
    "$PROJECT_ROOT/public/uploads:writable"
    "$PROJECT_ROOT/logs:writable"
)

VERIFICATION_ERRORS=0

for check in "${CRITICAL_CHECKS[@]}"; do
    IFS=':' read -r file_path check_type <<< "$check"
    
    if [ ! -e "$file_path" ]; then
        warning "File/directory does not exist: $file_path"
        continue
    fi
    
    case $check_type in
        "executable")
            if [ -x "$file_path" ]; then
                success "✅ $file_path is executable"
            else
                error "❌ $file_path is not executable"
                ((VERIFICATION_ERRORS++))
            fi
            ;;
        "writable")
            if [ -w "$file_path" ]; then
                success "✅ $file_path is writable"
            else
                error "❌ $file_path is not writable"
                ((VERIFICATION_ERRORS++))
            fi
            ;;
    esac
done

# =============================================================================
# Summary
# =============================================================================

log "📊 Permission Fix Summary"
log "========================="

if [ $VERIFICATION_ERRORS -eq 0 ]; then
    success "🎉 All permissions have been fixed successfully!"
    success "The system is ready for production deployment."
else
    error "❌ $VERIFICATION_ERRORS permission issues remain."
    error "Please review and fix the remaining issues."
    exit 1
fi

log "✅ Permission fix completed successfully!"
