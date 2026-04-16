import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
    console.log("Fetching inventario...");
    const { data: inv, error: errInv } = await supabase.from('inventario').select('*');
    if (errInv) {
        console.error("Error fetching inventario:", errInv);
        process.exit(1);
    }

    if (!inv || inv.length === 0) {
        console.log("No inventory found to seed.");
        process.exit(0);
    }

    // Check if kardex already has entries
    const { count } = await supabase.from('kardex').select('*', { count: 'exact', head: true });
    if (count > 0) {
        console.log(`Kardex already has ${count} entries. Skipping seed to prevent duplicates.`);
        process.exit(0);
    }

    console.log(`Seeding Kardex with ${inv.length} initial items using saldo_previo and saldo_nuevo...`);
    const kardexEntries = inv.map(i => ({
        producto_id: i.producto_id,
        sucursal_id: i.sucursal_id,
        tipo_movimiento: 'AJUSTE',
        cantidad: i.stock_actual,
        saldo_previo: 0,
        saldo_nuevo: i.stock_actual,
        referencia_id: null
    }));

    const { error: errInsert } = await supabase.from('kardex').insert(kardexEntries);
    if (errInsert) {
        console.error("Error inserting seed data:", errInsert);
        process.exit(1);
    }

    console.log("Seed successful!");
    process.exit(0);
}

seed();
