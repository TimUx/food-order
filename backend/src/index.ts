import http from 'http';
import app from './app';
import { config } from './config';
import { disconnectPrisma } from './config/database';
import { initSocket } from './socket';
import { logger } from './utils/logger';

const server = http.createServer(app);
initSocket(server);

server.listen(config.port, () => {
  logger.info(`Server läuft auf Port ${config.port}`);
});

const shutdown = async () => {
  logger.info('Server wird heruntergefahren...');
  server.close();
  await disconnectPrisma();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
