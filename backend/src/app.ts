import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { corsPolicy } from './middleware/corsPolicy';
import { requestContextMiddleware } from './middleware/requestContext';
import { config } from './config';
import { moduleManager, createTenantMiddlewareStack, initializeTenantInfrastructure, tenantContext, tenantService } from './platform/bootstrap';
import { registerCorePayables } from './core/payable/registerPayables';
import { migrateLegacySettingsSecrets } from './core/settings/migrateLegacySecrets';
import { createUploadAccessMiddleware } from './middleware/uploadAccess';

const app = express();

const trustProxy =
  config.multiTenant.trustProxyHops > 0 ? config.multiTenant.trustProxyHops : false;
app.set('trust proxy', trustProxy);

app.use(requestContextMiddleware);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsPolicy.corsOptions()));
app.use(express.json({
  verify: (req, _res, buf) => {
    if (req.url?.includes('/webhooks/')) {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    }
  },
}));

for (const middleware of createTenantMiddlewareStack()) {
  app.use(middleware);
}

app.use('/uploads', createUploadAccessMiddleware());

app.use('/api/v1', routes);
app.use('/api', routes);

app.use(errorHandler);

export async function bootstrapApp(): Promise<void> {
  await initializeTenantInfrastructure();
  registerCorePayables();

  const defaultTenant = await tenantService.getDefaultTenant();
  const contextData = await tenantService.resolveContextData(defaultTenant);
  await tenantContext.runAsync(contextData, async () => {
    await migrateLegacySettingsSecrets();
    await moduleManager.initialize();
  });

  await moduleManager.mountRoutes(routes);
}

export default app;
