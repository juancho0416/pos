import React, { useEffect, useState } from 'react'
import { Search, Loader2, PackageSearch } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useMayoristaStore } from '../../stores/useMayoristaStore'
import { toast } from 'sonner'

export default function B2BCatalog() {
    const [productos, setProductos] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [b2bBranchId, setB2bBranchId] = useState(null)
    const addToCart = useMayoristaStore(state => state.addToCart)

    // 1. Obtener ID de la 'Bodega Mayoreo' para aislar el stock
    useEffect(() => {
        const fetchBranch = async () => {
            try {
                // Buscamos dinámicamente la bodega B2B
                const { data, error } = await supabase
                    .from('sucursales')
                    .select('id')
                    .ilike('nombre', '%Bodega Mayoreo%') // O asumes su ID = 2 si es estático
                    .limit(1)
                    .single()

                if (data) {
                    setB2bBranchId(data.id)
                } else {
                    console.warn("Bodega Mayoreo no encontrada. Se usará un fallback (ID: 2).")
                    setB2bBranchId(2) // fallback asumiendo q sucursal principal es 1 y bodega es 2
                }
            } catch (err) {
                console.error(err)
            }
        }
        fetchBranch()
    }, [])

    // 2. Traer productos filtrados solo por el stock de la bodega B2B
    useEffect(() => {
        if (!b2bBranchId) return

        const fetchProductos = async () => {
            setLoading(true)
            try {
                // Joins con inventario y precios. Exigimos inventario.sucursal_id = b2bBranchId
                const { data, error } = await supabase
                    .from('productos')
                    .select(`
                        id, nombre, sku, imagen_url,
                        precios(precio_mayoreo),
                        inventario!inner(stock_actual, sucursal_id)
                    `)
                    .eq('inventario.sucursal_id', b2bBranchId)

                if (error) throw error

                if (data) {
                    const mapped = data.map(p => {
                        const inv = p.inventario?.[0] || null
                        const pre = p.precios?.[0] || p.precios || {}
                        return {
                            id: p.id,
                            nombre: p.nombre,
                            sku: p.sku,
                            imagen_url: p.imagen_url,
                            stock: inv ? inv.stock_actual : 0,
                            precio_mayoreo: pre.precio_mayoreo || 0
                        }
                    })
                    // Solo mostramos lo que efectivamente tiene precio de mayoreo cargado
                    setProductos(mapped.filter(m => m.precio_mayoreo > 0))
                }
            } catch (err) {
                console.error('Error fetching B2B Catalog', err)
                toast.error('Error al cargar catálogo')
            } finally {
                setLoading(false)
            }
        }

        fetchProductos()
    }, [b2bBranchId])

    const handleAdd = (producto) => {
        if (producto.stock <= 0) {
            toast.error('Producto sin disponibilidad en Bodega Central')
            return
        }
        addToCart(producto, 1) // Añade 1 pieza por defecto al hacer clic
        toast.success(`1x ${producto.nombre} añadido al pedido.`)
    }

    const filteredCatalog = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            {/* Cabecera y Buscador */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-slate-800">Catálogo Mayorista</h2>
                    <p className="text-sm text-slate-500">Mínimo de compra y existencias exclusivas desde la Bodega Principal.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por descripción o SKU..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-slate-50 focus:bg-white"
                    />
                </div>
            </div>

            {/* Grid de Productos */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                    <Loader2 className="w-12 h-12 flex-shrink-0 animate-spin text-indigo-500 mb-4" />
                    <p>Sincronizando inventario de Bodega Central...</p>
                </div>
            ) : filteredCatalog.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                    <PackageSearch className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600">No se encontraron productos coincidentes.</p>
                    <p className="text-sm">Elimina los filtros de búsqueda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredCatalog.map(producto => (
                        <div key={producto.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                            {/* Imagen */}
                            <div className="aspect-square bg-slate-50 relative p-4 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                                {producto.imagen_url ? (
                                    <img
                                        src={producto.imagen_url}
                                        alt={producto.nombre}
                                        className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => { e.target.src = '/placeholder.png' }}
                                    />
                                ) : (
                                    <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                                        <PackageSearch className="w-8 h-8" />
                                    </div>
                                )}

                                {/* Insignia de Stock Real */}
                                <div className="absolute top-3 left-3 flex gap-2">
                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md text-white shadow-sm
                                        ${producto.stock > 10 ? 'bg-emerald-500' : producto.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}
                                    `}>
                                        {producto.stock > 0 ? `Bodega: ${producto.stock}` : 'Agotado en Bodega'}
                                    </span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-5 flex-1 flex flex-col">
                                {producto.sku && <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1 block">SKU: {producto.sku}</span>}
                                <h3 className="font-semibold text-slate-800 text-sm mb-3 line-clamp-2 leading-snug flex-1">
                                    {producto.nombre}
                                </h3>

                                <div className="flex items-end justify-between mt-auto">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Precio Mayoreo</p>
                                        <p className="font-bold text-xl text-indigo-700 tracking-tight">
                                            ${Number(producto.precio_mayoreo).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleAdd(producto)}
                                    disabled={producto.stock <= 0}
                                    className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all focus:ring-4
                                        ${producto.stock <= 0
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-200 focus:ring-indigo-100'
                                        }
                                    `}
                                >
                                    {producto.stock <= 0 ? 'Sin Existencia' : 'Añadir al Pedido'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
