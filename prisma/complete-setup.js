const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Setting up complete database schema...');

    // Drop existing tables if they exist (in correct order due to foreign keys)
    await prisma.$executeRaw`DROP TABLE IF EXISTS "enrollments" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "class_subjects" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "sections" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "students" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "student_addresses" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "guardians" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "staff_attendances" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "leave_requests" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "staff" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "staff_addresses" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "subjects" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "class_levels" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "academic_years" CASCADE;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS "users" CASCADE;`;

    // Create all tables
    console.log('Creating users table...');
    await prisma.$executeRaw`
      CREATE TABLE "users" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'STUDENT',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "users_email_key" ON "users"("email");`;

    console.log('Creating academic_years table...');
    await prisma.$executeRaw`
      CREATE TABLE "academic_years" (
        "id" TEXT NOT NULL,
        "year" TEXT NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "isCurrent" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "academic_years_year_key" ON "academic_years"("year");`;

    console.log('Creating class_levels table...');
    await prisma.$executeRaw`
      CREATE TABLE "class_levels" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "class_levels_pkey" PRIMARY KEY ("id")
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "class_levels_name_key" ON "class_levels"("name");`;

    console.log('Creating subjects table...');
    await prisma.$executeRaw`
      CREATE TABLE "subjects" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "subjectCode" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "subjects_subjectCode_key" ON "subjects"("subjectCode");`;

    console.log('Creating sections table...');
    await prisma.$executeRaw`
      CREATE TABLE "sections" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "classLevelId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sections_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "sections_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "class_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "sections_name_classLevelId_key" ON "sections"("name", "classLevelId");`;

    console.log('Creating class_subjects table...');
    await prisma.$executeRaw`
      CREATE TABLE "class_subjects" (
        "id" TEXT NOT NULL,
        "classLevelId" TEXT NOT NULL,
        "subjectId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "class_subjects_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "class_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "class_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "class_subjects_classLevelId_subjectId_key" ON "class_subjects"("classLevelId", "subjectId");`;

    console.log('Creating guardians table...');
    await prisma.$executeRaw`
      CREATE TABLE "guardians" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "relationToStudent" TEXT NOT NULL,
        "contactNumber" TEXT NOT NULL,
        "email" TEXT,
        "occupation" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
      );
    `;

    console.log('Creating student_addresses table...');
    await prisma.$executeRaw`
      CREATE TABLE "student_addresses" (
        "id" TEXT NOT NULL,
        "presentAddress" TEXT NOT NULL,
        "permanentAddress" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "student_addresses_pkey" PRIMARY KEY ("id")
      );
    `;

    console.log('Creating students table...');
    await prisma.$executeRaw`
      CREATE TABLE "students" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "dateOfBirth" TIMESTAMP(3) NOT NULL,
        "gender" TEXT NOT NULL,
        "bloodGroup" TEXT,
        "religion" TEXT,
        "nationality" TEXT,
        "studentPhotoUrl" TEXT,
        "admissionDate" TIMESTAMP(3) NOT NULL,
        "guardianId" TEXT NOT NULL,
        "addressId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "students_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "students_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "students_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "student_addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "students_studentId_key" ON "students"("studentId");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "students_email_key" ON "students"("email");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "students_addressId_key" ON "students"("addressId");`;

    console.log('Creating staff_addresses table...');
    await prisma.$executeRaw`
      CREATE TABLE "staff_addresses" (
        "id" TEXT NOT NULL,
        "presentAddress" TEXT NOT NULL,
        "permanentAddress" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "staff_addresses_pkey" PRIMARY KEY ("id")
      );
    `;

    console.log('Creating staff table...');
    await prisma.$executeRaw`
      CREATE TABLE "staff" (
        "id" TEXT NOT NULL,
        "staffId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "designation" TEXT NOT NULL,
        "department" TEXT NOT NULL,
        "dateOfBirth" TIMESTAMP(3) NOT NULL,
        "gender" TEXT NOT NULL,
        "contactNumber" TEXT NOT NULL,
        "joiningDate" TIMESTAMP(3) NOT NULL,
        "qualification" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "addressId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "staff_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "staff_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "staff_addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "staff_staffId_key" ON "staff"("staffId");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "staff_addressId_key" ON "staff"("addressId");`;

    console.log('Creating enrollments table...');
    await prisma.$executeRaw`
      CREATE TABLE "enrollments" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "classLevelId" TEXT NOT NULL,
        "sectionId" TEXT NOT NULL,
        "academicYearId" TEXT NOT NULL,
        "rollNumber" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "enrollments_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "class_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "enrollments_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "enrollments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "enrollments_studentId_academicYearId_key" ON "enrollments"("studentId", "academicYearId");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "enrollments_sectionId_academicYearId_rollNumber_key" ON "enrollments"("sectionId", "academicYearId", "rollNumber");`;

    console.log('✅ All database tables created successfully!');

    // Seed initial data
    console.log('🌱 Starting database seeding...');

    // Hash passwords
    const hashedAdminPassword = await bcrypt.hash('admin123', 12);
    const hashedTeacherPassword = await bcrypt.hash('teacher123', 12);
    const hashedStudentPassword = await bcrypt.hash('student123', 12);

    // Insert users
    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "name", "email", "password", "role", "updatedAt")
      VALUES (
        'admin-user-id-001',
        'System Administrator',
        'admin@edupro.com',
        ${hashedAdminPassword},
        'SUPERADMIN',
        CURRENT_TIMESTAMP
      );
    `;

    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "name", "email", "password", "role", "updatedAt")
      VALUES (
        'teacher-user-id-001',
        'Test Teacher',
        'teacher@edupro.com',
        ${hashedTeacherPassword},
        'TEACHER',
        CURRENT_TIMESTAMP
      );
    `;

    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "name", "email", "password", "role", "updatedAt")
      VALUES (
        'student-user-id-001',
        'Test Student',
        'student@edupro.com',
        ${hashedStudentPassword},
        'STUDENT',
        CURRENT_TIMESTAMP
      );
    `;

    console.log('✅ Admin user created: admin@edupro.com');
    console.log('✅ Teacher user created: teacher@edupro.com');
    console.log('✅ Student user created: student@edupro.com');

    console.log('🎉 Complete database setup completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('Admin: admin@edupro.com / admin123');
    console.log('Teacher: teacher@edupro.com / teacher123');
    console.log('Student: student@edupro.com / student123');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
