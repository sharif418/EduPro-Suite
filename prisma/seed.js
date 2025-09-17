const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash the password
  const hashedPassword = await bcrypt.hash('admin123', 12);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@edupro.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@edupro.com',
      password: hashedPassword,
      role: 'SUPERADMIN',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create a test teacher
  const teacherPassword = await bcrypt.hash('teacher123', 12);
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@edupro.com' },
    update: {},
    create: {
      name: 'Test Teacher',
      email: 'teacher@edupro.com',
      password: teacherPassword,
      role: 'TEACHER',
    },
  });

  console.log('✅ Teacher user created:', teacherUser.email);

  // Create a test student
  const studentPassword = await bcrypt.hash('student123', 12);
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@edupro.com' },
    update: {},
    create: {
      name: 'Test Student',
      email: 'student@edupro.com',
      password: studentPassword,
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

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
