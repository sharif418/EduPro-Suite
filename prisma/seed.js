const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  // Check if database is already seeded
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('📊 Database already contains users, checking for required test users...');
  }

  // Create SUPERADMIN user
  const hashedAdminPassword = await bcrypt.hash('admin123', 12);
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
  console.log('✅ SUPERADMIN user created:', { id: adminUser.id, email: adminUser.email, role: adminUser.role });

  // Create Academic Year
  const currentYear = new Date().getFullYear();
  const academicYear = await prisma.academicYear.upsert({
    where: { year: `${currentYear}-${currentYear + 1}` },
    update: {},
    create: {
      year: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(`${currentYear}-01-01`),
      endDate: new Date(`${currentYear}-12-31`),
      isCurrent: true,
    },
  });
  console.log('✅ Academic year created:', academicYear.year);

  // Create Class Levels
  const classLevels = [
    { name: 'Class 1' },
    { name: 'Class 2' },
    { name: 'Class 3' },
    { name: 'Class 4' },
    { name: 'Class 5' },
    { name: 'Class 6' },
    { name: 'Class 7' },
    { name: 'Class 8' },
    { name: 'Class 9' },
    { name: 'Class 10' },
  ];

  const createdClassLevels = [];
  for (const classLevel of classLevels) {
    const level = await prisma.classLevel.upsert({
      where: { name: classLevel.name },
      update: {},
      create: classLevel,
    });
    createdClassLevels.push(level);
  }
  console.log('✅ Class levels created:', createdClassLevels.length);

  // Create Sections for each class level
  const sectionNames = ['A', 'B', 'C'];
  const createdSections = [];
  for (const classLevel of createdClassLevels.slice(0, 3)) { // Only first 3 class levels
    for (const sectionName of sectionNames.slice(0, 1)) { // Only section A for simplicity
      const section = await prisma.section.upsert({
        where: { 
          name_classLevelId: {
            name: sectionName,
            classLevelId: classLevel.id,
          }
        },
        update: {},
        create: { 
          name: sectionName,
          classLevelId: classLevel.id,
        },
      });
      createdSections.push(section);
    }
  }
  console.log('✅ Sections created:', createdSections.length);

  // Create Subjects
  const subjects = [
    { name: 'Mathematics', subjectCode: 'MATH' },
    { name: 'English', subjectCode: 'ENG' },
    { name: 'Science', subjectCode: 'SCI' },
    { name: 'Social Studies', subjectCode: 'SS' },
    { name: 'Bengali', subjectCode: 'BEN' },
    { name: 'Islamic Studies', subjectCode: 'IS' },
    { name: 'Physical Education', subjectCode: 'PE' },
    { name: 'Art & Craft', subjectCode: 'ART' },
  ];

  const createdSubjects = [];
  for (const subject of subjects) {
    const createdSubject = await prisma.subject.upsert({
      where: { subjectCode: subject.subjectCode },
      update: {},
      create: subject,
    });
    createdSubjects.push(createdSubject);
  }
  console.log('✅ Subjects created:', createdSubjects.length);

  // Create TEACHER users and Staff profiles
  const teacherUsers = [
    {
      name: 'John Teacher',
      email: 'teacher@edupro.com',
      password: await bcrypt.hash('teacher123', 12),
      role: 'TEACHER',
    },
    {
      name: 'Sarah Mathematics',
      email: 'math.teacher@edupro.com',
      password: await bcrypt.hash('teacher123', 12),
      role: 'TEACHER',
    },
    {
      name: 'Ahmed English',
      email: 'english.teacher@edupro.com',
      password: await bcrypt.hash('teacher123', 12),
      role: 'TEACHER',
    },
  ];

  const createdTeachers = [];
  for (let i = 0; i < teacherUsers.length; i++) {
    const teacherData = teacherUsers[i];
    const teacher = await prisma.user.upsert({
      where: { email: teacherData.email },
      update: {},
      create: teacherData,
    });

    // Create staff address
    const staffAddress = await prisma.staffAddress.create({
      data: {
        presentAddress: `Teacher Address ${i + 1}, Dhaka`,
        permanentAddress: `Permanent Address ${i + 1}, Bangladesh`,
      },
    });

    // Create staff profile
    const staffProfile = await prisma.staff.upsert({
      where: { userId: teacher.id },
      update: {},
      create: {
        staffId: `TCH${String(i + 1).padStart(4, '0')}`,
        name: teacher.name,
        email: teacher.email,
        designation: 'Teacher',
        department: i === 1 ? 'Mathematics' : i === 2 ? 'English' : 'General',
        dateOfBirth: new Date('1985-01-01'),
        gender: 'MALE',
        contactNumber: `+880171234567${i}`,
        joiningDate: new Date(),
        qualification: 'Bachelor of Education',
        userId: teacher.id,
        addressId: staffAddress.id,
      },
    });

    createdTeachers.push({ user: teacher, staff: staffProfile });
    console.log('✅ TEACHER user created:', { id: teacher.id, email: teacher.email, role: teacher.role });
  }

  // Create Guardian profiles
  const guardianProfiles = [];
  for (let i = 0; i < 3; i++) {
    const guardian = await prisma.guardian.create({
      data: {
        name: `Guardian ${i + 1}`,
        relationToStudent: 'Father',
        contactNumber: `+880171234567${i}`,
        email: `guardian${i + 1}@example.com`,
        occupation: 'Business',
      },
    });
    guardianProfiles.push(guardian);
  }
  console.log('✅ Guardian profiles created:', guardianProfiles.length);

  // Create STUDENT users and profiles
  const studentUsers = [
    {
      name: 'Jane Student',
      email: 'student@edupro.com',
      password: await bcrypt.hash('student123', 12),
      role: 'STUDENT',
    },
    {
      name: 'Ali Rahman',
      email: 'ali.student@edupro.com',
      password: await bcrypt.hash('student123', 12),
      role: 'STUDENT',
    },
    {
      name: 'Fatima Khan',
      email: 'fatima.student@edupro.com',
      password: await bcrypt.hash('student123', 12),
      role: 'STUDENT',
    },
  ];

  const createdStudents = [];
  for (let i = 0; i < studentUsers.length; i++) {
    const studentData = studentUsers[i];
    const student = await prisma.user.upsert({
      where: { email: studentData.email },
      update: {},
      create: studentData,
    });

    // Create student address
    const studentAddress = await prisma.studentAddress.create({
      data: {
        presentAddress: `Student Address ${i + 1}, Dhaka`,
        permanentAddress: `Permanent Address ${i + 1}, Bangladesh`,
      },
    });

    // Create student profile
    const guardian = guardianProfiles[i % guardianProfiles.length];
    const studentProfile = await prisma.student.create({
      data: {
        studentId: `STU${String(i + 1).padStart(4, '0')}`,
        name: student.name,
        email: student.email,
        dateOfBirth: new Date('2010-01-01'),
        gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        bloodGroup: 'O+',
        religion: 'Islam',
        nationality: 'Bangladeshi',
        admissionDate: new Date(),
        guardianId: guardian.id,
        addressId: studentAddress.id,
      },
    });

    // Create enrollment
    const section = createdSections[i % createdSections.length];
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentProfile.id,
        classLevelId: section.classLevelId,
        sectionId: section.id,
        academicYearId: academicYear.id,
        rollNumber: i + 1,
      },
    });

    createdStudents.push({ user: student, profile: studentProfile, enrollment });
    console.log('✅ STUDENT user created:', { id: student.id, email: student.email, role: student.role, studentId: studentProfile.studentId });
  }

  // Create GUARDIAN users
  const guardianUsers = [
    {
      name: 'Bob Guardian',
      email: 'guardian@edupro.com',
      password: await bcrypt.hash('guardian123', 12),
      role: 'GUARDIAN',
    },
    {
      name: 'Rahman Father',
      email: 'rahman.guardian@edupro.com',
      password: await bcrypt.hash('guardian123', 12),
      role: 'GUARDIAN',
    },
  ];

  const createdGuardianUsers = [];
  for (let i = 0; i < guardianUsers.length; i++) {
    const guardianData = guardianUsers[i];
    const guardian = await prisma.user.upsert({
      where: { email: guardianData.email },
      update: {},
      create: guardianData,
    });

    createdGuardianUsers.push(guardian);
    console.log('✅ GUARDIAN user created:', { id: guardian.id, email: guardian.email, role: guardian.role });
  }

  // Create sample assignments
  for (let i = 0; i < Math.min(createdSections.length, createdSubjects.length); i++) {
    const section = createdSections[i];
    const subject = createdSubjects[i % createdSubjects.length];
    const teacher = createdTeachers[i % createdTeachers.length];
    
    const assignment = await prisma.assignment.create({
      data: {
        title: `${subject.name} Assignment ${i + 1}`,
        description: `Sample assignment for ${subject.name}`,
        classLevelId: section.classLevelId,
        sectionId: section.id,
        subjectId: subject.id,
        teacherId: teacher.staff.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxMarks: 100,
      },
    });
    console.log('✅ Assignment created:', assignment.title);
  }

  // Create sample exams
  for (let i = 0; i < Math.min(createdSections.length, createdSubjects.length); i++) {
    const subject = createdSubjects[i % createdSubjects.length];
    
    const exam = await prisma.exam.create({
      data: {
        name: `${subject.name} Mid-term Exam`,
        academicYearId: academicYear.id,
      },
    });
    console.log('✅ Exam created:', exam.name);
  }

  console.log('🎉 Comprehensive database seeding completed successfully!');
  console.log('📋 Summary:');
  console.log(`   - Users: ${1 + createdTeachers.length + createdStudents.length + createdGuardianUsers.length}`);
  console.log(`   - Sections: ${createdSections.length}`);
  console.log(`   - Subjects: ${createdSubjects.length}`);
  console.log(`   - Class Levels: ${createdClassLevels.length}`);
  console.log(`   - Students: ${createdStudents.length}`);
  console.log(`   - Teachers: ${createdTeachers.length}`);
  console.log('');
  console.log('🔑 Test Login Credentials:');
  console.log('   SUPERADMIN: admin@edupro.com / admin123');
  console.log('   TEACHER: teacher@edupro.com / teacher123');
  console.log('   STUDENT: student@edupro.com / student123');
  console.log('   GUARDIAN: guardian@edupro.com / guardian123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
