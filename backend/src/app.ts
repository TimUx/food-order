import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';
import { moduleManager } from './module-system';
import { registerCorePayables } from './core/payable/registerPayables';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({
  verify: (req, _res, buf) => {
    if (req.url?.includes('/webhooks/')) {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    }
  },
}));
app.use('/uploads', express.static(path.resolve(config.uploadsDir)));

app.use('/api', routes);

app.use(errorHandler);

export async function bootstrapApp(): Promise<void> {
  registerCorePayables();
  await moduleManager.initialize();
  await moduleManager.mountRoutes(routes);
}

export default app;
