import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './AppSchema';
import { SupabaseConnector } from './SupabaseConnector';

// Create a single instance of the database
export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'ferreteria_v1.db'
  }
});

export const supabaseConnector = new SupabaseConnector();

export const setupPowerSync = async () => {
  // Initialize and connect to PowerSync using the connector
  await powersync.init();
  await powersync.connect(supabaseConnector);
};
