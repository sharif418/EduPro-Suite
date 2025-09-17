const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTables() {
  console.log('🔧 Creating database tables...');
  
  // Create enum types first
  await prisma.$executeRaw`
    DO $$ BEGIN
      CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await prisma.$executeRaw`
    DO $$ BEGIN
      CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await prisma.$executeRaw`
    DO $$ BEGIN
      CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await prisma.$executeRaw`
    DO $$ BEGIN
      CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;
  
  // Create tables using raw SQL based on the Prisma schema
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "role" "Role" NOT NULL DEFAULT 'STUDENT',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "users_pkey" PRIMARY KEY ("id")
    );
  `;

  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
  `;

  // Create other essential tables
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "academic_years" (
      "id" TEXT NOT NULL,
      "year" TEXT NOT NULL,
      "startDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3) NOT NULL,
      "isCurrent" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
    );
  `;

  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "academic_years_year_key" ON "academic_years"("year");
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "class_levels" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "class_levels_pkey" PRIMARY KEY ("id")
    );
  `;

  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "class_levels_name_key" ON "class_levels"("name");
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "sections" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "classLevelId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
    );
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "subjects" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "subjectCode" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
    );
  `;

  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "subjects_subjectCode_key" ON "subjects"("subjectCode");
  `;

  console.log('✅ Database tables created successfully!');
}

async function seedUsers() {
  console.log('🌱 Starting database seeding...');

  // Hash passwords
  const hashedAdminPassword = await bcrypt.hash('admin123', 12);
  const hashedTeacherPassword = await bcrypt.hash('teacher123', 12);
  const hashedStudentPassword = await bcrypt.hash('student123', 12);

  // Create admin user with hashed password
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@edupro.com' },
    update: {},
    create: {
      id: 'admin-user-id-001',
      name: 'System Administrator',
      email: 'admin@edupro.com',
      password: hashedAdminPassword,
      role: 'SUPERADMIN',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create a test teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@edupro.com' },
    update: {},
    create: {
      id: 'teacher-user-id-001',
      name: 'Test Teacher',
      email: 'teacher@edupro.com',
      password: hashedTeacherPassword,
      role: 'TEACHER',
    },
  });

  console.log('✅ Teacher user created:', teacherUser.email);

  // Create a test student
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@edupro.com' },
    update: {},
    create: {
      id: 'student-user-id-001',
      name: 'Test Student',
      email: 'student@edupro.com',
      password: hashedStudentPassword,
      role: 'STUDENT',
    },
  });

  console.log('✅ Student user created:', studentUser.email);

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('Admin: admin@edupro.com / admin123');
  console.log('Teacher: teacher@edupro.com / teacher123');
  console.log('Student: student@edupro.com / student123');
}

async function main() {
  try {
    await createTables();
    await seedUsers();
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
