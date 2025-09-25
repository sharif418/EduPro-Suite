#!/bin/bash

# =============================================================================
# EduPro Suite Health Check Script
# =============================================================================
# This script performs comprehensive health checks on all system components
# Usage: ./scripts/health-check.sh [--verbose] [--component=<component>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERBOSE=false
SPECIFIC_COMPONENT=""
BASE_URL="http://localhost:3000"
TIMEOUT=10
HEALTH_ENDPOINT="/api/health"
DETAILED_HEALTH_ENDPOINT="/api/health/detailed"
COMPOSE_FILE="docker-compose.production.yml"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --component=*)
            SPECIFIC_COMPONENT="${1#*=}"
            shift
            ;;
        --url=*)
            BASE_URL="${1#*=}"
            shift
            ;;
        --compose-file=*)
            COMPOSE_FILE="${1#*=}"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--verbose] [--component=<component>] [--url=<base_url>] [--compose-file=<file>]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v           Enable verbose output"
            echo "  --component=<name>      Check specific component only"
            echo "  --url=<url>            Base URL for health checks (default: http://localhost:3000)"
            echo "  --compose-file=<file>   Docker Compose file to use (default: docker-compose.production.yml)"
            echo "  --help, -h             Show this help message"
            echo ""
            echo "Available components:"
            echo "  database, redis, app, auth, upload, dashboard, all"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Health check functions
check_database() {
    log_info "Checking database connectivity..."
    
    # Check if database container is running (Docker)
    if command -v docker-compose &> /dev/null; then
        if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
            log_verbose "Database service is running"
        else
            log_warning "Database service not found or not running"
        fi
    fi
    
    # Check database connection via health endpoint
    local response=$(curl -s -w "%{http_code}" -o /tmp/db_health.json --max-time $TIMEOUT "$BASE_URL$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local db_status=$(cat /tmp/db_health.json | grep -o '"database":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [ "$db_status" = "healthy" ]; then
            log_success "Database is healthy"
            return 0
        else
            log_error "Database status: $db_status"
            return 1
        fi
    else
        log_error "Failed to check database health (HTTP: $response)"
        return 1
    fi
}

check_redis() {
    log_info "Checking Redis connectivity..."
    
    # Check if Redis container is running (Docker)
    if command -v docker-compose &> /dev/null; then
        if docker-compose -f "$COMPOSE_FILE" ps redis | grep -q "Up"; then
            log_verbose "Redis service is running"
        else
            log_warning "Redis service not found or not running"
        fi
    fi
    
    # Check Redis connection via detailed health endpoint
    local response=$(curl -s -w "%{http_code}" -o /tmp/redis_health.json --max-time $TIMEOUT "$BASE_URL$DETAILED_HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local redis_status=$(cat /tmp/redis_health.json | grep -o '"redis":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [ "$redis_status" = "healthy" ] || [ "$redis_status" = "unavailable" ]; then
            if [ "$redis_status" = "unavailable" ]; then
                log_warning "Redis is unavailable but application is running with fallback"
            else
                log_success "Redis is healthy"
            fi
            return 0
        else
            log_error "Redis status: $redis_status"
            return 1
        fi
    else
        log_error "Failed to check Redis health (HTTP: $response)"
        return 1
    fi
}

check_application() {
    log_info "Checking application health..."
    
    # Check if app container is running (Docker)
    if command -v docker-compose &> /dev/null; then
        if docker-compose -f "$COMPOSE_FILE" ps app | grep -q "Up"; then
            log_verbose "Application service is running"
        else
            log_warning "Application service not found or not running"
        fi
    fi
    
    # Check basic health endpoint
    local response=$(curl -s -w "%{http_code}" -o /tmp/app_health.json --max-time $TIMEOUT "$BASE_URL$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local app_status=$(cat /tmp/app_health.json | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [ "$app_status" = "healthy" ]; then
            log_success "Application is healthy"
            
            # Check detailed health information
            if [ "$VERBOSE" = true ]; then
                local uptime=$(cat /tmp/app_health.json | grep -o '"uptime":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "0")
                local memory=$(cat /tmp/app_health.json | grep -o '"memory":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "0")
                log_verbose "Application uptime: ${uptime}ms"
                log_verbose "Memory usage: ${memory} bytes"
            fi
            return 0
        else
            log_error "Application status: $app_status"
            return 1
        fi
    else
        log_error "Failed to check application health (HTTP: $response)"
        return 1
    fi
}

check_authentication() {
    log_info "Checking authentication system..."
    
    # Test login endpoint availability
    local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
    
    if [ "$response" = "400" ] || [ "$response" = "422" ]; then
        log_success "Authentication endpoint is responding (validation error expected)"
        return 0
    elif [ "$response" = "200" ]; then
        log_success "Authentication endpoint is responding"
        return 0
    else
        log_error "Authentication endpoint not responding (HTTP: $response)"
        return 1
    fi
}

check_file_upload() {
    log_info "Checking file upload functionality..."
    
    # Check upload endpoint availability
    local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT -X POST "$BASE_URL/api/upload" 2>/dev/null || echo "000")
    
    if [ "$response" = "401" ] || [ "$response" = "400" ]; then
        log_success "Upload endpoint is responding (authentication required)"
        return 0
    elif [ "$response" = "200" ]; then
        log_success "Upload endpoint is responding"
        return 0
    else
        log_error "Upload endpoint not responding (HTTP: $response)"
        return 1
    fi
}

check_dashboard_access() {
    log_info "Checking dashboard accessibility..."
    
    # Test different role dashboards
    local roles=("admin" "teacher" "student" "guardian")
    local success_count=0
    
    for role in "${roles[@]}"; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$BASE_URL/en/$role" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "302" ] || [ "$response" = "401" ]; then
            log_verbose "$role dashboard is accessible"
            ((success_count++))
        else
            log_warning "$role dashboard not accessible (HTTP: $response)"
        fi
    done
    
    if [ $success_count -eq ${#roles[@]} ]; then
        log_success "All dashboards are accessible"
        return 0
    elif [ $success_count -gt 0 ]; then
        log_warning "Some dashboards are accessible ($success_count/${#roles[@]})"
        return 0
    else
        log_error "No dashboards are accessible"
        return 1
    fi
}

check_websocket() {
    log_info "Checking WebSocket connectivity..."
    
    # Check if WebSocket endpoint is available
    local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$BASE_URL/api/socket" 2>/dev/null || echo "000")
    
    if [ "$response" = "400" ] || [ "$response" = "426" ]; then
        log_success "WebSocket endpoint is responding (upgrade required)"
        return 0
    elif [ "$response" = "200" ]; then
        log_success "WebSocket endpoint is responding"
        return 0
    else
        log_warning "WebSocket endpoint may not be available (HTTP: $response)"
        return 0  # Don't fail the health check for WebSocket issues
    fi
}

check_localization() {
    log_info "Checking localization support..."
    
    local locales=("en" "bn" "ar")
    local success_count=0
    
    for locale in "${locales[@]}"; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$BASE_URL/$locale" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "302" ]; then
            log_verbose "Locale $locale is accessible"
            ((success_count++))
        else
            log_warning "Locale $locale not accessible (HTTP: $response)"
        fi
    done
    
    if [ $success_count -eq ${#locales[@]} ]; then
        log_success "All locales are accessible"
        return 0
    elif [ $success_count -gt 0 ]; then
        log_warning "Some locales are accessible ($success_count/${#locales[@]})"
        return 0
    else
        log_error "No locales are accessible"
        return 1
    fi
}

# Main health check function
run_health_checks() {
    local failed_checks=0
    local total_checks=0
    
    log_info "Starting EduPro Suite health checks..."
    log_info "Base URL: $BASE_URL"
    echo ""
    
    # Define checks to run
    local checks=()
    
    if [ -z "$SPECIFIC_COMPONENT" ] || [ "$SPECIFIC_COMPONENT" = "all" ]; then
        checks=("database" "redis" "app" "auth" "upload" "dashboard" "websocket" "localization")
    else
        case "$SPECIFIC_COMPONENT" in
            "database"|"db")
                checks=("database")
                ;;
            "redis")
                checks=("redis")
                ;;
            "app"|"application")
                checks=("app")
                ;;
            "auth"|"authentication")
                checks=("auth")
                ;;
            "upload")
                checks=("upload")
                ;;
            "dashboard")
                checks=("dashboard")
                ;;
            "websocket"|"ws")
                checks=("websocket")
                ;;
            "localization"|"i18n")
                checks=("localization")
                ;;
            *)
                log_error "Unknown component: $SPECIFIC_COMPONENT"
                exit 1
                ;;
        esac
    fi
    
    # Run checks
    for check in "${checks[@]}"; do
        ((total_checks++))
        
        case "$check" in
            "database")
                if ! check_database; then
                    ((failed_checks++))
                fi
                ;;
            "redis")
                if ! check_redis; then
                    ((failed_checks++))
                fi
                ;;
            "app")
                if ! check_application; then
                    ((failed_checks++))
                fi
                ;;
            "auth")
                if ! check_authentication; then
                    ((failed_checks++))
                fi
                ;;
            "upload")
                if ! check_file_upload; then
                    ((failed_checks++))
                fi
                ;;
            "dashboard")
                if ! check_dashboard_access; then
                    ((failed_checks++))
                fi
                ;;
            "websocket")
                if ! check_websocket; then
                    ((failed_checks++))
                fi
                ;;
            "localization")
                if ! check_localization; then
                    ((failed_checks++))
                fi
                ;;
        esac
        
        echo ""
    done
    
    # Summary
    echo "=============================================="
    log_info "Health Check Summary"
    echo "=============================================="
    
    local passed_checks=$((total_checks - failed_checks))
    
    if [ $failed_checks -eq 0 ]; then
        log_success "All health checks passed ($passed_checks/$total_checks)"
        echo ""
        log_info "✅ EduPro Suite is healthy and ready for browser testing!"
        echo ""
        log_info "🔗 Access the application:"
        log_info "   Admin Dashboard: $BASE_URL/en/admin"
        log_info "   Teacher Dashboard: $BASE_URL/en/teacher"
        log_info "   Student Dashboard: $BASE_URL/en/student"
        log_info "   Guardian Dashboard: $BASE_URL/en/guardian"
        echo ""
        log_info "🔑 Default Login Credentials:"
        log_info "   SUPERADMIN: admin@edupro.com / admin123"
        log_info "   TEACHER: teacher@edupro.com / teacher123"
        log_info "   STUDENT: student@edupro.com / student123"
        log_info "   GUARDIAN: guardian@edupro.com / guardian123"
        
        exit 0
    else
        log_error "Health checks failed ($failed_checks/$total_checks)"
        echo ""
        log_error "❌ EduPro Suite has issues that need to be resolved"
        echo ""
        log_info "🔧 Troubleshooting steps:"
        log_info "   1. Check Docker containers: docker-compose -f $COMPOSE_FILE ps"
        log_info "   2. Check application logs: docker-compose -f $COMPOSE_FILE logs app"
        log_info "   3. Check database logs: docker-compose -f $COMPOSE_FILE logs postgres"
        log_info "   4. Verify environment variables in .env.production file"
        log_info "   5. Ensure all services are started: docker-compose -f $COMPOSE_FILE up -d"
        
        exit 1
    fi
}

# Cleanup function
cleanup() {
    rm -f /tmp/db_health.json /tmp/redis_health.json /tmp/app_health.json
}

# Set up cleanup on exit
trap cleanup EXIT

# Run the health checks
run_health_checks
