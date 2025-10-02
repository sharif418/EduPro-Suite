# EduPro Suite - Madrasah Management System

## 📌 Project Overview

EduPro Suite is a comprehensive education management system built with:
- **Next.js 15.5.3** with App Router
- **React 19.1.0** with TypeScript
- **PostgreSQL** database with Prisma ORM
- **Socket.IO** for real-time features
- **Multi-language support** (English, Bengali, Arabic)
- **Role-based authentication** (SUPERADMIN, TEACHER, STUDENT, GUARDIAN)

### Target Market
- Madrasah (Islamic Educational Institutions) in Bangladesh
- General Educational Institutions
- Schools, Colleges, and Universities

---

## 🚀 Current Status

### ✅ Completed (October 2, 2025)
1. **Environment Setup**
   - Dependencies installed successfully
   - PostgreSQL database created and configured
   - Prisma Client generated
   - Database migrations applied
   - Development server running on port 5000

2. **Project Cleanup**
   - Removed unnecessary Docker files
   - Deleted test and debug files
   - Cleaned up TODO and documentation files
   - Removed unused monitoring and nginx configs

3. **Planning & Documentation**
   - Created comprehensive IMPLEMENTATION_PLAN.md
   - Feature analysis completed
   - Roadmap defined

### ⏳ In Progress
- Environment variables configuration
- Madrasah-specific feature implementation
- UI/UX enhancements for Islamic aesthetics

---

## 🏗️ Project Structure

```
edupro-suite/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Multi-language routes
│   │   ├── (admin)/             # Admin portal
│   │   ├── (teacher)/           # Teacher portal
│   │   ├── (student)/           # Student portal
│   │   ├── (guardian)/          # Guardian portal
│   │   └── login/               # Login page
│   ├── api/                     # API routes
│   │   ├── auth/               # Authentication
│   │   ├── admin/              # Admin APIs
│   │   ├── teacher/            # Teacher APIs
│   │   ├── student/            # Student APIs
│   │   └── ...                 # Other APIs
│   ├── components/             # Shared components
│   ├── lib/                    # Utilities and helpers
│   └── hooks/                  # Custom React hooks
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma          # Prisma schema
│   ├── migrations/            # Database migrations
│   └── seed.ts               # Database seeding
├── public/                    # Static assets
├── messages/                  # i18n translation files
│   ├── en.json               # English
│   ├── bn.json               # Bengali
│   └── ar.json               # Arabic
├── .env                      # Environment variables (not in git)
├── .env.example             # Environment template
├── next.config.ts           # Next.js configuration
├── server.ts                # Custom server with Socket.IO
├── package.json             # Dependencies
└── IMPLEMENTATION_PLAN.md   # Full implementation plan
```

---

## 🔧 Development Commands

### Essential Commands
- `npm run dev` - Start Next.js development server (port 5000)
- `npm run build` - Build for production
- `npm start` - Start production server

### Database Commands
- `npx prisma generate` - Generate Prisma Client
- `npx prisma migrate deploy` - Run migrations
- `npx prisma migrate dev` - Create new migration (development)
- `npx prisma db seed` - Seed the database
- `npx prisma studio` - Open Prisma Studio (database GUI)

### Other Commands
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking

---

## 🗄️ Database Schema

The application uses PostgreSQL with comprehensive models:

### Core Models
- **User** - Base user authentication
- **AcademicYear** - Academic session management
- **ClassLevel** - Class/grade levels
- **Section** - Class sections
- **Subject** - Subjects/courses
- **Student** - Student profiles
- **Staff** - Teacher and staff profiles
- **Enrollment** - Student-class enrollment

### Academic Models
- **Exam** - Examination management
- **ExamSchedule** - Exam timetable
- **GradingSystem** - Grading configurations
- **Mark** - Student marks
- **Result** - Processed results
- **Assignment** - Homework/assignments
- **LessonPlan** - Teacher lesson plans

### Financial Models
- **FeeHead** - Fee categories
- **FeeStructure** - Fee amounts by class
- **Invoice** - Student invoices
- **Payment** - Payment records
- **Expense** - Institutional expenses

### Communication Models
- **Notification** - System notifications
- **ClassAnnouncement** - Class announcements
- **PushSubscription** - Push notification subscriptions

### Other Models
- **Attendance** - Student attendance
- **StaffAttendance** - Staff attendance
- **LeaveRequest** - Leave applications
- **Library** - Library management (partial)

---

## 🌐 Multi-Language Support

### Supported Languages
1. **English (en)** - Default
2. **Bengali (bn)** - Primary for Bangladesh
3. **Arabic (ar)** - RTL support for Islamic content

### Translation Files
- `messages/en.json` - English translations
- `messages/bn.json` - Bengali translations
- `messages/ar.json` - Arabic translations

### Usage
All pages use `next-intl` for internationalization:
```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('admin');
const title = t('dashboard.title');
```

---

## 🔐 Authentication & Roles

### User Roles
1. **SUPERADMIN** - Full system access
2. **ADMIN** - Administrative access
3. **TEACHER** - Teacher portal access
4. **STUDENT** - Student portal access
5. **GUARDIAN** - Parent/guardian access
6. **ACCOUNTANT** - Financial management
7. **LIBRARIAN** - Library management

### Authentication Flow
- JWT-based authentication
- Session stored in HTTP-only cookies
- Role-based route protection
- Automatic redirect on unauthorized access

---

## 📦 Key Features

### ✅ Implemented
- Multi-role dashboards
- Student management
- Staff management
- Attendance system
- Examination system
- Financial management
- Assignment system
- Lesson planning
- Real-time notifications
- Multi-language support
- PWA support
- Library management (basic)

### 🚧 Coming Soon (See IMPLEMENTATION_PLAN.md)
- Hifz progress tracking
- Islamic subjects & curriculum
- Online admission system
- OMR examination system
- Bulk upload (Excel/CSV)
- SMS gateway (Bangladesh)
- Payment gateway (SSLCommerz, bKash, Nagad)
- Transport management
- Hostel management
- Advanced reporting

---

## 🎨 UI/UX Design

### Design System
- **Framework**: Tailwind CSS
- **Components**: Custom component library
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion

### Theme Support
- Light mode
- Dark mode
- User preference persistence

### Responsive Design
- Mobile-first approach
- Tablet optimized
- Desktop full-featured

---

## 🔌 API Structure

### API Routes
All APIs are in `/app/api/`:

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Admin APIs
- `/api/admin/students` - Student CRUD
- `/api/admin/staff` - Staff CRUD
- `/api/admin/exams` - Exam management
- `/api/admin/finance` - Financial operations
- `/api/admin/academic-years` - Academic year management

#### Teacher APIs
- `/api/teacher/classes` - Assigned classes
- `/api/teacher/attendance` - Attendance marking
- `/api/teacher/assignments` - Assignment management
- `/api/teacher/lessons` - Lesson plans

#### Student APIs
- `/api/student/assignments` - View assignments
- `/api/student/lessons` - View lesson plans

### Real-time APIs
- `GET/POST /api/socket` - Socket.IO management
- WebSocket connection for live notifications

---

## 🛠️ Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint rules
- Use Prettier for formatting
- Component-based architecture

### Best Practices
1. **API Routes**: Handle errors gracefully
2. **Components**: Keep them small and reusable
3. **State Management**: Use React hooks and context
4. **Database**: Always use Prisma for queries
5. **Authentication**: Check user role in all protected routes

### Testing
- Write tests for critical business logic
- Test API endpoints
- Test user flows

---

## 🚀 Deployment

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure database URL
3. Set JWT secrets (32+ characters)
4. Configure email/SMS if needed

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
See `.env.example` for all required variables.

---

## 📚 Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Socket.IO](https://socket.io/docs)

### Implementation Plan
See `IMPLEMENTATION_PLAN.md` for:
- Detailed feature roadmap
- Missing features list
- Phase-wise implementation
- Success metrics

---

## 🐛 Known Issues

### Current Issues
None reported

### Limitations
- Library module is partially implemented
- Some advanced reports need enhancement
- Mobile app version not available (PWA only)

---

## 📝 Recent Changes

### October 2, 2025
- ✅ Completed Replit environment setup
- ✅ Installed all dependencies
- ✅ Configured PostgreSQL database
- ✅ Applied database migrations
- ✅ Cleaned up unnecessary files
- ✅ Created comprehensive implementation plan
- ✅ Server running successfully on port 5000

---

## 🎯 Next Steps

1. Configure environment variables
2. Implement Madrasah-specific class types
3. Add Hifz progress tracking module
4. Create Islamic UI components
5. Integrate payment gateways
6. Add SMS notification system

---

## 👥 User Preferences

### Development Preferences
- Language: Bengali/English
- Focus: Madrasah-specific features
- Priority: Bangladesh market adaptations
- Design: Islamic aesthetics with modern UI

---

## 📞 Support

For issues or questions, check:
1. `IMPLEMENTATION_PLAN.md` - Feature roadmap
2. `README.md` - General project info
3. API documentation in code
4. Prisma schema for database structure

---

**Last Updated**: October 2, 2025  
**Status**: ✅ Development Environment Ready | ⏳ Feature Implementation In Progress  
**Version**: 0.1.0
