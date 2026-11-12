require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const at = (days, hour = 10) => {
  const x = new Date();
  x.setDate(x.getDate() + days);
  x.setHours(hour, 0, 0, 0);
  return x;
};
const code = () => crypto.randomBytes(16).toString('hex');

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
  const sam = await upsertUser({
    name: 'Sam Student', email: 'student@uni.edu', password: 'Student@123', role: 'STUDENT', department: 'Computer Science',
  });
  const priya = await upsertUser({
    name: 'Priya Sharma', email: 'priya@uni.edu', password: 'Student@123', role: 'STUDENT', department: 'Electronics',
  });
  const arjun = await upsertUser({
    name: 'Arjun Mehta', email: 'arjun@uni.edu', password: 'Student@123', role: 'STUDENT', department: 'Mechanical',
  });
  const meera = await upsertUser({
    name: 'Meera Nair', email: 'meera@uni.edu', password: 'Student@123', role: 'STUDENT', department: 'Computer Science',
  });

  if ((await prisma.event.count()) === 0) {
    const base = { organizerId: organizer.id, status: 'PUBLISHED' };

    const techFest = await prisma.event.create({
      data: {
        ...base,
        title: 'UEM Tech Fest 2026',
        description: 'Two days of coding contests, robotics demos and talks by industry guests, organised by UEM student chapters.',
        venue: 'UEM Main Auditorium', category: 'Technical',
        startsAt: at(10), endsAt: at(11, 18), capacity: 300,
        registrationDeadline: at(9),
      },
    });
    await prisma.event.create({
      data: {
        ...base,
        title: 'UEM Inter-Department Football Cup',
        description: 'Knock-out football tournament between all UEM departments. Form a team of 7 and register before the deadline.',
        venue: 'UEM Sports Ground', category: 'Sports',
        startsAt: at(5, 15), endsAt: at(5, 18), capacity: 150,
      },
    });
    await prisma.event.create({
      data: {
        ...base,
        title: 'UEM Cultural Night',
        description: 'An evening of music, dance and drama performances by UEM student clubs.',
        venue: 'UEM Open Air Theatre', category: 'Cultural',
        startsAt: at(20, 18), endsAt: at(20, 22), capacity: 500,
      },
    });
    await prisma.event.create({
      data: {
        ...base,
        title: 'Campus Placement Preparation Workshop',
        description: 'Resume building, aptitude practice and mock interviews to get final-year students ready for campus placements.',
        venue: 'UEM Seminar Hall 1', category: 'Academic',
        startsAt: at(7, 11), endsAt: at(7, 13), capacity: 120,
      },
    });
    await prisma.event.create({
      data: {
        ...base,
        title: 'UEM Smart Campus Hackathon',
        description: '24-hour hackathon: build a solution that makes campus life easier. Teams of up to 4, prizes for the top three.',
        venue: 'UEM Computer Centre', category: 'Technical',
        startsAt: at(14, 9), endsAt: at(15, 9), capacity: 200,
        registrationDeadline: at(12),
      },
    });
    // A draft: visible only to organisers and admins until it is published.
    await prisma.event.create({
      data: {
        ...base,
        status: 'DRAFT',
        title: 'UEM Alumni Meet',
        description: 'Reconnect with UEM alumni, hear career stories and network with graduates from every department.',
        venue: 'UEM Main Auditorium', category: 'Social',
        startsAt: at(30, 17), endsAt: at(30, 20), capacity: 250,
      },
    });

    // A small event that is already full, with a waitlist.
    const robotics = await prisma.event.create({
      data: {
        ...base,
        title: 'Robotics Demo Day',
        description: 'Live demos of UEM student robotics projects. Seats are limited, so join the waitlist if it is full.',
        venue: 'UEM Innovation Lab', category: 'Technical',
        startsAt: at(3, 14), endsAt: at(3, 17), capacity: 2,
      },
    });

    // A finished event with attendance (QR + manual) and feedback.
    const workshop = await prisma.event.create({
      data: {
        ...base,
        title: 'UEM Freshers Orientation',
        description: 'Welcome session for new UEM students covering campus resources, clubs and academic support.',
        venue: 'UEM Seminar Hall 2', category: 'Workshop',
        startsAt: at(-3, 10), endsAt: at(-3, 12), capacity: 50,
      },
    });

    const register = (event, user, status, minutes) =>
      prisma.registration.create({
        data: {
          eventId: event.id, userId: user.id, status, ticketCode: code(),
          joinedAt: new Date(2026, 0, 1, 0, minutes),
        },
      });

    await register(techFest, sam, 'REGISTERED', 1);

    await register(robotics, priya, 'REGISTERED', 1);
    await register(robotics, arjun, 'REGISTERED', 2);
    await register(robotics, sam, 'WAITLISTED', 3);
    await register(robotics, meera, 'WAITLISTED', 4);

    const wsSam = await register(workshop, sam, 'REGISTERED', 1);
    const wsPriya = await register(workshop, priya, 'REGISTERED', 2);
    const wsArjun = await register(workshop, arjun, 'REGISTERED', 3);
    await register(workshop, meera, 'REGISTERED', 4); // never marked: shows as "not marked"

    const when = at(-3, 10);
    await prisma.attendance.createMany({
      data: [
        { registrationId: wsSam.id, status: 'PRESENT', method: 'QR', markedById: organizer.id, checkedInAt: when },
        { registrationId: wsPriya.id, status: 'PRESENT', method: 'MANUAL', markedById: organizer.id, checkedInAt: when },
        { registrationId: wsArjun.id, status: 'ABSENT', method: 'MANUAL', markedById: organizer.id },
      ],
    });
    await prisma.feedback.createMany({
      data: [
        { eventId: workshop.id, userId: sam.id, rating: 5, comment: 'Very helpful introduction to campus life.' },
        { eventId: workshop.id, userId: priya.id, rating: 4, comment: 'Good content, could be a bit shorter.' },
      ],
    });
    await prisma.notification.create({
      data: {
        userId: sam.id,
        title: 'Welcome to UEMS',
        message: 'Register for events, show your QR pass at the door and download your attendance certificates.',
        link: '/student',
      },
    });
  }

  if ((await prisma.announcement.count()) === 0) {
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
  console.log('  Students  : student@uni.edu, priya@uni.edu, arjun@uni.edu, meera@uni.edu / Student@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
