import './config/env';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/db';
import { startReminderScheduler } from './modules/notifications/notif.scheduler';

async function main() {
  await prisma.$connect();
  console.log('Database connected');

  startReminderScheduler();

  app.listen(Number(env.PORT), () => {
    console.log(`API running on http://localhost:${env.PORT}`);
  });
}

main().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
