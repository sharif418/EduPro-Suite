#!/bin/bash

# Docker entrypoint script for EduPro Suite
# This script handles database migration and seeding before starting the application

set -e

echo "🚀 Starting EduPro Suite Docker Entrypoint..."

# Function to wait for database to be ready
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    
    # Extract database connection details from DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    
    # Default values if extraction fails
    DB_HOST=${DB_HOST:-postgres}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-edupro_production}
    DB_USER=${DB_USER:-edupro}
    
    echo "📡 Testing connection to database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    
    # Wait for database to be ready (max 60 seconds)
    for i in {1..60}; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
            echo "✅ Database is ready!"
            return 0
        fi
        echo "⏳ Database not ready yet... attempt $i/60"
        sleep 1
    done
    
    echo "❌ Database failed to become ready within 60 seconds"
    exit 1
}

# Function to run database migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    
    if npx prisma migrate deploy; then
        echo "✅ Database migrations completed successfully"
    else
        echo "❌ Database migrations failed"
        exit 1
    fi
}

# Function to check if database needs seeding
needs_seeding() {
    echo "🔍 Checking if database needs seeding..."
    
    # Check if User table has any records
    local user_count=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"User\";" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")
    
    if [ "$user_count" -eq "0" ]; then
        echo "📊 Database is empty, seeding required"
        return 0
    else
        echo "📊 Database has $user_count users, skipping seeding"
        return 1
    fi
}

# Function to seed the database
seed_database() {
    echo "🌱 Seeding database with initial data..."
    
    if npx prisma db seed; then
        echo "✅ Database seeding completed successfully"
    else
        echo "⚠️  Database seeding failed, but continuing..."
        # Don't exit on seeding failure as the app might still work
    fi
}

# Function to start the application
start_application() {
    echo "🎯 Starting Node.js application..."
    
    # Determine which server to start
    if [ -f "server.ts" ] && command -v tsx >/dev/null 2>&1; then
        echo "🔧 Starting with custom TypeScript server..."
        exec tsx server.ts
    elif [ -f "standalone-server.js" ]; then
        echo "🔧 Starting with standalone server..."
        exec node standalone-server.js
    elif [ -f "server.js" ]; then
        echo "🔧 Starting with server.js..."
        exec node server.js
    else
        echo "❌ No server file found! Checked: server.ts, standalone-server.js, server.js"
        exit 1
    fi
}

# Main execution flow
main() {
    echo "🏁 Starting main execution flow..."
    
    # Wait for database to be ready
    wait_for_db
    
    # Run database migrations
    run_migrations
    
    # Check if seeding is needed and run if necessary
    if needs_seeding; then
        seed_database
    fi
    
    # Start the application
    start_application
}

# Handle script termination gracefully
trap 'echo "🛑 Received termination signal, shutting down..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"
