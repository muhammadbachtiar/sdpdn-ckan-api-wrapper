import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`SDPDN CKAN Wrapper berjalan di http://localhost:${env.PORT}`);
  console.log(`Swagger UI: http://localhost:${env.PORT}/docs`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
