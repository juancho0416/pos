import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function refresh() {
    console.log("Refreshing Supabase cache...");
    // Supabase has NOTIFY pgrst for reloading schemas. We can just execute a query via REST to an empty function, or we can use the PostgREST RPC reload interface if exposed. Usually it reloads on its own after a while but we can force it by doing an alter table or just inserting something simple without referencing. Actually wait, it means the user DID run the SQL script but the API cache hasn't synced. Let's force a schema cache reload.
    
    // We can execute SQL through pg node directly, but we only have supabase keys.
    // The easiest way is to wait a few seconds, or use the database direct connection string if available.
    // We don't have the direct Postgres URL. Let's try again in a few seconds as it usually clears out automatically if the user just ran the script.
    const { error: errInsert } = await supabase.from('kardex').insert([{
        producto_id: 1, sucursal_id: 1, tipo_movimiento: 'AJUSTE', cantidad: 0, stock_anterior: 0, stock_nuevo: 0, referencia: 'test'
    }]);

    console.log(errInsert)
    // Wait for the cache flush (up to 2 minutes on free tier sometimes, but typically immediate)
}
refresh();
