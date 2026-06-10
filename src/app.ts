import express from 'express';
import { config } from './config/env';
import { testConnection } from './config/database';
import { startPoller, stopPoller } from './services/poller.service';
import { startRecapScheduler } from './scheduler/recap.scheduler';
import router from './routes/index';

const app = express();
app.use(express.json());
app.use('/api', router);

async function main(): Promise<void> {
  await testConnection();
  console.log('[DB] Connected to MySQL');

  startPoller();
  startRecapScheduler();

  const server = app.listen(config.port, () => {
    console.log(`[SERVER] Running on port ${config.port}`);
  });

  const shutdown = (): void => {
    console.log('[SERVER] Shutting down...');
    stopPoller();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
