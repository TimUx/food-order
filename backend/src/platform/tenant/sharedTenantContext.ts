import { TenantContext } from './TenantContext';

/** Shared singleton — avoids circular imports with bootstrap. */
export const sharedTenantContext = new TenantContext();
