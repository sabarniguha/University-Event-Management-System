require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const daysFromNow = (d, hour = 10) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(hour, 0, 0, 0);
  return x;
};

async function upsertUser({ name, email, password, role, department }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role, department },
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@uni.edu';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

  const admin = await upsertUser({
    name: 'System Admin', email: adminEmail, password: adminPassword, role: 'ADMIN', department: 'Administration',
  });
  const organizer = await upsertUser({
    name: 'Olivia Organizer', email: 'organizer@uni.edu', password: 'Organizer@123', role: 'ORGANIZER', department: 'Student Affairs',
  });
  await upsertUser({
    name: 'Sam Student', email: 'student@uni.edu', password: 'Student@123', role: 'STUDENT', department: 'Computer Science',
  });

  const existing = await prisma.event.count();
  if (existing === 0) {
    await prisma.event.createMany({
      data: [
        {
          title: 'Annual Tech Fest 2026',
          description: 'Two days of hackathons, talks and project demos by students and industry guests.',
          venue: 'Main Auditorium', category: 'Technical',
          startsAt: daysFromNow(10), endsAt: daysFromNow(11, 18), capacity: 300,
          status: 'PUBLISHED', organizerId: organizer.id,
        },
        {
          title: 'Inter-Department Football Cup',
          description: 'Knock-out football tournament between all departments.',
          venue: 'University Ground', category: 'Sports',
          startsAt: daysFromNow(5, 15), endsAt: daysFromNow(5, 18), capacity: 150,
          status: 'PUBLISHED', organizerId: organizer.id,
        },
        {
          title: 'Cultural Night',
          description: 'Music, dance and drama performances by student clubs.',
          venue: 'Open Air Theatre', category: 'Cultural',
          startsAt: daysFromNow(20, 18), endsAt: daysFromNow(20, 22), capacity: 500,
          status: 'DRAFT', organizerId: organizer.id,
        },
      ],
    });
  }

  const announcements = await prisma.announcement.count();
  if (announcements === 0) {
    await prisma.announcement.create({
      data: {
        title: 'Welcome to the University Event Portal',
        content: 'Browse upcoming events, register with one click and track your attendance from your dashboard.',
        audience: 'ALL', priority: 'NORMAL', status: 'PUBLISHED', publishedAt: new Date(), authorId: admin.id,
      },
    });
  }

  console.log('Seed complete.');
  console.log(`  Admin     : ${adminEmail} / ${adminPassword}`);
  console.log('  Organizer : organizer@uni.edu / Organizer@123');
  console.log('  Student   : student@uni.edu / Student@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
