import { payableResourceRegistry } from '../../module-system/extension-points';
import { orderPayableAdapter } from './orderPayableAdapter';

/** Core registriert zahlbare Ressourcen – Payment-Modul bleibt domänenagnostisch */
export function registerCorePayables(): void {
  payableResourceRegistry.register(orderPayableAdapter);
}
