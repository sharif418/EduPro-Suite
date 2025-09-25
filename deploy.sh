#!/bin/bash

# =============================================================================
# EduPro Suite Master Deployment Script
# =============================================================================
# This script orchestrates the complete production deployment process
# including validation, permission fixes, and deployment
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/deployment_master_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs"

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

# Parse command line arguments
SKIP_VALIDATION=false
SKIP_PERMISSIONS=false
FORCE_DEPLOY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --skip-permissions)
            SKIP_PERMISSIONS=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --help)
            echo "EduPro Suite Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-validation   Skip pre-deployment validation"
            echo "  --skip-permissions  Skip permission fixes"
            echo "  --force            Force deployment even with warnings"
            echo "  --help             Show this help message"
            echo ""
            echo "Environment Detection:"
            echo "  The script automatically detects the environment and uses"
            echo "  appropriate configuration files (.env.production for production)"
            echo ""
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

log "🚀 Starting EduPro Suite Master Deployment Process"
log "=================================================="
log "📁 Project Directory: $SCRIPT_DIR"
log "📝 Master Log File: $LOG_FILE"
log "⚙️ Skip Validation: $SKIP_VALIDATION"
log "🔧 Skip Permissions: $SKIP_PERMISSIONS"
log "💪 Force Deploy: $FORCE_DEPLOY"

# Change to the correct directory
cd "$SCRIPT_DIR"

# =============================================================================
# Phase 1: Environment Detection
# =============================================================================

log "🔍 Phase 1: Environment Detection"

# Detect environment based on available files and settings
if [ -f ".env.production" ]; then
    DETECTED_ENV="production"
    ENV_FILE=".env.production"
    log "Detected environment: PRODUCTION"
elif [ -f ".env" ]; then
    # Check NODE_ENV in .env file
    if grep -q "NODE_ENV=production" ".env" 2>/dev/null; then
        DETECTED_ENV="production"
        ENV_FILE=".env"
        warning "Using .env file for production (recommended: use .env.production)"
    else
        DETECTED_ENV="development"
        ENV_FILE=".env"
        log "Detected environment: DEVELOPMENT"
    fi
else
    error "No environment file found (.env or .env.production)"
    exit 1
fi

success "Environment: $DETECTED_ENV"
success "Environment file: $ENV_FILE"

# =============================================================================
# Phase 2: Script Preparation
# =============================================================================

log "📜 Phase 2: Script Preparation"

# Make all scripts executable
SCRIPTS=(
    "scripts/validate-production.sh"
    "scripts/fix-permissions.sh"
    "scripts/production-deploy.sh"
    "scripts/health-check.sh"
    "scripts/docker-entrypoint.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        success "Made $script executable"
    else
        warning "$script not found"
    fi
done

# =============================================================================
# Phase 3: Pre-deployment Validation
# =============================================================================

if [ "$SKIP_VALIDATION" = false ]; then
    log "🔍 Phase 3: Pre-deployment Validation"
    
    if [ -f "scripts/validate-production.sh" ]; then
        log "Running production validation..."
        
        if ./scripts/validate-production.sh; then
            success "✅ Pre-deployment validation passed"
        else
            VALIDATION_EXIT_CODE=$?
            if [ "$FORCE_DEPLOY" = true ]; then
                warning "⚠️ Validation failed but continuing due to --force flag"
            else
                error "❌ Pre-deployment validation failed (exit code: $VALIDATION_EXIT_CODE)"
                error "Fix validation issues or use --force to override"
                exit $VALIDATION_EXIT_CODE
            fi
        fi
    else
        warning "Validation script not found, skipping validation"
    fi
else
    warning "⏭️ Skipping pre-deployment validation (--skip-validation flag)"
fi

# =============================================================================
# Phase 4: Permission Fixes
# =============================================================================

if [ "$SKIP_PERMISSIONS" = false ]; then
    log "🔧 Phase 4: Permission Fixes"
    
    if [ -f "scripts/fix-permissions.sh" ]; then
        log "Fixing file and directory permissions..."
        
        if ./scripts/fix-permissions.sh; then
            success "✅ Permission fixes completed"
        else
            PERMISSIONS_EXIT_CODE=$?
            if [ "$FORCE_DEPLOY" = true ]; then
                warning "⚠️ Permission fixes failed but continuing due to --force flag"
            else
                error "❌ Permission fixes failed (exit code: $PERMISSIONS_EXIT_CODE)"
                error "Fix permission issues or use --force to override"
                exit $PERMISSIONS_EXIT_CODE
            fi
        fi
    else
        warning "Permission fix script not found, skipping permission fixes"
    fi
else
    warning "⏭️ Skipping permission fixes (--skip-permissions flag)"
fi

# =============================================================================
# Phase 5: Production Deployment
# =============================================================================

log "🚀 Phase 5: Production Deployment"

if [ -f "scripts/production-deploy.sh" ]; then
    log "Starting production deployment..."
    
    # Pass through any additional arguments to the production deploy script
    DEPLOY_ARGS=()
    
    if [ "$FORCE_DEPLOY" = true ]; then
        DEPLOY_ARGS+=("--no-rollback")
    fi
    
    if ./scripts/production-deploy.sh "${DEPLOY_ARGS[@]}"; then
        success "✅ Production deployment completed successfully"
    else
        DEPLOY_EXIT_CODE=$?
        error "❌ Production deployment failed (exit code: $DEPLOY_EXIT_CODE)"
        error "Check deployment logs for details"
        exit $DEPLOY_EXIT_CODE
    fi
else
    error "Production deployment script not found"
    exit 1
fi

# =============================================================================
# Phase 6: Post-deployment Verification
# =============================================================================

log "🏥 Phase 6: Post-deployment Verification"

# Wait a moment for services to stabilize
log "Waiting for services to stabilize..."
sleep 10

# Run health check if available
if [ -f "scripts/health-check.sh" ]; then
    log "Running post-deployment health check..."
    
    if ./scripts/health-check.sh; then
        success "✅ Post-deployment health check passed"
    else
        warning "⚠️ Post-deployment health check failed"
        warning "Services may still be starting up"
    fi
else
    warning "Health check script not found, skipping health verification"
fi

# =============================================================================
# Deployment Summary
# =============================================================================

log "📊 Deployment Summary"
log "===================="

success "🎉 EduPro Suite deployment completed successfully!"

# Load environment variables to show deployment info
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    
    log "🔗 Deployment Information:"
    log "   • Environment: $DETECTED_ENV"
    log "   • Application URL: ${NEXTAUTH_URL:-Not configured}"
    log "   • Environment File: $ENV_FILE"
    log "   • Deployment Time: $(date)"
    log "   • Log File: $LOG_FILE"
fi

log "📋 Next Steps:"
log "   1. Monitor application logs: docker-compose logs -f"
log "   2. Check system metrics: docker stats"
log "   3. Verify application functionality through browser testing"
log "   4. Monitor error rates and performance metrics"
log "   5. Set up monitoring alerts and notifications"

log "🛠️ Useful Commands:"
log "   • View logs: docker-compose -f docker-compose.production.yml logs -f"
log "   • Check status: docker-compose -f docker-compose.production.yml ps"
log "   • Restart services: docker-compose -f docker-compose.production.yml restart"
log "   • Stop services: docker-compose -f docker-compose.production.yml down"

success "✅ Master deployment process completed successfully!"

log "=================================================="
log "🎯 EduPro Suite is now deployed and ready for use!"
log "=================================================="
