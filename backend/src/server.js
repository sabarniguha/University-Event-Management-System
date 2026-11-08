require('dotenv').config();
const app = require('./app');
const prisma = require('./utils/prismaClient');

const PORT = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Add it to backend/.env (or your host environment variables).');
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`UEMS API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
