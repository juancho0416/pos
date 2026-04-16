// useProducts.js — Hook para catálogo de productos
// Lee de PowerSync (SQLite local) con JOIN de inventario y precios.
// UI siempre reactiva: si PowerSync tiene datos → carga instantánea offline.
import { useMemo } from 'react'
import { useQuery } from '@powersync/react'

/**
 * Hook para acceder al catálogo de productos.
 * Lee directamente de PowerSync (SQLite local).
 * Se actualiza en tiempo real cuando PowerSync sincroniza desde Supabase.
 * Solo devuelve columnas necesarias para la UI (evita SELECT *).
 */
export function useProducts(selectedBranch, searchTerm) {
    // 1. Lógica condicional: Si es escáner (números completos) vs Teclado (texto)
    // Asumidos escáner si son 3+ dígitos continuos sin caracteres extra.
    const isBarcode = /^\d{3,}$/.test(searchTerm || '')

    let searchFilter = ''
    let queryParams = []

    if (searchTerm) {
        if (isBarcode) {
            // Optimización índice: O(1) B-TREE
            searchFilter = `AND (codigo_barras = ? OR sku = ?)`
            queryParams = [searchTerm, searchTerm, selectedBranch]
        } else {
            // Búsqueda aproximada textual
            searchFilter = `AND (nombre LIKE '%' || ? || '%' OR sku LIKE '%' || ? || '%')`
            queryParams = [searchTerm, searchTerm, selectedBranch]
        }
    } else {
        queryParams = [selectedBranch]
    }

    // JOIN entre productos, inventario y precios en el SQLite local
    // Siempre ORDER BY en SQL — evita sort en JavaScript
    const { data: rawProducts, isLoading } = useQuery(
        selectedBranch
            ? `SELECT
                p.id,
                p.nombre,
                p.codigo_barras,
                p.sku,
                p.imagen_url,
                p.categoria,
                p.linea,
                p.marca,
                p.unidad_medida,
                i.stock_actual AS stock,
                i.stock_minimo,
                pr.precio_menudeo,
                pr.precio_mayoreo,
                pr.min_mayoreo,
                i.sucursal_id
               FROM (
                   SELECT id, nombre, codigo_barras, sku, imagen_url, categoria, linea, marca, unidad_medida
                   FROM productos
                   WHERE is_deleted IS NOT 1
                   ${searchFilter}
                   ORDER BY nombre ASC
                   LIMIT 50
               ) p
               LEFT JOIN inventario i ON i.producto_id = p.id AND i.sucursal_id = ?
               LEFT JOIN precios pr ON pr.producto_id = p.id`
            : `SELECT id, nombre FROM productos LIMIT 0`,
        selectedBranch ? queryParams : []
    )

    // Mapear a la estructura que usa la UI
    const allProducts = useMemo(() => {
        if (!rawProducts || rawProducts.length === 0) return []
        return rawProducts.map(row => ({
            id: row.id,
            nombre: row.nombre,
            codigo_barras: row.codigo_barras,
            sku: row.sku,
            imagen_url: row.imagen_url,
            categoria: row.categoria,
            linea: row.linea,
            marca: row.marca,
            unidad_medida: row.unidad_medida,
            stock: row.stock ?? 0,
            stock_minimo: row.stock_minimo ?? 5,
            sucursal_id: row.sucursal_id,
            prices: {
                precio_menudeo: row.precio_menudeo ?? 0,
                precio_mayoreo: row.precio_mayoreo ?? 0,
                min_mayoreo: row.min_mayoreo ?? 0,
            }
        }))
    }, [rawProducts])

    return { products: allProducts, allProducts, isLoading }
}
