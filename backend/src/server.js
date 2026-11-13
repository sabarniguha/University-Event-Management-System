require('dotenv').config();
const app = require('./app');
const prisma = require('./utils/prismaClient');
const { ensureDefaults } = require('./utils/settings');
const { startReminderJob } = require('./utils/reminders');

const PORT = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Add it to backend/.env (or your host environment variables).');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  console.warn('[security] JWT_SECRET is shorter than 32 characters. Use a long random value in production.');
}

const server = app.listen(PORT, () => {
  console.log(`UniEvents API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  ensureDefaults().catch((e) => console.error('[startup] could not create default categories:', e.message));
  startReminderJob();
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
