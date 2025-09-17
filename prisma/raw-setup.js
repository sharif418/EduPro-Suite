const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Setting up database with raw SQL...');

    // Drop existing tables if they exist
    await prisma.$executeRaw`DROP TABLE IF EXISTS "users" CASCADE;`;
    
    // Create enum types
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create users table
    await prisma.$executeRaw`
      CREATE TABLE "users" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'STUDENT',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
    `;

    console.log('✅ Database tables created successfully!');

    // Hash passwords
    const hashedAdminPassword = await bcrypt.hash('admin123', 12);
    const hashedTeacherPassword = await bcrypt.hash('teacher123', 12);
    const hashedStudentPassword = await bcrypt.hash('student123', 12);

    console.log('🌱 Starting database seeding...');

    // Insert users using raw SQL
    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "name", "email", "password", "role", "updatedAt")
      VALUES (
        'admin-user-id-001',
        'System Administrator',
        'admin@edupro.com',
        ${hashedAdminPassword},
        'SUPERADMIN'::Role,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("email") DO UPDATE SET
        "password" = EXCLUDED."password",
        "updatedAt" = CURRENT_TIMESTAMP;
    `;

    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "name", "email", "password", "role", "updatedAt")
      VALUES (
        'teacher-user-id-001',
        'Test Teacher',
        'teacher@edupro.com',
        ${hashedTeacherPassword},
        'TEACHER'::Role,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("email") DO UPDATE SET
        "password" = EXCLUDED."password",
        "updatedAt" = CURRENT_TIMESTAMP;
    `;

    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "name", "email", "password", "role", "updatedAt")
      VALUES (
        'student-user-id-001',
        'Test Student',
        'student@edupro.com',
        ${hashedStudentPassword},
        'STUDENT'::Role,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("email") DO UPDATE SET
        "password" = EXCLUDED."password",
        "updatedAt" = CURRENT_TIMESTAMP;
    `;

    console.log('✅ Admin user created: admin@edupro.com');
    console.log('✅ Teacher user created: teacher@edupro.com');
    console.log('✅ Student user created: student@edupro.com');

    console.log('🎉 Database setup completed successfully!');
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
