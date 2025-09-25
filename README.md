# EduPro Suite - Complete Education Management System

A comprehensive, production-ready education management system built with Next.js 15.5.3, featuring multi-language support, role-based access control, and real-time notifications.

## 🚀 Features

### Core Features
- **Next.js 15.5.3** with App Router and TypeScript
- **Multi-language Support** (English, Bengali, Arabic)
- **Role-based Authentication** (SUPERADMIN, TEACHER, STUDENT, GUARDIAN)
- **Real-time Notifications** with Socket.IO
- **Comprehensive Dashboard** for each user role
- **Academic Management** (Classes, Subjects, Assignments, Exams)
- **Student Information System** with enrollment tracking
- **Staff Management** with attendance and leave tracking
- **Financial Management** with fee collection and invoicing
- **Library Management** with book tracking and fines
- **Examination System** with grading and result processing

### Technical Features
- **Docker Containerization** with multi-service architecture
- **PostgreSQL Database** with Prisma ORM
- **Redis Caching** for performance optimization
- **File Upload System** with secure storage
- **PWA Support** with offline capabilities
- **Responsive Design** with Tailwind CSS
- **Security Features** including rate limiting and CSRF protection
- **Health Monitoring** with comprehensive health checks
- **Error Tracking** and logging system

## 🏗️ Architecture

```
EduPro Suite
├── Next.js Frontend (Port 3000)
├── PostgreSQL Database (Port 5432)
├── Redis Cache (Port 6379)
└── Nginx Reverse Proxy (Port 80/443)
```

## 📋 Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 18.x** or higher (for local development)
- **PostgreSQL 15** (if running without Docker)
- **Redis 7** (optional, for caching)

## 🚀 Quick Start with Docker (Recommended)

### 1. Clone and Setup Environment

```bash
# Clone the repository
git clone <repository-url>
cd edupro-suite

# Copy environment configuration
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 2. Configure Environment Variables

Update the `.env` file with your settings. Key variables to configure:

```bash
# Database Configuration
DATABASE_URL="postgresql://admin:strong_password_123@db:5432/edupro_db?schema=public"
POSTGRES_USER="admin"
POSTGRES_PASSWORD="strong_password_123"
POSTGRES_DB="edupro_db"

# JWT Configuration (MUST be at least 32 characters)
JWT_SECRET="your-super-secure-jwt-secret-key-minimum-32-characters-long"
NEXTAUTH_SECRET="your-nextauth-secret-key-minimum-32-characters-long"

# Application Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:3000"
```

### 3. Start the Application

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs (optional)
docker-compose logs -f app
```

### 4. Run Health Check

```bash
# Make health check script executable (if not already)
chmod +x scripts/health-check.sh

# Run comprehensive health check
./scripts/health-check.sh --verbose

# Check specific component
./scripts/health-check.sh --component=database
```

### 5. Access the Application

Once the health check passes, access the application:

- **Main Application**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/en/admin
- **Teacher Dashboard**: http://localhost:3000/en/teacher
- **Student Dashboard**: http://localhost:3000/en/student
- **Guardian Dashboard**: http://localhost:3000/en/guardian

## 🔑 Default Login Credentials

The system comes with pre-seeded test accounts:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| SUPERADMIN | admin@edupro.com | admin123 | Full system access |
| TEACHER | teacher@edupro.com | teacher123 | Teacher dashboard access |
| STUDENT | student@edupro.com | student123 | Student dashboard access |
| GUARDIAN | guardian@edupro.com | guardian123 | Guardian dashboard access |

## 🛠️ Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
# Start PostgreSQL (using Docker)
docker run -d \
  --name edupro-db \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=strong_password_123 \
  -e POSTGRES_DB=edupro_db \
  -p 5432:5432 \
  postgres:15-alpine

# Run database migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000.

## 🐳 Docker Configuration

### Services Overview

- **app**: Next.js application with custom server
- **db**: PostgreSQL 15 database
- **redis**: Redis 7 for caching
- **nginx**: Reverse proxy and static file serving

### Docker Commands

```bash
# Build and start all services
docker-compose up -d

# Rebuild specific service
docker-compose build app

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Remove all data (caution!)
docker-compose down -v
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for a complete list of configuration options. Key categories:

- **Database Configuration**: PostgreSQL connection settings
- **Authentication**: JWT secrets and session configuration
- **File Upload**: Upload limits and storage configuration
- **Email/SMS**: Notification service configuration
- **Security**: Rate limiting and CORS settings
- **Feature Flags**: Enable/disable specific features

### Database Schema

The application uses Prisma ORM with a comprehensive schema including:

- User management with role-based access
- Academic structure (classes, subjects, sections)
- Student enrollment and attendance tracking
- Staff management and payroll
- Examination and grading system
- Financial management and fee collection
- Library management system
- Notification and communication system

## 🧪 Testing and Health Checks

### Health Check Script

The comprehensive health check script verifies:

```bash
# Run all health checks
./scripts/health-check.sh

# Available options
./scripts/health-check.sh --help

# Check specific components
./scripts/health-check.sh --component=database
./scripts/health-check.sh --component=redis
./scripts/health-check.sh --component=auth
```

### Manual Testing

1. **Database Connectivity**: Check `/api/health` endpoint
2. **Authentication**: Test login with provided credentials
3. **Role Access**: Verify dashboard access for each role
4. **File Upload**: Test file upload functionality
5. **Real-time Features**: Test notifications and live updates

## 🚨 Troubleshooting

### Common Issues

#### App Service Restarting
```bash
# Check logs
docker-compose logs app

# Common causes:
# 1. Database connection issues
# 2. Missing environment variables
# 3. Port conflicts
```

#### Database Connection Failed
```bash
# Check database status
docker-compose ps db

# Verify connection
docker-compose exec db psql -U admin -d edupro_db -c "SELECT 1;"
```

#### Health Check Failures
```bash
# Run verbose health check
./scripts/health-check.sh --verbose

# Check specific component
./scripts/health-check.sh --component=database
```

### Log Locations

- **Application Logs**: `docker-compose logs app`
- **Database Logs**: `docker-compose logs db`
- **Nginx Logs**: `docker-compose logs nginx`
- **Health Check Logs**: Console output from health check script

## 📁 Project Structure

```
edupro-suite/
├── app/                     # Next.js application
│   ├── [locale]/           # Internationalized routes
│   ├── api/                # API routes
│   ├── components/         # React components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   └── lib/                # Utility libraries
├── prisma/                 # Database schema and migrations
├── scripts/                # Utility scripts
├── messages/               # Internationalization files
├── nginx/                  # Nginx configuration
├── public/                 # Static assets
├── docker-compose.yml      # Docker services configuration
├── Dockerfile              # Application container
└── .env.example           # Environment configuration template
```

## 🌐 Multi-language Support

The application supports three languages:

- **English (en)**: Default language
- **Bengali (bn)**: Bengali language support
- **Arabic (ar)**: Arabic language with RTL support

Language switching is available in the header of all pages.

## 🔐 Security Features

- **JWT Authentication** with secure token handling
- **Role-based Access Control** (RBAC)
- **Rate Limiting** on API endpoints
- **CSRF Protection** for forms
- **Input Validation** and sanitization
- **Secure Headers** configuration
- **Password Hashing** with bcrypt
- **SQL Injection Protection** via Prisma ORM

## 📊 Monitoring and Analytics

- **Health Check Endpoints**: `/api/health` and `/api/health/detailed`
- **Error Reporting**: Comprehensive error logging
- **Performance Monitoring**: Response time tracking
- **User Activity Tracking**: Login and action logging
- **System Metrics**: Memory and CPU usage monitoring

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**: Configure production environment variables
2. **SSL Certificates**: Setup HTTPS with Let's Encrypt or custom certificates
3. **Database Backup**: Configure automated database backups
4. **Monitoring**: Setup monitoring and alerting
5. **Load Balancing**: Configure load balancing if needed

### Scaling Considerations

- **Database**: Consider read replicas for high traffic
- **Caching**: Redis cluster for distributed caching
- **File Storage**: External storage service (AWS S3, etc.)
- **CDN**: Content delivery network for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and health checks
5. Submit a pull request

## 📄 License

This project is created for educational purposes. See LICENSE file for details.

## 📞 Support

For support and questions:

1. Check the troubleshooting section
2. Run the health check script
3. Review application logs
4. Create an issue in the repository

---

**Ready to explore EduPro Suite?** Start with the Quick Start guide above and run the health check to ensure everything is working correctly!
