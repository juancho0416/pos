import { useMemo } from 'react'
import { useQuery } from '@powersync/react'

/**
 * Hook para inyectar configuraciones maestras de la empresa
 * de forma reactiva (Directamente desde SQLite/PowerSync).
 * Convierte el array de llave:valor en un objeto de acceso directo.
 */
export function useSettings() {
    const { data: configItems = [], isLoading } = useQuery(`SELECT llave, valor FROM configuraciones_sistema`)

    const settings = useMemo(() => {
        const defaults = {
            // Financieras
            porcentaje_monedero: 0,
            iva_default: 16,
            utilidad_menudeo_default: 30,
            utilidad_medio_mayoreo_default: 20,
            utilidad_mayoreo_default: 15,
            
            // Operativas
            permitir_venta_sin_stock: 'false',
            requiere_pin_cancelacion: 'false',
            
            // Identidad (Tickets)
            empresa_nombre: 'Mi Empresa POS',
            empresa_rfc: 'RFC123456789',
            empresa_direccion: 'Calle Principal 123, Centro',
            empresa_telefono: '',
            ticket_lema: '¡Gracias por su compra!'
        }

        // Mapear los extraídos de la BD sobre los defaults
        configItems.forEach(row => {
            if (row.llave && row.valor !== null) {
                // Parseo inteligente (si parece un número o arreglo, pero usualmente son str/boolean/num)
                defaults[row.llave] = row.valor
            }
        })
        
        return defaults
    }, [configItems])

    // Utility methods for typing
    const getNumber = (key, fallback = 0) => {
        const val = parseFloat(settings[key])
        return isNaN(val) ? fallback : val
    }
    
    const getBool = (key, fallback = false) => {
        if (settings[key] === 'true' || settings[key] === true || settings[key] === '1') return true
        if (settings[key] === 'false' || settings[key] === false || settings[key] === '0') return false
        return fallback
    }

    return {
        settings,
        getNumber,
        getBool,
        isLoading
    }
}
