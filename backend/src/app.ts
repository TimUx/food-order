import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(config.uploadsDir)));

app.use('/api', routes);

app.use(errorHandler);

export default app;
