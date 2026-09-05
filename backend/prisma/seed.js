/**
 * Seeds three development-only test accounts, one per role.
 * Passwords are hashed with bcrypt before being written to PostgreSQL -
 * plaintext passwords are never stored.
 */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const testAccounts = [
  {
    name: "Test Student",
    email: "student@unievents.edu",
    password: "Student@123",
    role: "STUDENT",
    studentId: "STU2026001",
    department: "Computer Science",
    phone: "9999900001",
  },
  {
    name: "Test Organizer",
    email: "organizer@unievents.edu",
    password: "Organizer@123",
    role: "ORGANIZER",
    studentId: null,
    department: "Student Activities Office",
    phone: "9999900002",
  },
  {
    name: "Test Admin",
    email: "admin@unievents.edu",
    password: "Admin@123",
    role: "ADMIN",
    studentId: null,
    department: "University Administration",
    phone: "9999900003",
  },
];

async function main() {
  for (const account of testAccounts) {
    const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: {
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        studentId: account.studentId,
        department: account.department,
        phone: account.phone,
      },
    });

    console.log(`Seeded ${user.role} account: ${user.email}`);
  }
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
