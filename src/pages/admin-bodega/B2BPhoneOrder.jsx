import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageSearch, ShoppingBag, Trash2, Plus, Minus, Search, UserCheck, Loader2 } from 'lucide-react'
import { useMayoristaStore } from '../../stores/useMayoristaStore' // Reutilizamos el store!
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'

/**
 * ESTE COMPONENTE ES UN HÍBRIDO.
 * Corre dentro de /admin-bodega pero usa useMayoristaStore asilado para simular 
 * que el Jefe de Bodega está usando el E-Commerce en nombre del cliente.
 */
export default function B2BPhoneOrder() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { cart, addToCart, removeFromCart, updateQuantity, calculateTotal, clearCart } = useMayoristaStore()

    const [b2bBranchId, setB2bBranchId] = useState(null)
    const [productos, setProductos] = useState([])
    const [clientes, setClientes] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedClientId, setSelectedClientId] = useState('')
    const [loadingParams, setLoadingParams] = useState(true)
    const [processing, setProcessing] = useState(false)

    // 1. Setup Inicial: Traer inventario y clientes
    useEffect(() => {
        const fetchDependencies = async () => {
            setLoadingParams(true)
            try {
                // A. Sucursal Bodega
                const { data: sucData } = await supabase.from('sucursales').select('id').ilike('nombre', '%Bodega Mayoreo%').limit(1).single()
                const bodId = sucData ? sucData.id : 2
                setB2bBranchId(bodId)

                // B. Catálogo B2B
                const { data: prodData } = await supabase
                    .from('productos')
                    .select('id, nombre, sku, imagen_url, precios(precio_mayoreo), inventario!inner(stock_actual, sucursal_id)')
                    .eq('inventario.sucursal_id', bodId)
                    .gt('inventario.stock_actual', 0) // Solo con stock real en bodega

                if (prodData) {
                    setProductos(prodData.map(p => ({
                        id: p.id,
                        sku: p.sku,
                        nombre: p.nombre,
                        imagen_url: p.imagen_url,
                        stock: p.inventario[0]?.stock_actual || 0,
                        precio_mayoreo: p.precios?.[0]?.precio_mayoreo || p.precios?.precio_mayoreo || 0
                    })))
                }

                // C. Catálogo de Clientes B2B
                const { data: clientData } = await supabase
                    .from('clientes')
                    .select('id, nombre_empresa, nombre, limite_credito, rfc, saldo_deudor')
                    .eq('rol', 'MAYORISTA')
                    .order('nombre_empresa', { ascending: true })

                if (clientData) setClientes(clientData)

            } catch (error) {
                console.error("Error al cargar dependencias de pedido telefónico:", error)
                toast.error("Error de inicialización.")
            } finally {
                setLoadingParams(false)
            }
        }
        fetchDependencies()
    }, [])

    const handleAddToCart = (prod) => {
        // Adaptamos el payload al modelo que espera useMayoristaStore
        addToCart({
            id: prod.id,
            nombre: prod.nombre,
            imagen_url: prod.imagen_url,
            currentPrice: prod.precio_mayoreo,
            stock: prod.stock
        })
        toast.success(`Añadido: ${prod.nombre}`)
    }

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return toast.error("El carrito está vacío.")
        if (!selectedClientId) return toast.error("Debes seleccionar un cliente para facturar.")

        setProcessing(true)
        toast.loading('Forzando ingreso al Kanban principal...', { id: 'phone_order' })

        try {
            const clienteSeleccionado = clientes.find(c => String(c.id) === String(selectedClientId))
            const total = calculateTotal()

            const payload = {
                sucursal_id: b2bBranchId,
                total: total,
                vendedor_id: user.id, // Queda rastro de que lo capturó el bodeguero
                cliente_id: clienteSeleccionado.id,
                tipo_venta: 'MAYOREO',
                items: cart.map(item => ({
                    producto_id: item.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: item.currentPrice
                })),
                metodo_pago: 'CREDITO',
                estado_entrega: 'PENDIENTE',
                metodo_entrega: 'RECOGE_EN_BODEGA', // Asumido por defecto en venta telefónica
                direccion_entrega: 'En Mostrador de Bodega Central',
                nombre_receptor: clienteSeleccionado.nombre_empresa || clienteSeleccionado.nombre
            }

            // Push a BDD
            const { error } = await supabase.from('ventas').insert([payload])
            if (error) throw error

            // Sincronizar Crédito (Debt Increase)
            const nuevoSaldo = (clienteSeleccionado.saldo_deudor || 0) + total
            await supabase.from('clientes').update({ saldo_deudor: nuevoSaldo }).eq('id', clienteSeleccionado.id)

            toast.success(`Orden #TKT generada para ${clienteSeleccionado.nombre_empresa}. El saldo deudor fue actualizado.`, { id: 'phone_order' })
            clearCart()

            // Volvemos al Kanban donde el RealTime lo detectará al instante
            navigate('/admin-bodega/pedidos')

        } catch (error) {
            console.error("Fallo levantamiento:", error)
            toast.error("Error al despachar el pedido.", { id: 'phone_order' })
        } finally {
            setProcessing(false)
        }
    }

    const filteredCatalog = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 50) // Limitar renderizado para velocidad

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">
            {/* Lado Izquierdo: Catálogo y Búsqueda */}
            <div className="w-full md:w-3/5 lg:w-2/3 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center z-10">
                    <h2 className="text-white font-bold font-display flex items-center gap-2">
                        <PackageSearch className="text-indigo-400 w-5 h-5" /> Catálogo Mayorista
                    </h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar en bodega..."
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm text-white placeholder-slate-400 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {loadingParams ? (
                        <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
                    ) : filteredCatalog.map(p => (
                        <div key={p.id} onClick={() => handleAddToCart(p)} className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 p-3 rounded-xl cursor-pointer transition-all flex flex-col h-full group">
                            <div className="text-xs font-bold text-indigo-400 mb-1">{p.sku}</div>
                            <h3 className="text-sm text-slate-200 font-medium line-clamp-2 leading-snug mb-2 flex-grow">{p.nombre}</h3>
                            <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-700/50">
                                <span className="text-xs text-slate-500">{p.stock} pz</span>
                                <span className="text-emerald-400 font-bold">${Number(p.precio_mayoreo).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lado Derecho: Carrito y Cliente (Checkout) */}
            <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950">
                    <h2 className="text-white font-bold font-display flex items-center gap-2 mb-4">
                        <UserCheck className="text-emerald-400 w-5 h-5" /> Asignación de Cliente
                    </h2>
                    <select
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="">-- Seleccione Constructora / Mayorista --</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.nombre_empresa || c.nombre} ({c.rfc || 'Sin RFC'})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <ShoppingBag className="w-12 h-12 mb-3" />
                            <p className="text-sm">Sin partidas cargadas</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.id} className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex gap-3">
                            <div className="flex-1">
                                <p className="text-sm text-white font-medium line-clamp-1">{item.nombre}</p>
                                <p className="text-xs text-indigo-400">${item.currentPrice}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                                <div className="flex items-center gap-2 bg-slate-900 rounded-md p-0.5">
                                    <button onClick={() => updateQuantity(item.id, item.cantidad - 1)} className="p-1 text-slate-400 hover:text-white"><Minus size={14} /></button>
                                    <span className="text-sm font-bold w-6 text-center text-white">{item.cantidad}</span>
                                    <button onClick={() => updateQuantity(item.id, item.cantidad + 1)} className="p-1 text-slate-400 hover:text-white" disabled={item.cantidad >= item.stock}><Plus size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t border-slate-800 bg-slate-950">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-slate-400 text-sm">Total a imputar:</span>
                        <span className="text-2xl font-bold text-white tracking-tight">${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={clearCart} className="px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-bold transition-colors">
                            Limpiar
                        </button>
                        <button
                            onClick={handleSubmitOrder}
                            disabled={processing}
                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                        >
                            {processing ? 'Emitiendo...' : 'Levantar Pedido'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
