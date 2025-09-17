import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@edupro.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@edupro.com',
      password: hashedPassword,
      role: Role.SUPERADMIN,
    },
  });

  console.log('✅ Admin user created:', { id: adminUser.id, email: adminUser.email, role: adminUser.role });

  // Create test users for different roles
  const testUsers = [
    {
      name: 'John Teacher',
      email: 'teacher@edupro.com',
      password: await bcrypt.hash('teacher123', 12),
      role: Role.TEACHER,
    },
    {
      name: 'Jane Student',
      email: 'student@edupro.com',
      password: await bcrypt.hash('student123', 12),
      role: Role.STUDENT,
    },
    {
      name: 'Bob Guardian',
      email: 'guardian@edupro.com',
      password: await bcrypt.hash('guardian123', 12),
      role: Role.GUARDIAN,
    },
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log('✅ Test user created:', { id: user.id, email: user.email, role: user.role });
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
