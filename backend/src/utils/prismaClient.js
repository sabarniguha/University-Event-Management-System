const { PrismaClient } = require('@prisma/client');

const prisma = global.__uemsPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__uemsPrisma = prisma;

module.exports = prisma;
