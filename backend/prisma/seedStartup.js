// Optional first-deploy bootstrap, run automatically by `npm start`.
//
// It does NOTHING unless the environment variable SEED_ON_START is "true". When it is, it:
//   1. creates the admin account (SEED_ADMIN_EMAIL, default admin@uni.edu) using SEED_ADMIN_PASSWORD, if missing
//   2. adds UEM sample events owned by that admin, but only if the database has no events yet
// It creates no demo students or organisers, so no public passwords end up on a live site.
// After the first successful deploy, remove SEED_ON_START (and SEED_ADMIN_PASSWORD) from the host.
require('dotenv').config();

if (process.env.SEED_ON_START !== 'true') {
  console.log('[seed-on-start] SEED_ON_START is not "true" - skipping.');
  process.exit(0);
}

const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@uni.edu').trim().toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || '';
if (adminPassword.length < 8) {
  console.error('[seed-on-start] Set SEED_ADMIN_PASSWORD (at least 8 characters) when SEED_ON_START is "true".');
  process.exit(1);
}

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const at = (days, hour = 10) => {
  const x = new Date();
  x.setDate(x.getDate() + days);
  x.setHours(hour, 0, 0, 0);
  return x;
};

const sampleEvents = (organizerId) => {
  const base = { organizerId, status: 'PUBLISHED' };
  return [
    {
      ...base,
      title: 'UEM Tech Fest 2026',
      description: 'Two days of coding contests, robotics demos and talks by industry guests, organised by UEM student chapters.',
      venue: 'UEM Main Auditorium', category: 'Technical',
      startsAt: at(10), endsAt: at(11, 18), capacity: 300, registrationDeadline: at(9),
    },
    {
      ...base,
      title: 'UEM Inter-Department Football Cup',
      description: 'Knock-out football tournament between all UEM departments. Form a team of 7 and register before the deadline.',
      venue: 'UEM Sports Ground', category: 'Sports',
      startsAt: at(5, 15), endsAt: at(5, 18), capacity: 150,
    },
    {
      ...base,
      title: 'UEM Cultural Night',
      description: 'An evening of music, dance and drama performances by UEM student clubs.',
      venue: 'UEM Open Air Theatre', category: 'Cultural',
      startsAt: at(20, 18), endsAt: at(20, 22), capacity: 500,
    },
    {
      ...base,
      title: 'Campus Placement Preparation Workshop',
      description: 'Resume building, aptitude practice and mock interviews to get final-year students ready for campus placements.',
      venue: 'UEM Seminar Hall 1', category: 'Academic',
      startsAt: at(7, 11), endsAt: at(7, 13), capacity: 120,
    },
    {
      ...base,
      title: 'UEM Smart Campus Hackathon',
      description: '24-hour hackathon: build a solution that makes campus life easier. Teams of up to 4, prizes for the top three.',
      venue: 'UEM Computer Centre', category: 'Technical',
      startsAt: at(14, 9), endsAt: at(15, 9), capacity: 200, registrationDeadline: at(12),
    },
    {
      ...base,
      title: 'Robotics Demo Day',
      description: 'Live demos of UEM student robotics projects by the robotics club.',
      venue: 'UEM Innovation Lab', category: 'Technical',
      startsAt: at(3, 14), endsAt: at(3, 17), capacity: 80,
    },
    {
      ...base,
      status: 'DRAFT', // visible only to organisers and admins until published
      title: 'UEM Alumni Meet',
      description: 'Reconnect with UEM alumni, hear career stories and network with graduates from every department.',
      venue: 'UEM Main Auditorium', category: 'Social and Community',
      startsAt: at(30, 17), endsAt: at(30, 20), capacity: 250,
    },
  ];
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // never overwrite the password of an existing account
    create: {
      name: 'System Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
      department: 'Administration',
    },
  });
  console.log(`[seed-on-start] Admin account ready: ${adminEmail}`);

  if ((await prisma.event.count()) === 0) {
    await prisma.event.createMany({ data: sampleEvents(admin.id) });
    console.log('[seed-on-start] Added UEM sample events.');
  } else {
    console.log('[seed-on-start] Events already exist - not adding samples.');
  }

  if ((await prisma.announcement.count()) === 0) {
    await prisma.announcement.create({
      data: {
        title: 'Welcome to the UEM Event Portal',
        content: 'Browse upcoming events, register with one click and track your attendance from your dashboard.',
        audience: 'ALL', priority: 'NORMAL', status: 'PUBLISHED', publishedAt: new Date(), authorId: admin.id,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('[seed-on-start] Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
