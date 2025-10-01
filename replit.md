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

### ✅ Setup Successfully Completed!

1. **Database Configuration**
   - ✅ PostgreSQL database provisioned via Replit
   - ✅ Database URL configured and connected
   - ✅ Prisma schema deployed successfully
   - ✅ Database seeded with test data

2. **Test Accounts Created**
   - SUPERADMIN: `admin@edupro.com` / `admin123`
   - TEACHER: `teacher@edupro.com` / `teacher123`
   - STUDENT: `student@edupro.com` / `student123`
   - GUARDIAN: `guardian@edupro.com` / `guardian123`

3. **Environment Configuration**
   - ✅ Environment variables configured in `.env.local`
   - ✅ JWT secrets set for development
   - ✅ Server configured to bind to `0.0.0.0:5000`
   - ✅ Next.js 15 async params compatibility fixed

4. **Next.js Configuration for Replit**
   - ✅ Configured to allow iframe embedding in development (for Replit proxy)
   - ✅ CSP headers adjusted for websocket connections
   - ✅ X-Frame-Options removed in development
   - ✅ Server actions configured to allow all origins in development
   - ✅ Removed deprecated `swcMinify` option

5. **Dependencies & Build**
   - ✅ All npm packages installed successfully (819 packages)
   - ✅ Prisma client generated
   - ✅ Application running successfully on port 5000

6. **Deployment Configuration**
   - ✅ Autoscale deployment configured
   - ✅ Build command: `npm run build`
   - ✅ Start command: `npm start`

### 🎉 Application Status: RUNNING

The application is now successfully running and accessible via the Replit webview. The login page loads correctly, and all authentication features are working.

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

1. **Testing**: Test all major features and user flows with the test accounts
2. **Customization**: Configure application settings and preferences
3. **Production**: Deploy to production when ready using Replit Deploy
4. **Documentation**: Review API documentation and user guides in `/docs`

## Usage

1. **Access the Application**: Click on the Webview to see the running application
2. **Login**: Use one of the test accounts listed above
3. **Explore**: Navigate through the dashboard based on your role
4. **Customize**: Modify settings, add users, configure academic year, etc.

## Support Resources

- Original Repository: [GitHub](https://github.com/...)
- Next.js Documentation: https://nextjs.org/docs
- Prisma Documentation: https://www.prisma.io/docs
- Replit Deployments: https://docs.replit.com/category/deployments

---

**Last Updated**: October 1, 2025
**Status**: ✅ Setup Complete - Application Running Successfully
**Database**: ✅ Connected and seeded
**Dependencies**: ✅ Installed (819 packages)
**Server**: ✅ Running on port 5000
**Deployment**: ✅ Configured for Autoscale
