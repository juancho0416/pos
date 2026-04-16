import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';


// Cargar variables de entorno
dotenv.config();


const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // <--- Usamos la llave maestra aquí
);

// ... el resto del script sigue igual

async function seed() {
    const rawData = fs.readFileSync('./productos.json');
    const productos = JSON.parse(rawData);

    console.log(`🚀 Iniciando carga de ${productos.length} productos...`);

    // 1. Insertar productos
    const { data: insertedProds, error: prodError } = await supabase
        .from('productos')
        .upsert(productos, { onConflict: 'sku' })
        .select();

    if (prodError) {
        console.error('❌ Error al insertar productos:', prodError);
        return;
    }

    // 2. Obtener IDs de las sucursales existentes
    const { data: sucursales } = await supabase.from('sucursales').select('id');

    // 3. Crear registros de Inventario y Precios para cada producto
    for (const prod of insertedProds) {
        // Inicializar precios en 0
        await supabase.from('precios').upsert({ producto_id: prod.id, precio_menudeo: 0, precio_mayoreo: 0 }, { onConflict: 'producto_id' });

        // Inicializar inventario en 0 para cada sucursal
        const inventarioData = sucursales.map(s => ({
            producto_id: prod.id,
            sucursal_id: s.id,
            stock_actual: 0
        }));

        await supabase.from('inventario').upsert(inventarioData, { onConflict: 'producto_id,sucursal_id' });
    }

    console.log('✅ Carga completa: Productos, Precios e Inventarios sincronizados.');
}

seed();