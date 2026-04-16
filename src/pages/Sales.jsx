import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useSync } from '../hooks/useSync'
import { useAuth } from '../context/AuthContext'
import { AlertTriangle, X } from 'lucide-react'
import { useCheckoutStore } from '../stores/useCheckoutStore'
import { useProducts } from '../hooks/useProducts'
import { useCustomers } from '../hooks/useCustomers'
import { useShift } from '../hooks/useShift'
import { useSalesCart } from '../hooks/useSalesCart'
import { useSaleTransaction } from '../hooks/useSaleTransaction'
import { useQuotes } from '../hooks/useQuotes'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useSettings } from '../hooks/useSettings'
import { toast } from 'sonner'

// Components
import SalesTopBar from '../components/sales/SalesTopBar'
import POSCartTable from '../components/sales/POSCartTable'
import CartSidebar from '../components/sales/CartSidebar'
import CheckoutModal from '../components/sales/modals/CheckoutModal'
import TicketModal from '../components/sales/modals/TicketModal'
import PriceModal from '../components/sales/modals/PriceModal'
import ShiftWarningModal from '../components/sales/modals/ShiftWarningModal'
import ScannerModal from '../components/sales/modals/ScannerModal'
import QuoteModal from '../components/sales/modals/QuoteModal'
import QuoteSuccessModal from '../components/sales/modals/QuoteSuccessModal'
import CFDIUploadModal from '../components/sales/modals/CFDIUploadModal'

export default function Sales() {
    const { user, profile, branches, selectedBranch } = useAuth()
    const { triggerSyncQueue } = useSync()
    const { resetCheckoutState, getCheckoutPayload } = useCheckoutStore()
    const { settings } = useSettings()

    // UI State
    const [searchTerm, setSearchTerm] = useState('')
    const [showScanner, setShowScanner] = useState(false)
    const [showMobileCart, setShowMobileCart] = useState(false)
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [showTicketModal, setShowTicketModal] = useState(false)
    const [showCFDIModal, setShowCFDIModal] = useState(false)
    const [showShiftWarning, setShowShiftWarning] = useState(false)
    // ── Descuento Global al Ticket
    const [globalDiscount, setGlobalDiscount] = useState(0)
    const [globalDiscountType, setGlobalDiscountType] = useState('pct')  // 'pct' | 'monto'

    const searchInputRef = useRef(null)

    // Debounce del buscador — evita queries SQL en cada tecla al hook reactivo (300ms)
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // DAL Hooks: Búsqueda directa a SQLite (solo ejecuta tras 300ms de inactividad)
    const { allProducts, isLoading: loading } = useProducts(selectedBranch, debouncedSearchTerm)
    const { customers, reloadCustomers } = useCustomers(selectedBranch)
    const { isShiftOpen, dailyTotal } = useShift(selectedBranch, profile?.rol === 'admin' ? user?.id : null)
    const {
        cart, cartTotal, getStockDisponible, addToCart, updateQuantity,
        removeFromCart, calculateTotal, clearCart, updateItemPrice, updateItemDiscount,
        tabs, activeTabId, setActiveTabId, addTab, removeTab
    } = useSalesCart(allProducts, selectedBranch, settings)

    // Business Logic Hooks
    const { processing, lastSale, handleConfirmSale } = useSaleTransaction({
        cart, calculateTotal, clearCart, branches, selectedBranch,
        customers, reloadCustomers, user, getCheckoutPayload, triggerSyncQueue,
    })

    // Descuento global aplicado al subtotal del carrito
    const cartSubtotal = cartTotal  // cartTotal ya incluye descuentos por línea
    const globalDiscountAmt = globalDiscountType === 'pct'
        ? cartSubtotal * (globalDiscount / 100)
        : Math.min(globalDiscount, cartSubtotal)
    const totalConDescuento = Math.max(0, cartSubtotal - globalDiscountAmt)
    const calculateTotalConDescuento = () => totalConDescuento

    const {
        quoteProcessing, showQuoteModal, setShowQuoteModal,
        quoteCustomer, setQuoteCustomer, quoteName, setQuoteName,
        showQuoteSuccessModal, setShowQuoteSuccessModal,
        handleOpenQuote, handleConfirmQuote,
    } = useQuotes({ cart, calculateTotal, clearCart, branches, selectedBranch, customers, user })

    const handleBarcodeScan = useCallback((code) => {
        setSearchTerm('')
        const matchedProduct = allProducts.find(p => p.codigo_barras === code || p.sku === code)
        if (matchedProduct) {
            const res = addToCart(matchedProduct, 'menudeo')
            if (res && res.success === false) {
                toast.error(res.message)
            } else {
                toast.success(`Producto añadido: ${matchedProduct.nombre}`)
            }
        } else {
            toast.error('Código no reconocido')
        }
    }, [allProducts, getStockDisponible, addToCart])

    // Global Barcode Scanner
    useBarcodeScanner({
        isActive: isShiftOpen !== false && !showCheckoutModal && !showTicketModal && !showShiftWarning && !showScanner && !showQuoteModal,
        onScan: handleBarcodeScan
    })

    // Scanner Effect
    useEffect(() => {
        let scanner = null;
        if (showScanner) {
            scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false)
            scanner.render((decodedText) => {
                setSearchTerm(decodedText)
                setShowScanner(false)
                scanner.clear().catch(e => console.error(e))
            }, () => { })
        }
        
        // Función de Cleanup explícita para evitar que la cámara (o suscripción virtual) 
        // quede atascada al desmontar la vista de Ventas.
        return () => { 
            if (scanner) {
                scanner.clear().catch(() => {}) 
            }
        }
    }, [showScanner])

    // Handlers
    const initAddToCart = (product) => {
        const res = addToCart(product, 'menudeo')
        if (res && res.success === false) { toast.error(res.message) }
        setSearchTerm('')
    }

    const handleOpenCheckout = () => {
        if (isShiftOpen === false) { setShowShiftWarning(true); return }
        if (cart.length === 0) return
        resetCheckoutState()
        setShowCheckoutModal(true)
    }

    const onConfirmSale = () => handleConfirmSale({
        onSuccess: () => {
            setShowCheckoutModal(false)
            setShowTicketModal(true)
            setShowMobileCart(false)
        }
    })

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900">
            <style>{`
                @media print {
                    @page { margin: 0; size: 80mm max-content; }
                    body { margin: 0; padding: 0; background: white; }
                    body * { visibility: hidden; }
                    #ticket-print-area, #ticket-print-area * { visibility: visible; }
                    #ticket-print-area { position: absolute; left: 0; top: 0; width: 80mm; margin: 0; padding: 0; box-shadow: none !important; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {!loading && isShiftOpen === false && (
                <div className="bg-gradient-to-r from-red-500/95 to-red-600/95 backdrop-blur-md text-white text-[10px] sm:text-xs font-black text-center py-1 uppercase tracking-widest flex items-center justify-center gap-2 z-[70] shadow-sm sticky top-0">
                    <AlertTriangle size={12} className="animate-pulse text-yellow-300" />
                    Modo Consulta <span className="hidden sm:inline">- Turno Cerrado</span>
                </div>
            )}

            <SalesTopBar
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                onSearchEnter={() => { if (allProducts && allProducts.length > 0) initAddToCart(allProducts[0]) }}
                dailyTotal={dailyTotal} setShowScanner={setShowScanner}
                searchInputRef={searchInputRef} allProducts={allProducts}
                initAddToCart={initAddToCart} getStockDisponible={getStockDisponible}
                setShowCFDIModal={setShowCFDIModal}
            />

            <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden h-full max-w-[1600px] mx-auto w-full transition-all duration-300 lg:p-6 lg:gap-6 ${showShiftWarning ? 'blur-sm pointer-events-none grayscale-[0.5]' : ''}`}>
                {/* BSALE/MYBUSINESS STYLE: BIG TICKET GRID WITH TABS */}
                <div className="flex-1 flex flex-col min-w-0 bg-white shadow-xl lg:rounded-3xl border border-slate-200 overflow-hidden">
                    {/* TABS HEADER */}
                    <div className="flex items-end bg-slate-100 px-2 pt-2 border-b border-slate-200 overflow-x-auto hide-scrollbar">
                        {tabs.map(tab => (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl cursor-pointer min-w-[120px] transition-all border-x border-t ${
                                    activeTabId === tab.id
                                        ? 'bg-white border-slate-200 text-blue-700 font-black shadow-[0_4px_0_0_white]'
                                        : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 font-bold'
                                }`}
                            >
                                <span className="flex-1 text-sm whitespace-nowrap">{tab.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${activeTabId === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>
                                    {tab.cart?.length || 0}
                                </span>
                                {tabs.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                                        className="p-1 rounded-full hover:bg-slate-200 hover:text-red-500 transition-colors opacity-60 hover:opacity-100"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={addTab}
                            className="ml-2 mb-2 p-2 rounded-xl bg-slate-200 hover:bg-blue-100 text-slate-600 hover:text-blue-700 font-black transition-colors flex items-center gap-1 text-sm"
                            title="Abrir nueva pestaña de venta (Hold Ticket)"
                        >
                            <span className="text-lg leading-none">+</span> Nueva
                        </button>
                    </div>

                    <POSCartTable 
                        cart={cart} 
                        updateQuantity={updateQuantity} 
                        removeFromCart={removeFromCart} 
                        clearCart={clearCart}
                        updateItemPrice={updateItemPrice}
                        updateItemDiscount={updateItemDiscount}
                    />
                </div>

                {/* RIGHT SIDE: BIG TOTALS AND PAYMENTS */}
                <CartSidebar
                    cartLength={cart.length}
                    showMobileCart={showMobileCart} setShowMobileCart={setShowMobileCart}
                    cartTotal={cartTotal}
                    cartSubtotal={cartSubtotal}
                    globalDiscount={globalDiscount} setGlobalDiscount={setGlobalDiscount}
                    globalDiscountType={globalDiscountType} setGlobalDiscountType={setGlobalDiscountType}
                    handleOpenCheckout={handleOpenCheckout}
                    handleOpenQuote={handleOpenQuote}
                    processing={processing || quoteProcessing}
                />
            </div>

            {/* Modals */}
            <ShiftWarningModal showShiftWarning={showShiftWarning} setShowShiftWarning={setShowShiftWarning} />
            <CheckoutModal showCheckoutModal={showCheckoutModal} setShowCheckoutModal={setShowCheckoutModal} calculateTotal={calculateTotal} customers={customers} handleConfirmSale={onConfirmSale} processing={processing} />
            <TicketModal showTicketModal={showTicketModal} setShowTicketModal={setShowTicketModal} lastSale={lastSale} />
            <ScannerModal showScanner={showScanner} setShowScanner={setShowScanner} />
            <QuoteModal showQuoteModal={showQuoteModal} setShowQuoteModal={setShowQuoteModal} calculateTotal={calculateTotal} quoteCustomer={quoteCustomer} setQuoteCustomer={setQuoteCustomer} quoteName={quoteName} setQuoteName={setQuoteName} customers={customers} handleConfirmQuote={handleConfirmQuote} processing={quoteProcessing} />
            <QuoteSuccessModal showQuoteSuccessModal={showQuoteSuccessModal} setShowQuoteSuccessModal={setShowQuoteSuccessModal} />
            <CFDIUploadModal show={showCFDIModal} onClose={() => setShowCFDIModal(false)} allProducts={allProducts} />
        </div>
    )
}