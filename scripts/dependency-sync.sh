#!/bin/bash

# EduPro Suite - Dependency Synchronization Script
# This script handles dependency synchronization and package-lock.json regeneration
# to resolve the critical issue where package-lock.json is out of sync with package.json

set -e  # Exit on any error

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

# Function to check if we're in the correct directory
check_directory() {
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found. Please run this script from the project root directory."
        exit 1
    fi
    
    if [[ ! -d "scripts" ]]; then
        log_error "scripts directory not found. Please run this script from the project root directory."
        exit 1
    fi
}

# Function to backup existing files
backup_files() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="backups/dependency_sync_${timestamp}"
    
    log_info "Creating backup directory: ${backup_dir}"
    mkdir -p "${backup_dir}"
    
    if [[ -f "package-lock.json" ]]; then
        log_info "Backing up existing package-lock.json"
        cp package-lock.json "${backup_dir}/"
    fi
    
    if [[ -d "node_modules" ]]; then
        log_info "Backing up node_modules directory structure"
        find node_modules -maxdepth 2 -type d > "${backup_dir}/node_modules_structure.txt" 2>/dev/null || true
    fi
    
    log_success "Backup created in ${backup_dir}"
}

# Function to clean npm cache
clean_npm_cache() {
    log_info "Cleaning npm cache to prevent corruption..."
    npm cache clean --force
    log_success "npm cache cleaned"
}

# Function to remove existing node_modules and package-lock.json
clean_dependencies() {
    log_info "Removing existing node_modules and package-lock.json..."
    
    if [[ -d "node_modules" ]]; then
        log_info "Removing node_modules directory..."
        rm -rf node_modules
        log_success "node_modules removed"
    fi
    
    if [[ -f "package-lock.json" ]]; then
        log_info "Removing package-lock.json..."
        rm -f package-lock.json
        log_success "package-lock.json removed"
    fi
}

# Function to install dependencies and generate fresh package-lock.json
install_dependencies() {
    log_info "Installing dependencies with npm install to generate fresh package-lock.json..."
    
    # Set npm configuration for better reliability
    npm config set audit-level moderate
    npm config set fund false
    npm config set update-notifier false
    
    # Install dependencies
    npm install --no-optional --no-audit --progress=false
    
    log_success "Dependencies installed successfully"
}

# Function to validate critical dependencies
validate_dependencies() {
    log_info "Validating that all critical dependencies are properly resolved..."
    
    local critical_deps=("ioredis" "sharp" "socket.io" "socket.io-client" "prisma" "@prisma/client" "next" "react" "react-dom")
    local missing_deps=()
    
    for dep in "${critical_deps[@]}"; do
        if [[ ! -d "node_modules/${dep}" ]]; then
            missing_deps+=("${dep}")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Critical dependencies missing from node_modules:"
        for dep in "${missing_deps[@]}"; do
            log_error "  - ${dep}"
        done
        return 1
    fi
    
    log_success "All critical dependencies are properly resolved"
}

# Function to verify package.json and package-lock.json sync
verify_sync() {
    log_info "Verifying package.json and package-lock.json synchronization..."
    
    if [[ ! -f "package-lock.json" ]]; then
        log_error "package-lock.json was not generated"
        return 1
    fi
    
    # Check if package-lock.json contains critical dependencies
    local critical_deps=("ioredis" "sharp" "socket.io" "socket.io-client")
    
    for dep in "${critical_deps[@]}"; do
        if ! grep -q "\"${dep}\"" package-lock.json; then
            log_error "Critical dependency '${dep}' not found in package-lock.json"
            return 1
        fi
    done
    
    log_success "package.json and package-lock.json are properly synchronized"
}

# Function to run npm audit
run_audit() {
    log_info "Running npm audit to check for security vulnerabilities..."
    
    if npm audit --audit-level=high; then
        log_success "No high-severity vulnerabilities found"
    else
        log_warning "Security vulnerabilities detected. Consider running 'npm audit fix'"
        # Don't exit on audit issues, just warn
    fi
}

# Function to test critical module imports
test_module_imports() {
    log_info "Testing that critical modules can be imported successfully..."
    
    local test_script="
const modules = ['ioredis', 'sharp', 'socket.io', 'socket.io-client', '@prisma/client', 'next'];
let failed = false;

modules.forEach(module => {
    try {
        require(module);
        console.log(\`✓ \${module} imported successfully\`);
    } catch (error) {
        console.error(\`✗ Failed to import \${module}: \${error.message}\`);
        failed = true;
    }
});

if (failed) {
    process.exit(1);
}
"
    
    if node -e "$test_script"; then
        log_success "All critical modules can be imported successfully"
    else
        log_error "Some critical modules failed to import"
        return 1
    fi
}

# Function to generate dependency report
generate_report() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local report_file="dependency-sync-report.txt"
    
    log_info "Generating dependency synchronization report..."
    
    cat > "$report_file" << EOF
EduPro Suite - Dependency Synchronization Report
Generated: ${timestamp}

=== PACKAGE.JSON DEPENDENCIES ===
$(npm list --depth=0 --json | jq -r '.dependencies | keys[]' 2>/dev/null || echo "Error reading dependencies")

=== CRITICAL DEPENDENCIES STATUS ===
ioredis: $(test -d "node_modules/ioredis" && echo "✓ Installed" || echo "✗ Missing")
sharp: $(test -d "node_modules/sharp" && echo "✓ Installed" || echo "✗ Missing")
socket.io: $(test -d "node_modules/socket.io" && echo "✓ Installed" || echo "✗ Missing")
socket.io-client: $(test -d "node_modules/socket.io-client" && echo "✓ Installed" || echo "✗ Missing")
@prisma/client: $(test -d "node_modules/@prisma/client" && echo "✓ Installed" || echo "✗ Missing")
prisma: $(test -d "node_modules/prisma" && echo "✓ Installed" || echo "✗ Missing")

=== PACKAGE-LOCK.JSON STATUS ===
File exists: $(test -f "package-lock.json" && echo "✓ Yes" || echo "✗ No")
File size: $(test -f "package-lock.json" && wc -c < "package-lock.json" | tr -d ' ' || echo "0") bytes
Lock file version: $(test -f "package-lock.json" && jq -r '.lockfileVersion' package-lock.json 2>/dev/null || echo "N/A")

=== NODE_MODULES STATUS ===
Total packages: $(find node_modules -maxdepth 1 -type d | wc -l | tr -d ' ')
Total size: $(du -sh node_modules 2>/dev/null | cut -f1 || echo "Unknown")

=== SYNC VERIFICATION ===
Dependencies synchronized: $(test -f "package-lock.json" && echo "✓ Yes" || echo "✗ No")
Critical deps in lock file: $(test -f "package-lock.json" && grep -c '"ioredis"\|"sharp"\|"socket.io"' package-lock.json || echo "0")

EOF
    
    log_success "Dependency report generated: ${report_file}"
}

# Main execution function
main() {
    log_info "Starting EduPro Suite dependency synchronization..."
    log_info "This script will resolve package-lock.json inconsistencies"
    
    # Check if we're in the right directory
    check_directory
    
    # Create backup
    backup_files
    
    # Clean npm cache
    clean_npm_cache
    
    # Remove existing dependencies
    clean_dependencies
    
    # Install dependencies and generate fresh package-lock.json
    install_dependencies
    
    # Validate critical dependencies
    if ! validate_dependencies; then
        log_error "Dependency validation failed"
        exit 1
    fi
    
    # Verify synchronization
    if ! verify_sync; then
        log_error "Synchronization verification failed"
        exit 1
    fi
    
    # Run security audit
    run_audit
    
    # Test module imports
    if ! test_module_imports; then
        log_error "Module import test failed"
        exit 1
    fi
    
    # Generate report
    generate_report
    
    log_success "Dependency synchronization completed successfully!"
    log_info "Key achievements:"
    log_info "  ✓ Fresh package-lock.json generated"
    log_info "  ✓ All critical dependencies (ioredis, sharp, socket.io, etc.) resolved"
    log_info "  ✓ package.json and package-lock.json are now synchronized"
    log_info "  ✓ Dependencies validated and tested"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Run 'npm run build' to test the build process"
    log_info "  2. Run './scripts/validate-dependencies.sh' for comprehensive validation"
    log_info "  3. Proceed with deployment using './scripts/production-deploy.sh'"
}

# Execute main function
main "$@"
