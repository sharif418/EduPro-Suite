const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting complete database setup...');

  try {
    // First, let's create all the missing tables using raw SQL
    console.log('📋 Creating missing database tables...');

    // Create class_subjects table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "class_subjects" (
        "id" TEXT NOT NULL,
        "class_level_id" TEXT NOT NULL,
        "subject_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create unique constraint for class_subjects
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "class_subjects_class_level_id_subject_id_key" 
      ON "class_subjects"("class_level_id", "subject_id");
    `;

    // Create enrollments table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "enrollments" (
        "id" TEXT NOT NULL,
        "student_id" TEXT NOT NULL,
        "academic_year_id" TEXT NOT NULL,
        "class_level_id" TEXT NOT NULL,
        "section_id" TEXT NOT NULL,
        "enrollment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create student_addresses table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "student_addresses" (
        "id" TEXT NOT NULL,
        "present_address" TEXT NOT NULL,
        "permanent_address" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "student_addresses_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create students table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "students" (
        "id" TEXT NOT NULL,
        "student_id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "date_of_birth" TIMESTAMP(3) NOT NULL,
        "gender" TEXT NOT NULL,
        "contact_number" TEXT NOT NULL,
        "guardian_name" TEXT NOT NULL,
        "guardian_contact" TEXT NOT NULL,
        "guardian_email" TEXT,
        "user_id" TEXT NOT NULL,
        "address_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "students_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create unique constraints for students
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "students_student_id_key" ON "students"("student_id");
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "students_email_key" ON "students"("email");
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "students_user_id_key" ON "students"("user_id");
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "students_address_id_key" ON "students"("address_id");
    `;

    // Create staff_addresses table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "staff_addresses" (
        "id" TEXT NOT NULL,
        "present_address" TEXT NOT NULL,
        "permanent_address" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "staff_addresses_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create staff table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "staff" (
        "id" TEXT NOT NULL,
        "staff_id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "designation" TEXT NOT NULL,
        "department" TEXT NOT NULL,
        "date_of_birth" TIMESTAMP(3) NOT NULL,
        "gender" TEXT NOT NULL,
        "contact_number" TEXT NOT NULL,
        "joining_date" TIMESTAMP(3) NOT NULL,
        "qualification" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "address_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create unique constraints for staff
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "staff_staff_id_key" ON "staff"("staff_id");
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "staff_email_key" ON "staff"("email");
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "staff_user_id_key" ON "staff"("user_id");
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "staff_address_id_key" ON "staff"("address_id");
    `;

    // Create staff_attendances table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "staff_attendances" (
        "id" TEXT NOT NULL,
        "staff_id" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "status" TEXT NOT NULL,
        "remarks" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "staff_attendances_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create unique constraint for staff_attendances
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "staff_attendances_staff_id_date_key" 
      ON "staff_attendances"("staff_id", "date");
    `;

    // Create leave_requests table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "leave_requests" (
        "id" TEXT NOT NULL,
        "staff_id" TEXT NOT NULL,
        "leave_type" TEXT NOT NULL,
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "reason" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "approved_by" TEXT,
        "approved_at" TIMESTAMP(3),
        "remarks" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
      );
    `;

    console.log('✅ All database tables created successfully!');

    // Now seed the database with initial data
    console.log('🌱 Seeding database with initial data...');

    // Hash passwords
    const hashedAdminPassword = await bcrypt.hash('admin123', 12);
    const hashedTeacherPassword = await bcrypt.hash('teacher123', 12);
    const hashedStudentPassword = await bcrypt.hash('student123', 12);

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@edupro.com' },
      update: {},
      create: {
        name: 'System Administrator',
        email: 'admin@edupro.com',
        password: hashedAdminPassword,
        role: 'SUPERADMIN',
      },
    });

    console.log('✅ Admin user created:', adminUser.email);

    // Create a test teacher user
    const teacherUser = await prisma.user.upsert({
      where: { email: 'teacher@edupro.com' },
      update: {},
      create: {
        name: 'Test Teacher',
        email: 'teacher@edupro.com',
        password: hashedTeacherPassword,
        role: 'TEACHER',
      },
    });

    console.log('✅ Teacher user created:', teacherUser.email);

    // Create a test student user
    const studentUser = await prisma.user.upsert({
      where: { email: 'student@edupro.com' },
      update: {},
      create: {
        name: 'Test Student',
        email: 'student@edupro.com',
        password: hashedStudentPassword,
        role: 'STUDENT',
      },
    });

    console.log('✅ Student user created:', studentUser.email);

    // Create some basic academic data
    console.log('📚 Creating basic academic data...');

    // Create academic year
    const academicYear = await prisma.academicYear.upsert({
      where: { year: '2025-2026' },
      update: {},
      create: {
        year: '2025-2026',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isCurrent: true,
      },
    });

    console.log('✅ Academic year created:', academicYear.year);

    // Create class levels
    const classLevel = await prisma.classLevel.upsert({
      where: { name: 'Class 10' },
      update: {},
      create: {
        name: 'Class 10',
      },
    });

    console.log('✅ Class level created:', classLevel.name);

    // Create section
    const section = await prisma.section.upsert({
      where: { 
        name_classLevelId: {
          name: 'A',
          classLevelId: classLevel.id
        }
      },
      update: {},
      create: {
        name: 'A',
        classLevelId: classLevel.id,
      },
    });

    console.log('✅ Section created:', section.name);

    // Create subjects
    const mathSubject = await prisma.subject.upsert({
      where: { subjectCode: 'MATH101' },
      update: {},
      create: {
        name: 'Mathematics',
        subjectCode: 'MATH101',
      },
    });

    const englishSubject = await prisma.subject.upsert({
      where: { subjectCode: 'ENG101' },
      update: {},
      create: {
        name: 'English',
        subjectCode: 'ENG101',
      },
    });

    console.log('✅ Subjects created: Mathematics, English');

    console.log('🎉 Complete database setup completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('Admin: admin@edupro.com / admin123');
    console.log('Teacher: teacher@edupro.com / teacher123');
    console.log('Student: student@edupro.com / student123');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
