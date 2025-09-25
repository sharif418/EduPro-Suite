#!/bin/bash

# =============================================================================
# EduPro Suite Preflight Check Script
# =============================================================================
# This script verifies that all required tools are available on the host system
# before running deployment and validation scripts
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Global variables for tracking results
MISSING_TOOLS=()
OPTIONAL_MISSING=()
CRITICAL_MISSING=()

# Function to check if a command exists
check_command() {
    local cmd="$1"
    local description="$2"
    local critical="${3:-false}"
    local install_hint="$4"
    
    if command -v "$cmd" &> /dev/null; then
        log_success "✅ $cmd - $description"
        return 0
    else
        if [ "$critical" = "true" ]; then
            log_error "❌ $cmd - $description (CRITICAL)"
            CRITICAL_MISSING+=("$cmd")
        else
            log_warning "⚠️ $cmd - $description (OPTIONAL)"
            OPTIONAL_MISSING+=("$cmd")
        fi
        
        MISSING_TOOLS+=("$cmd")
        
        if [ -n "$install_hint" ]; then
            log_info "   Install with: $install_hint"
        fi
        
        return 1
    fi
}

# Function to check tool versions
check_versions() {
    log_info "🔍 Checking tool versions..."
    
    # Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "Node.js version: $NODE_VERSION"
        
        # Check if Node.js version is 18+
        NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_MAJOR" -ge 18 ]; then
            log_success "Node.js version is compatible (18+)"
        else
            log_error "Node.js version $NODE_VERSION is too old (requires 18+)"
            CRITICAL_MISSING+=("node-18+")
        fi
    fi
    
    # npm version
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_info "npm version: $NPM_VERSION"
    fi
    
    # Docker version
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        log_info "Docker version: $DOCKER_VERSION"
    fi
    
    # Docker Compose version
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
        log_info "Docker Compose version: $COMPOSE_VERSION"
    fi
}

# Main preflight check function
main() {
    log_info "🚀 Starting EduPro Suite Preflight Check"
    log_info "This script verifies all required tools are available"
    echo ""
    
    # Critical tools (required for deployment)
    log_info "🔧 Checking Critical Tools..."
    check_command "node" "Node.js runtime" "true" "curl -fsSL https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz"
    check_command "npm" "Node Package Manager" "true" "Included with Node.js"
    check_command "docker" "Docker container runtime" "true" "curl -fsSL https://get.docker.com | sh"
    check_command "docker-compose" "Docker Compose orchestration" "true" "pip install docker-compose"
    
    echo ""
    
    # JSON processing tools
    log_info "📄 Checking JSON Processing Tools..."
    check_command "jq" "JSON processor" "true" "apt-get install jq (Ubuntu/Debian) or yum install jq (RHEL/CentOS)"
    
    echo ""
    
    # Network tools
    log_info "🌐 Checking Network Tools..."
    check_command "curl" "HTTP client" "true" "apt-get install curl"
    if ! check_command "wget" "HTTP downloader" "false" "apt-get install wget"; then
        if ! command -v curl &> /dev/null; then
            log_error "Either curl or wget is required"
            CRITICAL_MISSING+=("curl-or-wget")
        fi
    fi
    
    echo ""
    
    # DNS tools
    log_info "🔍 Checking DNS Tools..."
    if ! check_command "nslookup" "DNS lookup tool" "false" "apt-get install dnsutils"; then
        check_command "dig" "DNS lookup tool (alternative)" "false" "apt-get install dnsutils"
    fi
    
    echo ""
    
    # Math tools
    log_info "🧮 Checking Math Tools..."
    check_command "bc" "Basic calculator" "true" "apt-get install bc"
    
    echo ""
    
    # SSL tools
    log_info "🔒 Checking SSL Tools..."
    check_command "openssl" "SSL/TLS toolkit" "true" "apt-get install openssl"
    
    echo ""
    
    # Optional development tools
    log_info "🛠️ Checking Optional Development Tools..."
    check_command "git" "Version control" "false" "apt-get install git"
    check_command "vim" "Text editor" "false" "apt-get install vim"
    check_command "nano" "Text editor (alternative)" "false" "apt-get install nano"
    
    echo ""
    
    # Check tool versions
    check_versions
    
    echo ""
    
    # Summary
    log_info "📊 Preflight Check Summary"
    log_info "========================="
    
    if [ ${#CRITICAL_MISSING[@]} -eq 0 ]; then
        log_success "🎉 All critical tools are available!"
        
        if [ ${#OPTIONAL_MISSING[@]} -gt 0 ]; then
            log_warning "⚠️ Some optional tools are missing:"
            for tool in "${OPTIONAL_MISSING[@]}"; do
                log_warning "   - $tool"
            done
            log_info "Optional tools can be installed later if needed"
        fi
        
        log_success "✅ System is ready for EduPro Suite deployment"
        return 0
    else
        log_error "❌ Critical tools are missing:"
        for tool in "${CRITICAL_MISSING[@]}"; do
            log_error "   - $tool"
        done
        
        echo ""
        log_error "Please install the missing critical tools before proceeding"
        log_info "Installation commands are provided above for each missing tool"
        
        echo ""
        log_info "Quick installation for Ubuntu/Debian:"
        log_info "sudo apt-get update && sudo apt-get install -y jq curl wget bc openssl dnsutils"
        
        echo ""
        log_info "For Docker installation:"
        log_info "curl -fsSL https://get.docker.com | sh"
        log_info "sudo pip install docker-compose"
        
        return 1
    fi
}

# Execute main function
main "$@"
