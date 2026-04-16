import { useState, useRef, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useAuth } from '../context/AuthContext'
import { powersync } from '../powersync/db'
import { useQuery } from '@powersync/react'
import { toast } from 'sonner'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { FileJson } from 'lucide-react'

import ReceptionTopBar from '../components/reception/ReceptionTopBar'
import ReceptionCartTable from '../components/reception/ReceptionCartTable'
import ReceptionSidebar from '../components/reception/ReceptionSidebar'
import ScannerModal from '../components/sales/modals/ScannerModal'
import CFDIUploadModal from '../components/sales/modals/CFDIUploadModal'

/**
 * Builds a full cart item with all professional fields
 * from an existing product (catalog match) or raw CFDI data
 */
function buildCartItem(product = {}, overrides = {}) {
    const costo = overrides.costo ?? product.costo_compra ?? 0
    const precio_menudeo = overrides.precio_menudeo ?? product.precio_menudeo ?? parseFloat((costo * 1.30).toFixed(2))
    const precio_mayoreo = overrides.precio_mayoreo ?? product.precio_mayoreo ?? parseFloat((costo * 1.15).toFixed(2))
    const margen = (precio_menudeo > 0 && costo > 0)
        ? parseFloat(((precio_menudeo - costo) / precio_menudeo * 100).toFixed(1))
        : 23.1

    return {
        // Identity
        id: product.id ?? ('new-' + crypto.randomUUID()),
        nombre: overrides.nombre ?? product.nombre ?? '',
        sku: overrides.sku ?? product.sku ?? product.codigo_barras ?? '',
        codigo_barras: overrides.codigo_barras ?? product.codigo_barras ?? '',
        es_nuevo: overrides.es_nuevo ?? false,

        // Quantities
        cantidad: overrides.cantidad ?? 1,

        // Costs & Pricing
        costo,
        iva_porcentaje: overrides.iva_porcentaje ?? 16,
        precio_menudeo,
        precio_mayoreo,
        margen,
        min_mayoreo: overrides.min_mayoreo ?? product.min_mayoreo ?? 3,

        // Inventory
        stock_minimo: overrides.stock_minimo ?? 5,
        categoria: overrides.categoria ?? product.categoria ?? '',

        // Internal flags
        _isExistingProduct: !!product.id,
    }
}

export default function Reception() {
    const { user, selectedBranch } = useAuth()

    // Data Loaders
    const { data: allProducts = [] } = useQuery(`SELECT * FROM productos WHERE is_deleted = 0`)
    const { data: proveedores = [] } = useQuery(`SELECT * FROM proveedores WHERE is_deleted = 0`)

    // State
    const [searchTerm, setSearchTerm] = useState('')
    const [showScanner, setShowScanner] = useState(false)
    const [showMobileCart, setShowMobileCart] = useState(false)
    const [showCFDI, setShowCFDI] = useState(false)
    const [processing, setProcessing] = useState(false)

    // Form State
    const [selectedProveedor, setSelectedProveedor] = useState('')
    const [referencia, setReferencia] = useState('')
    const [notas, setNotas] = useState('')

    // Cart
    const [cart, setCart] = useState([])
    const searchInputRef = useRef(null)

    // Derived totals
    const cartTotal = cart.reduce((acc, item) => acc + (item.costo * item.cantidad), 0)
    const cartTotalConIVA = cart.reduce((acc, item) => {
        return acc + (item.costo * item.cantidad * (1 + (item.iva_porcentaje ?? 16) / 100))
    }, 0)

    // ── Handlers ──────────────────────────────────────────────────────────

    const addToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(p => p.id === product.id)
            if (exists) {
                return prev.map(p => p.id === product.id ? { ...p, cantidad: p.cantidad + 1 } : p)
            }
            return [...prev, buildCartItem(product)]
        })
        setSearchTerm('')
        if (searchInputRef.current) searchInputRef.current.focus()
    }

    /** Receives parsed CFDI items from the modal and loads them into the cart */
    const addCFDIItemsToCart = (items) => {
        const newItems = items.map(cfdiItem => {
            const matched = cfdiItem.matchedProduct
            return buildCartItem(matched || {}, {
                nombre: cfdiItem.descripcion,
                sku: cfdiItem.noIdentificacion,
                codigo_barras: cfdiItem.noIdentificacion,
                cantidad: cfdiItem.cantidad,
                costo: cfdiItem.valorUnitario,
                iva_porcentaje: cfdiItem.iva > 0 ? 16 : 0,
                es_nuevo: !matched,
            })
        })

        setCart(prev => {
            const result = [...prev]
            for (const newItem of newItems) {
                const existIdx = result.findIndex(p => p.id === newItem.id && !newItem.id.startsWith('new-'))
                if (existIdx > -1) {
                    result[existIdx] = { ...result[existIdx], cantidad: result[existIdx].cantidad + newItem.cantidad }
                } else {
                    result.push(newItem)
                }
            }
            return result
        })
        toast.success(`${items.length} productos cargados desde la factura`, {
            description: 'Revisa y ajusta los precios y márgenes antes de aplicar.'
        })
    }

    const updateQuantity = (id, change) => {
        setCart(prev => prev.map(p => {
            if (p.id !== id) return p
            const nw = p.cantidad + change
            return { ...p, cantidad: nw > 0 ? nw : 1 }
        }))
    }

    /** Generic single-field updater for any cart item field */
    const updateField = (id, field, value) => {
        setCart(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const removeFromCart = (id) => setCart(prev => prev.filter(p => p.id !== id))
    const clearCart = () => setCart([])

    // Scanner
    useBarcodeScanner({
        isActive: !showScanner && !showCFDI && !processing,
        onScan: (code) => {
            setSearchTerm('')
            const matched = allProducts.find(p => p.codigo_barras === code || p.sku === code)
            if (matched) {
                addToCart(matched)
                toast.success(`Agregado: ${matched.nombre}`)
            } else {
                toast.error('Código no encontrado en catálogo.')
            }
        }
    })

    useEffect(() => {
        if (showScanner) {
            const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false)
            scanner.render((decodedText) => {
                setSearchTerm(decodedText)
                setShowScanner(false)
                scanner.clear()
            }, () => { })
            return () => { scanner.clear().catch(() => { }) }
        }
    }, [showScanner])

    // ── Confirm Reception ──────────────────────────────────────────────────

    const handleConfirmReception = async () => {
        if (cart.length === 0 || !selectedProveedor) return

        const zeroCostItems = cart.filter(c => c.costo <= 0)
        if (zeroCostItems.length > 0) {
            toast.error('Costo inválido', { description: `${zeroCostItems.length} producto(s) tienen costo $0.` })
            return
        }

        setProcessing(true)
        try {
            let realProvId = selectedProveedor
            if (selectedProveedor === 'NEW_GENERIC') {
                realProvId = crypto.randomUUID()
                await powersync.execute(
                    `INSERT INTO proveedores (id, nombre, rfc, sucursal_id, is_deleted) VALUES (?, 'PROVEEDOR MOSTRADOR', 'XAXX010101000', ?, 0)`,
                    [realProvId, selectedBranch]
                )
            }

            const ordenId = crypto.randomUUID()
            const refFinal = referencia || `REC-${Date.now().toString().slice(-6)}`
            await powersync.execute(
                `INSERT INTO ordenes_compra (id, proveedor_id, sucursal_id, usuario_id, estado, total, uuid_factura, notas, fecha_creacion, fecha_recepcion)
                 VALUES (?, ?, ?, ?, 'RECIBIDA', ?, ?, ?, datetime('now'), datetime('now'))`,
                [ordenId, realProvId, selectedBranch, user?.id, cartTotalConIVA, refFinal, notas]
            )

            for (let item of cart) {
                // ── 1. Upsert Product ──────────────────────────────────
                let productId = item._isExistingProduct ? item.id : null

                if (!productId) {
                    // New product — create it
                    productId = item.id.startsWith('new-') ? crypto.randomUUID() : item.id
                    await powersync.execute(
                        `INSERT INTO productos (id, nombre, codigo_barras, sku, categoria, is_deleted) VALUES (?, ?, ?, ?, ?, 0)`,
                        [productId, item.nombre, item.codigo_barras || item.sku, item.sku, item.categoria || '']
                    )
                } else {
                    // Update product fields that may have been edited
                    await powersync.execute(
                        `UPDATE productos SET nombre = ?, sku = ?, codigo_barras = ?, categoria = ? WHERE id = ?`,
                        [item.nombre, item.sku, item.codigo_barras || item.sku, item.categoria || '', productId]
                    )
                }

                // ── 2. Upsert Precios ──────────────────────────────────
                const precioRes = await powersync.execute(`SELECT id FROM precios WHERE producto_id = ? LIMIT 1`, [productId])
                if (precioRes.rows?.length > 0) {
                    await powersync.execute(
                        `UPDATE precios SET precio_menudeo = ?, precio_mayoreo = ?, min_mayoreo = ? WHERE producto_id = ?`,
                        [item.precio_menudeo, item.precio_mayoreo, item.min_mayoreo ?? 3, productId]
                    )
                } else {
                    await powersync.execute(
                        `INSERT INTO precios (id, producto_id, precio_menudeo, precio_mayoreo, min_mayoreo) VALUES (?, ?, ?, ?, ?)`,
                        [crypto.randomUUID(), productId, item.precio_menudeo, item.precio_mayoreo, item.min_mayoreo ?? 3]
                    )
                }

                // ── 3. Upsert Inventario ───────────────────────────────
                const invRes = await powersync.execute(
                    `SELECT stock_actual FROM inventario WHERE producto_id = ? AND sucursal_id = ? LIMIT 1`,
                    [productId, selectedBranch]
                )
                const prevStock = invRes.rows?.length > 0 ? invRes.rows._array[0].stock_actual : 0
                const newStock = prevStock + item.cantidad

                if (invRes.rows?.length > 0) {
                    await powersync.execute(
                        `UPDATE inventario SET stock_actual = ?, stock_minimo = ? WHERE producto_id = ? AND sucursal_id = ?`,
                        [newStock, item.stock_minimo ?? 5, productId, selectedBranch]
                    )
                } else {
                    await powersync.execute(
                        `INSERT INTO inventario (id, producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo) VALUES (?, ?, ?, ?, ?, 999)`,
                        [crypto.randomUUID(), productId, selectedBranch, newStock, item.stock_minimo ?? 5]
                    )
                }

                // ── 4. Orden Compra Detalles ───────────────────────────
                const subtotal_linea = item.costo * item.cantidad
                const iva_linea = subtotal_linea * ((item.iva_porcentaje ?? 16) / 100)
                await powersync.execute(
                    `INSERT INTO orden_compra_detalles (id, orden_compra_id, producto_id, cantidad_compra, cantidad_entrada, costo_unitario, subtotal, iva_porcentaje, iva_importe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [crypto.randomUUID(), ordenId, productId, item.cantidad, item.cantidad, item.costo, subtotal_linea, item.iva_porcentaje ?? 16, iva_linea]
                )

                // ── 5. Kardex ─────────────────────────────────────────
                await powersync.execute(
                    `INSERT INTO kardex (id, producto_id, sucursal_id, tipo_movimiento, cantidad, saldo_previo, saldo_nuevo, concepto, referencia_id, usuario_id, created_at)
                     VALUES (?, ?, ?, 'ENTRADA', ?, ?, ?, 'Recepción de Mercancía', ?, ?, datetime('now'))`,
                    [crypto.randomUUID(), productId, selectedBranch, item.cantidad, prevStock, newStock, ordenId, user?.id]
                )
            }

            toast.success('¡Entrada de Mercancía Aplicada!', {
                description: `${cart.length} partidas ingresadas al almacén. Total: $${cartTotalConIVA.toFixed(2)} (c/IVA).`
            })
            clearCart()
            setReferencia('')
            setNotas('')
            setSelectedProveedor('')
            setShowMobileCart(false)

        } catch (error) {
            console.error('Reception error:', error)
            toast.error('Error al guardar la entrada. Revisa la consola.')
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-100 font-sans">
            <ReceptionTopBar
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                onSearchEnter={() => {
                    const filtered = allProducts.filter(p =>
                        `${p.nombre} ${p.codigo_barras}`.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    if (filtered.length > 0) addToCart(filtered[0])
                }}
                setShowScanner={setShowScanner}
                searchInputRef={searchInputRef}
                allProducts={allProducts}
                initReceiveItem={addToCart}
                onOpenCFDI={() => setShowCFDI(true)}
            />

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-full max-w-[1800px] mx-auto w-full lg:p-6 lg:gap-6">
                <ReceptionCartTable
                    cart={cart}
                    updateQuantity={updateQuantity}
                    updateField={updateField}
                    removeFromCart={removeFromCart}
                    clearCart={clearCart}
                />

                <ReceptionSidebar
                    cartLength={cart.length}
                    showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart}
                    cartTotal={cartTotalConIVA}
                    handleConfirmReception={handleConfirmReception}
                    processing={processing}
                    proveedores={proveedores}
                    selectedProveedor={selectedProveedor}
                    setSelectedProveedor={setSelectedProveedor}
                    referencia={referencia}
                    setReferencia={setReferencia}
                    notas={notas}
                    setNotas={setNotas}
                    onOpenCFDI={() => setShowCFDI(true)}
                />
            </div>

            <ScannerModal showScanner={showScanner} setShowScanner={setShowScanner} />

            {/* CFDI Upload Modal — now feeds the cart instead of applying directly */}
            <CFDIUploadModal
                show={showCFDI}
                onClose={() => setShowCFDI(false)}
                allProducts={allProducts}
                onItemsLoaded={addCFDIItemsToCart}
            />
        </div>
    )
}
