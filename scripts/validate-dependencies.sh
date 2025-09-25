#!/bin/bash

# EduPro Suite - Comprehensive Dependency Validation Script
# This script validates that all dependencies are properly configured and synchronized
# before deployment to catch dependency issues early

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
}

# Global variables for tracking validation results
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0
VALIDATION_CHECKS=0

# Function to increment validation counters
increment_check() {
    ((VALIDATION_CHECKS++))
}

increment_error() {
    ((VALIDATION_ERRORS++))
    increment_check
}

increment_warning() {
    ((VALIDATION_WARNINGS++))
    increment_check
}

increment_success() {
    increment_check
}

# Function to check if we're in the correct directory
check_directory() {
    log_section "Checking Project Directory"
    
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found. Please run this script from the project root directory."
        increment_error
        return 1
    fi
    
    if [[ ! -d "scripts" ]]; then
        log_error "scripts directory not found. Please run this script from the project root directory."
        increment_error
        return 1
    fi
    
    log_success "Project directory structure is valid"
    increment_success
}

# Function to verify package.json and package-lock.json synchronization
verify_package_sync() {
    log_section "Verifying Package Synchronization"
    
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found"
        increment_error
        return 1
    fi
    
    if [[ ! -f "package-lock.json" ]]; then
        log_error "package-lock.json not found - dependencies are not locked"
        log_error "Run './scripts/dependency-sync.sh' to generate package-lock.json"
        increment_error
        return 1
    fi
    
    # Check if package-lock.json is newer than package.json
    if [[ "package.json" -nt "package-lock.json" ]]; then
        log_warning "package.json is newer than package-lock.json"
        log_warning "Consider running './scripts/dependency-sync.sh' to update lock file"
        increment_warning
    fi
    
    # Verify lock file version
    local lock_version=$(jq -r '.lockfileVersion' package-lock.json 2>/dev/null || echo "unknown")
    if [[ "$lock_version" != "3" ]]; then
        log_warning "package-lock.json version is $lock_version, expected version 3"
        increment_warning
    fi
    
    log_success "Package files synchronization verified"
    increment_success
}

# Function to check critical dependencies in package.json
check_package_json_dependencies() {
    log_section "Checking package.json Dependencies"
    
    local critical_deps=("ioredis" "sharp" "socket.io" "socket.io-client" "prisma" "@prisma/client" "next" "react" "react-dom" "bcryptjs" "jsonwebtoken" "nodemailer" "web-push")
    local missing_deps=()
    
    for dep in "${critical_deps[@]}"; do
        if ! jq -e ".dependencies.\"$dep\"" package.json > /dev/null 2>&1; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Critical dependencies missing from package.json:"
        for dep in "${missing_deps[@]}"; do
            log_error "  - $dep"
        done
        increment_error
        return 1
    fi
    
    log_success "All critical dependencies found in package.json"
    increment_success
}

# Function to check critical dependencies in package-lock.json
check_package_lock_dependencies() {
    log_section "Checking package-lock.json Dependencies"
    
    local critical_deps=("ioredis" "sharp" "socket.io" "socket.io-client" "prisma" "@prisma/client" "next" "react" "react-dom")
    local missing_deps=()
    
    for dep in "${critical_deps[@]}"; do
        if ! grep -q "\"$dep\"" package-lock.json; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Critical dependencies missing from package-lock.json:"
        for dep in "${missing_deps[@]}"; do
            log_error "  - $dep"
        done
        log_error "Run './scripts/dependency-sync.sh' to regenerate package-lock.json"
        increment_error
        return 1
    fi
    
    log_success "All critical dependencies found in package-lock.json"
    increment_success
}

# Function to validate node_modules directory
validate_node_modules() {
    log_section "Validating node_modules Directory"
    
    if [[ ! -d "node_modules" ]]; then
        log_error "node_modules directory not found"
        log_error "Run 'npm install' or './scripts/dependency-sync.sh' to install dependencies"
        increment_error
        return 1
    fi
    
    local critical_deps=("ioredis" "sharp" "socket.io" "socket.io-client" "prisma" "@prisma/client" "next" "react" "react-dom")
    local missing_deps=()
    
    for dep in "${critical_deps[@]}"; do
        if [[ ! -d "node_modules/$dep" ]]; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Critical dependencies missing from node_modules:"
        for dep in "${missing_deps[@]}"; do
            log_error "  - $dep"
        done
        log_error "Run './scripts/dependency-sync.sh' to install missing dependencies"
        increment_error
        return 1
    fi
    
    log_success "All critical dependencies found in node_modules"
    increment_success
}

# Function to check for peer dependency issues
check_peer_dependencies() {
    log_section "Checking Peer Dependencies"
    
    log_info "Running npm ls to check for peer dependency issues..."
    
    if npm ls --depth=0 > /dev/null 2>&1; then
        log_success "No peer dependency issues found"
        increment_success
    else
        log_warning "Peer dependency issues detected"
        log_info "Running detailed check..."
        npm ls --depth=0 2>&1 | grep -E "(UNMET|missing)" || true
        increment_warning
    fi
}

# Function to validate TypeScript types availability
validate_typescript_types() {
    log_section "Validating TypeScript Types"
    
    local type_deps=("@types/node" "@types/react" "@types/react-dom" "@types/bcryptjs" "@types/jsonwebtoken" "@types/nodemailer" "@types/web-push")
    local missing_types=()
    
    for dep in "${type_deps[@]}"; do
        if [[ ! -d "node_modules/$dep" ]]; then
            missing_types+=("$dep")
        fi
    done
    
    if [[ ${#missing_types[@]} -gt 0 ]]; then
        log_warning "TypeScript type definitions missing:"
        for dep in "${missing_types[@]}"; do
            log_warning "  - $dep"
        done
        increment_warning
    else
        log_success "All TypeScript type definitions are available"
        increment_success
    fi
}

# Function to test critical module imports
test_module_imports() {
    log_section "Testing Critical Module Imports"
    
    local test_script="
const modules = [
    'ioredis',
    'sharp', 
    'socket.io',
    'socket.io-client',
    '@prisma/client',
    'next',
    'react',
    'react-dom',
    'bcryptjs',
    'jsonwebtoken',
    'nodemailer',
    'web-push'
];

let failed = false;
let results = [];

modules.forEach(module => {
    try {
        require(module);
        results.push(\`✓ \${module}\`);
    } catch (error) {
        results.push(\`✗ \${module}: \${error.message}\`);
        failed = true;
    }
});

console.log(results.join('\\n'));
process.exit(failed ? 1 : 0);
"
    
    if node -e "$test_script"; then
        log_success "All critical modules can be imported successfully"
        increment_success
    else
        log_error "Some critical modules failed to import"
        increment_error
        return 1
    fi
}

# Function to validate dependency versions for security
validate_dependency_versions() {
    log_section "Validating Dependency Versions"
    
    log_info "Checking for known security vulnerabilities..."
    
    if command -v npm > /dev/null 2>&1; then
        if npm audit --audit-level=high --json > /dev/null 2>&1; then
            log_success "No high-severity vulnerabilities found"
            increment_success
        else
            local vuln_count=$(npm audit --audit-level=high --json 2>/dev/null | jq '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "unknown")
            log_warning "Security vulnerabilities detected (high: $vuln_count)"
            log_info "Run 'npm audit fix' to address vulnerabilities"
            increment_warning
        fi
    else
        log_warning "npm not available for security audit"
        increment_warning
    fi
}

# Function to check build prerequisites
check_build_prerequisites() {
    log_section "Checking Build Prerequisites"
    
    # Check if Prisma client is generated
    if [[ -d "node_modules/.prisma/client" ]]; then
        log_success "Prisma client is generated"
        increment_success
    else
        log_warning "Prisma client not generated"
        log_info "Run 'npx prisma generate' to generate Prisma client"
        increment_warning
    fi
    
    # Check if Next.js can be imported
    if node -e "require('next')" 2>/dev/null; then
        log_success "Next.js is properly installed"
        increment_success
    else
        log_error "Next.js cannot be imported"
        increment_error
    fi
    
    # Check for required build tools
    local build_tools=("typescript" "eslint" "tailwindcss")
    for tool in "${build_tools[@]}"; do
        if [[ -d "node_modules/$tool" ]]; then
            log_success "$tool is available"
            increment_success
        else
            log_warning "$tool is not installed"
            increment_warning
        fi
    done
}

# Function to perform Docker build test (optional)
test_docker_build() {
    log_section "Docker Build Test (Optional)"
    
    if command -v docker > /dev/null 2>&1; then
        log_info "Docker is available - performing build test..."
        
        # Create a temporary Dockerfile for testing
        cat > Dockerfile.test << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
EOF
        
        if docker build -f Dockerfile.test -t edupro-deps-test . > /dev/null 2>&1; then
            log_success "Docker dependency installation test passed"
            increment_success
        else
            log_error "Docker dependency installation test failed"
            increment_error
        fi
        
        # Clean up
        rm -f Dockerfile.test
        docker rmi edupro-deps-test > /dev/null 2>&1 || true
    else
        log_info "Docker not available - skipping Docker build test"
        increment_success
    fi
}

# Function to generate comprehensive dependency report
generate_dependency_report() {
    log_section "Generating Dependency Report"
    
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local report_file="dependency-validation-report.txt"
    
    cat > "$report_file" << EOF
EduPro Suite - Dependency Validation Report
Generated: ${timestamp}

=== VALIDATION SUMMARY ===
Total Checks: ${VALIDATION_CHECKS}
Successful: $((VALIDATION_CHECKS - VALIDATION_ERRORS - VALIDATION_WARNINGS))
Warnings: ${VALIDATION_WARNINGS}
Errors: ${VALIDATION_ERRORS}

=== PACKAGE FILES STATUS ===
package.json exists: $(test -f "package.json" && echo "✓ Yes" || echo "✗ No")
package-lock.json exists: $(test -f "package-lock.json" && echo "✓ Yes" || echo "✗ No")
Lock file version: $(test -f "package-lock.json" && jq -r '.lockfileVersion' package-lock.json 2>/dev/null || echo "N/A")

=== CRITICAL DEPENDENCIES STATUS ===
$(for dep in "ioredis" "sharp" "socket.io" "socket.io-client" "@prisma/client" "prisma" "next" "react" "react-dom"; do
    echo "$dep: $(test -d "node_modules/$dep" && echo "✓ Installed" || echo "✗ Missing")"
done)

=== NODE_MODULES STATUS ===
Directory exists: $(test -d "node_modules" && echo "✓ Yes" || echo "✗ No")
Total packages: $(test -d "node_modules" && find node_modules -maxdepth 1 -type d | wc -l | tr -d ' ' || echo "0")
Total size: $(test -d "node_modules" && du -sh node_modules 2>/dev/null | cut -f1 || echo "Unknown")

=== BUILD PREREQUISITES ===
Prisma client: $(test -d "node_modules/.prisma/client" && echo "✓ Generated" || echo "✗ Not generated")
TypeScript: $(test -d "node_modules/typescript" && echo "✓ Available" || echo "✗ Missing")
ESLint: $(test -d "node_modules/eslint" && echo "✓ Available" || echo "✗ Missing")
TailwindCSS: $(test -d "node_modules/tailwindcss" && echo "✓ Available" || echo "✗ Missing")

=== SECURITY STATUS ===
$(npm audit --audit-level=high --json 2>/dev/null | jq -r '
if .metadata.vulnerabilities.high > 0 then
    "High vulnerabilities: " + (.metadata.vulnerabilities.high | tostring)
else
    "High vulnerabilities: ✓ None found"
end' 2>/dev/null || echo "Security audit: Unable to check")

=== RECOMMENDATIONS ===
$(if [[ $VALIDATION_ERRORS -gt 0 ]]; then
    echo "- Fix all errors before proceeding with deployment"
    echo "- Run './scripts/dependency-sync.sh' to resolve dependency issues"
fi)
$(if [[ $VALIDATION_WARNINGS -gt 0 ]]; then
    echo "- Address warnings to improve build reliability"
    echo "- Consider running 'npm audit fix' for security issues"
fi)
$(if [[ $VALIDATION_ERRORS -eq 0 && $VALIDATION_WARNINGS -eq 0 ]]; then
    echo "- All validations passed - ready for deployment"
    echo "- Proceed with './scripts/production-deploy.sh'"
fi)

EOF
    
    log_success "Dependency validation report generated: $report_file"
    increment_success
}

# Function to display final validation summary
display_summary() {
    log_section "Validation Summary"
    
    echo -e "${BLUE}Total Checks Performed: ${VALIDATION_CHECKS}${NC}"
    echo -e "${GREEN}Successful: $((VALIDATION_CHECKS - VALIDATION_ERRORS - VALIDATION_WARNINGS))${NC}"
    echo -e "${YELLOW}Warnings: ${VALIDATION_WARNINGS}${NC}"
    echo -e "${RED}Errors: ${VALIDATION_ERRORS}${NC}"
    echo ""
    
    if [[ $VALIDATION_ERRORS -eq 0 && $VALIDATION_WARNINGS -eq 0 ]]; then
        log_success "🎉 All dependency validations passed!"
        log_info "Dependencies are properly configured and synchronized"
        log_info "Ready for deployment with './scripts/production-deploy.sh'"
        return 0
    elif [[ $VALIDATION_ERRORS -eq 0 ]]; then
        log_warning "⚠️  Validation completed with warnings"
        log_info "Consider addressing warnings before deployment"
        return 0
    else
        log_error "❌ Validation failed with errors"
        log_error "Fix all errors before proceeding with deployment"
        log_info "Run './scripts/dependency-sync.sh' to resolve dependency issues"
        return 1
    fi
}

# Main execution function
main() {
    log_info "Starting EduPro Suite dependency validation..."
    log_info "This script will comprehensively validate all dependencies"
    echo ""
    
    # Perform all validation checks
    check_directory || true
    verify_package_sync || true
    check_package_json_dependencies || true
    check_package_lock_dependencies || true
    validate_node_modules || true
    check_peer_dependencies || true
    validate_typescript_types || true
    test_module_imports || true
    validate_dependency_versions || true
    check_build_prerequisites || true
    test_docker_build || true
    
    # Generate comprehensive report
    generate_dependency_report
    
    echo ""
    # Display final summary and exit with appropriate code
    display_summary
}

# Execute main function
main "$@"
