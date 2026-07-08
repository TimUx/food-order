import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  modulesDir: process.env.MODULES_DIR || path.join(process.cwd(), 'modules'),
  pluginsDir: process.env.PLUGINS_DIR || path.join(process.cwd(), 'plugins'),
  modulesDistDir: process.env.MODULES_DIST_DIR || path.join(process.cwd(), 'dist', 'modules'),
  coreVersion: process.env.CORE_VERSION || '1.0.0',
};
