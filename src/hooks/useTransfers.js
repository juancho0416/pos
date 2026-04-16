import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'

/**
 * Hook que encapsula toda la lógica de traspasos de mercancía:
 * fetching, carrito de transferencia, solicitar, cancelar, stock check.
 */
export function useTransfers({ user, branches, selectedBranch }) {
    const [activeTab, setActiveTab] = useState('solicitar')
    const [products, setProducts] = useState([])
    const [traslados, setTraslados] = useState([])
    const [loading, setLoading] = useState(false)
    const [dispatchTarget, setDispatchTarget] = useState(null)
    const [receiveTarget, setReceiveTarget] = useState(null)

    const [destId, setDestId] = useState('')
    const [cart, setCart] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [notas, setNotas] = useState('')
    const [stockMap, setStockMap] = useState({})
    const [loadingStock, setLoadingStock] = useState(false)

    useEffect(() => {
        supabase.from('productos').select('id, nombre, sku, codigo_barras')
            .order('nombre').then(({ data }) => { if (data) setProducts(data) })
    }, [])

    const fetchTraslados = useCallback(async () => {
        if (!selectedBranch) return
        setLoading(true)
        const { data, error } = await supabase
            .from('traslados')
            .select(`*, items:traslado_items(id, cantidad, producto:productos(id, nombre, sku))`)
            .or(`origen_id.eq.${selectedBranch},destino_id.eq.${selectedBranch}`)
            .in('estado', ['SOLICITADO', 'EN_TRANSITO'])
            .order('created_at', { ascending: false })
        if (error) console.error('Error fetching traslados:', error)
        else setTraslados(data || [])
        setLoading(false)
    }, [selectedBranch])

    useEffect(() => { fetchTraslados() }, [fetchTraslados])

    const fetchStockForProduct = useCallback(async (productoId) => {
        if (!destId || stockMap[productoId] !== undefined) return
        setLoadingStock(true)
        const { data } = await supabase.from('inventario').select('stock_actual')
            .eq('producto_id', productoId).eq('sucursal_id', destId).single()
        setStockMap(prev => ({ ...prev, [productoId]: data?.stock_actual ?? 0 }))
        setLoadingStock(false)
    }, [destId, stockMap])

    useEffect(() => { setStockMap({}) }, [destId])

    const addToCart = useCallback((product) => {
        setCart(prev => {
            const existing = prev.find(c => c.producto_id === product.id)
            if (existing) return prev.map(c => c.producto_id === product.id ? { ...c, cantidad: c.cantidad + 1 } : c)
            return [...prev, { producto_id: product.id, nombre: product.nombre, sku: product.sku, cantidad: 1 }]
        })
        fetchStockForProduct(product.id)
        setSearchTerm('')
    }, [fetchStockForProduct])

    const updateCartQty = useCallback((productoId, qty) => {
        if (qty <= 0) setCart(prev => prev.filter(c => c.producto_id !== productoId))
        else setCart(prev => prev.map(c => c.producto_id === productoId ? { ...c, cantidad: qty } : c))
    }, [])

    const hasStockError = cart.some(item => {
        const available = stockMap[item.producto_id]
        return available !== undefined && item.cantidad > available
    })

    const handleSolicitar = useCallback(async () => {
        if (!destId || cart.length === 0) { toast.error('Selecciona una sucursal destino y al menos un producto'); return }
        if (destId === String(selectedBranch)) { toast.error('Origen y destino no pueden ser la misma sucursal'); return }
        if (hasStockError) { toast.error('Corrige las cantidades que exceden el stock disponible'); return }

        setLoading(true)
        try {
            const { data: traslado, error: tErr } = await supabase.from('traslados')
                .insert({ origen_id: destId, destino_id: selectedBranch, solicitado_por: user.id, notas: notas || null })
                .select().single()
            if (tErr) throw tErr

            const items = cart.map(c => ({ traslado_id: traslado.id, producto_id: c.producto_id, cantidad: c.cantidad }))
            const { error: iErr } = await supabase.from('traslado_items').insert(items)
            if (iErr) throw iErr

            toast.success('Solicitud de traslado creada exitosamente')

            // Auto WhatsApp
            try {
                const { data: sucOrigen } = await supabase.from('sucursales').select('nombre, telefono_encargado').eq('id', destId).single()
                if (sucOrigen?.telefono_encargado) {
                    const miSucursal = branches.find(b => b.id === selectedBranch)?.nombre || 'Otra sucursal'
                    const folio = String(traslado.folio).padStart(4, '0')
                    const itemsList = cart.map(c => `  • ${c.nombre} x${c.cantidad}`).join('\n')
                    const msg = `🚨 *NUEVA SOLICITUD DE TRASPASO* 🚨\n\n📍 De: ${miSucursal}\n📦 A: ${sucOrigen.nombre}\n📋 Folio: #${folio}\n\nArtículos:\n${itemsList}\n\nPor favor, entra al sistema para despachar el material.`
                    window.open(`https://wa.me/${sucOrigen.telefono_encargado}?text=${encodeURIComponent(msg)}`, '_blank')
                }
            } catch { /* WhatsApp no es crítico */ }

            setCart([]); setDestId(''); setNotas(''); setStockMap({})
            fetchTraslados()
        } catch (err) { toast.error('Error: ' + err.message) }
        finally { setLoading(false) }
    }, [destId, cart, selectedBranch, user, notas, hasStockError, branches, fetchTraslados])

    const handleCancelar = useCallback(async (traslado) => {
        if (!confirm('¿Cancelar esta solicitud?')) return
        setLoading(true)
        try {
            const { error } = await supabase.from('traslados')
                .update({ estado: 'CANCELADO', updated_at: new Date().toISOString() }).eq('id', traslado.id)
            if (error) throw error
            toast.success('Solicitud cancelada'); fetchTraslados()
        } catch (err) { toast.error('Error: ' + err.message) }
        finally { setLoading(false) }
    }, [fetchTraslados])

    // Filtered data
    const solicitudesEntrantes = traslados.filter(t => t.estado === 'SOLICITADO' && t.origen_id === selectedBranch)
    const enTransito = traslados.filter(t => t.estado === 'EN_TRANSITO' && t.destino_id === selectedBranch)
    const misSolicitudes = traslados.filter(t => t.estado === 'SOLICITADO' && t.destino_id === selectedBranch)
    const filteredProducts = searchTerm.length > 0
        ? products.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))).slice(0, 8)
        : []

    return {
        activeTab, setActiveTab, loading,
        dispatchTarget, setDispatchTarget, receiveTarget, setReceiveTarget,
        destId, setDestId, cart, setCart, searchTerm, setSearchTerm,
        notas, setNotas, stockMap, loadingStock, hasStockError,
        addToCart, updateCartQty, handleSolicitar, handleCancelar,
        fetchTraslados,
        solicitudesEntrantes, enTransito, misSolicitudes, filteredProducts,
    }
}
