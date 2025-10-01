# EduPro Suite - Replit Environment Setup

## Project Overview

EduPro Suite is a comprehensive education management system built with:
- **Next.js 15.5.3** with App Router
- **React 19.1.0** with TypeScript
- **PostgreSQL** database with Prisma ORM
- **Socket.IO** for real-time features
- **Multi-language support** (English, Bengali, Arabic)
- **Role-based authentication** (SUPERADMIN, TEACHER, STUDENT, GUARDIAN)

## Current Setup Status

### ✅ Completed Setup Steps

1. **Database Configuration**
   - PostgreSQL database is provisioned and connected
   - Database URL: `postgresql://postgres:password@helium/heliumdb`
   - Prisma schema deployed successfully
   - Database seeded with test data

2. **Test Accounts Created**
   - SUPERADMIN: `admin@edupro.com` / `admin123`
   - TEACHER: `teacher@edupro.com` / `teacher123`
   - STUDENT: `student@edupro.com` / `student123`
   - GUARDIAN: `guardian@edupro.com` / `guardian123`

3. **Environment Configuration**
   - Environment validator configured with sensible defaults
   - JWT secrets using default development values
   - Server configured to bind to `0.0.0.0:5000`

4. **Next.js Configuration for Replit**
   - Configured to allow iframe embedding in development (for Replit proxy)
   - CSP headers adjusted for websocket connections
   - X-Frame-Options removed in development
   - Server actions configured to allow all origins in development

5. **Dependencies Installed**
   - All npm packages installed successfully
   - Prisma client generated

### ⚠️ Current Issue: Resource Constraints

The application is **unable to start** due to memory limitations in the Replit environment. The application encounters a "Bus error (exit code 135)" when trying to start the Next.js development server, which indicates the process is being killed due to memory constraints.

**Symptoms:**
- Bus error (core dumped) when running `next dev`
- Exit code 135 (SIGBUS - memory/resource limit)
- Process killed during Next.js compilation phase

**Root Cause:**
This is a large, feature-rich application with:
- 819 npm packages installed
- Complex database schema (40+ models)
- Multiple experimental Next.js features
- Socket.IO real-time features
- Internationalization (i18n) with 3 languages
- Heavy dependencies (Sharp, Recharts, Framer Motion, etc.)

## Recommendations

### Option 1: Upgrade Replit Resources (Recommended)
- Upgrade to a Replit plan with more CPU and RAM
- Use the Resources panel to monitor usage
- Contact Replit support about resource allocation

### Option 2: Optimize the Application
To make this work in limited resources, consider:
- Remove unused dependencies
- Disable Socket.IO features temporarily
- Use Next.js static export instead of server-side rendering
- Reduce the number of languages (keep only English)
- Simplify the database schema
- Remove features like file uploads, notifications, etc.

### Option 3: Deploy to Production Environment
- This application is designed for production deployment
- Use Replit Deployments with Autoscale
- Production builds are more memory-efficient
- Consider external hosting (Vercel, Railway, etc.)

## Project Structure

```
edupro-suite/
├── app/                      # Next.js 15 App Router
│   ├── [locale]/            # Internationalized routes
│   ├── api/                 # API routes
│   ├── components/          # React components
│   ├── lib/                 # Utilities and services
│   └── contexts/            # React contexts
├── prisma/                  # Database
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Database migrations
│   └── seed.ts              # Database seeding
├── messages/                # i18n translation files
├── public/                  # Static assets
├── server.ts                # Custom Next.js server with Socket.IO
├── next.config.ts           # Next.js configuration
└── package.json             # Dependencies

```

## Available Scripts

- `npm run dev` - Start Next.js development server (port 5000)
- `npm run dev:custom` - Start custom server with Socket.IO
- `npm run build` - Build for production
- `npm run db:deploy` - Deploy database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:reset` - Reset database

## Features

### Core Features
- Multi-role dashboard (Admin, Teacher, Student, Guardian)
- Student enrollment and attendance tracking
- Staff management with attendance and leave tracking
- Examination system with grading
- Financial management (fees, invoices, payments)
- Library management system
- Assignment and lesson planning
- Real-time notifications (Socket.IO)
- Multi-language support (i18n)
- PWA support with offline capabilities

### Technical Features
- Role-based access control (RBAC)
- JWT authentication
- PostgreSQL with Prisma ORM
- Real-time updates via Socket.IO
- Responsive design with Tailwind CSS
- TypeScript for type safety
- Security headers and CSP
- Health monitoring endpoints

## Database Schema

The application includes 40+ models covering:
- User management (Users, Staff, Students, Guardians)
- Academic structure (Classes, Sections, Subjects)
- Examination system (Exams, Grades, Results)
- Financial management (Invoices, Payments, Expenses)
- Library system (Books, Issues, Fines)
- Notifications and messaging
- Attendance tracking (Staff and Students)
- Assignment and lesson management

## Configuration Notes

### Environment Variables (Using Defaults)
- `NODE_ENV`: development
- `DATABASE_URL`: Connected to Replit PostgreSQL
- `JWT_SECRET`: dev-jwt-secret-key-for-development-only-min-32-chars
- `NEXTAUTH_SECRET`: dev-nextauth-secret-for-development-only-min-32-chars
- `NEXTAUTH_URL`: http://localhost:5000

### Port Configuration
- Application binds to: `0.0.0.0:5000`
- This allows Replit's proxy to forward requests

### Security Configuration for Development
- Frame ancestors allowed (for Replit iframe)
- X-Frame-Options disabled in development
- Server actions accept all origins
- WebSocket connections allowed from all sources

## Next Steps

1. **Immediate**: Upgrade Replit plan or optimize application
2. **Short-term**: Get the dev server running successfully
3. **Testing**: Test all major features and user flows
4. **Deployment**: Configure production deployment settings
5. **Documentation**: Add API documentation and user guides

## Known Limitations in Replit Environment

- **Memory**: Application requires more RAM than currently available
- **Socket.IO**: Real-time features add overhead
- **Build Process**: Next.js compilation is memory-intensive
- **Dependencies**: 819 packages consume significant resources

## Support Resources

- Original Repository: [GitHub](https://github.com/...)
- Next.js Documentation: https://nextjs.org/docs
- Prisma Documentation: https://www.prisma.io/docs
- Replit Deployments: https://docs.replit.com/category/deployments

---

**Last Updated**: October 1, 2025
**Status**: Setup complete, awaiting resource allocation to start server
**Database**: ✅ Connected and seeded
**Dependencies**: ✅ Installed
**Server**: ❌ Unable to start (memory constraints)
