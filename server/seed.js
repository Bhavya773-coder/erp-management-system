import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      phone: '+91 9876543210',
      aadhaarNumber: '1234 5678 9012',
      role: 'ADMIN',
      education: 'MBA',
      skills: ['Management', 'Leadership', 'Strategy'],
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      name: 'Manager User',
      email: 'manager@example.com',
      password: managerPassword,
      phone: '+91 9876543211',
      aadhaarNumber: '1234 5678 9013',
      role: 'MANAGER',
      education: 'B.Tech',
      skills: ['Project Management', 'Team Leadership'],
    },
  });
  console.log('✅ Manager user created:', manager.email);

  // Create employee user
  const employeePassword = await bcrypt.hash('employee123', 10);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {},
    create: {
      name: 'Employee User',
      email: 'employee@example.com',
      password: employeePassword,
      phone: '+91 9876543212',
      aadhaarNumber: '1234 5678 9014',
      role: 'EMPLOYEE',
      education: 'B.Com',
      skills: ['Data Entry', 'Excel', 'Communication'],
    },
  });
  console.log('✅ Employee user created:', employee.email);

  // Create sample chats
  const chat1 = await prisma.chat.create({
    data: {
      isGroup: false,
      members: {
        create: [
          { userId: admin.id },
          { userId: manager.id },
        ],
      },
      messages: {
        create: [
          {
            senderId: admin.id,
            content: 'Hi Manager, welcome to the team!',
            messageType: 'TEXT',
            status: 'SEEN',
          },
          {
            senderId: manager.id,
            content: 'Thank you! Excited to be here.',
            messageType: 'TEXT',
            status: 'SEEN',
          },
        ],
      },
    },
  });
  console.log('✅ Sample chat created between Admin and Manager');

  // Create sample group
  const group = await prisma.chat.create({
    data: {
      isGroup: true,
      name: 'Development Team',
      createdBy: admin.id,
      members: {
        create: [
          { userId: admin.id, isAdmin: true },
          { userId: manager.id, isAdmin: false },
          { userId: employee.id, isAdmin: false },
        ],
      },
      messages: {
        create: [
          {
            senderId: admin.id,
            content: 'Welcome to the Development Team group!',
            messageType: 'TEXT',
            status: 'SEEN',
          },
        ],
      },
    },
  });
  console.log('✅ Sample group created:', group.name);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\nTest credentials:');
  console.log('  Admin:    admin@example.com / admin123');
  console.log('  Manager:  manager@example.com / manager123');
  console.log('  Employee: employee@example.com / employee123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
