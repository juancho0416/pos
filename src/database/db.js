import Dexie from 'dexie'

// ⚡ Declaramos la instancia local de IndexedDB usando Dexie
export const db = new Dexie('FerreteriaOfflineDB')

// 📦 Definición del Esquema (Tablas Locales y sus Índices pre-compilados)
// El primer campo es el Primary Key, los siguientes son índices para búsquedas rápidas.
db.version(1).stores({
    // Cola de Ventas (Para cuando se cae el internet)
    ventas_pendientes: '++id, branchId, timestamp, syncStatus',

    // Catálogo Caché (Para modo avión/desconexión)
    productos_cache: 'id, codigo_barras, categoria, nombre',

    // Clientes Caché (Menudeo y B2B)
    clientes_cache: 'id, nombre, rfc, rol'
})

console.log("🔋 [IndexedDB] FerreteriaOfflineDB Inicializada")
