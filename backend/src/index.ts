import http from 'http';
import app, { bootstrapApp } from './app';
import { config } from './config';
import { disconnectPrisma } from './config/database';
import { initSocket } from './socket';
import { logger } from './utils/logger';
import { moduleManager } from './module-system';

async function start() {
  await bootstrapApp();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    logger.info(`Server läuft auf Port ${config.port}`);
  });

  const shutdown = async () => {
    logger.info('Server wird heruntergefahren...');
    await moduleManager.shutdown();
    server.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('Serverstart fehlgeschlagen', err);
  process.exit(1);
});
