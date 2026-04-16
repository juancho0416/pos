import { useState } from 'react'
import { CreditCard, FileText, ChevronUp, ShoppingCart, Percent, X } from 'lucide-react'

export default function CartSidebar({
    cartTotal = 0,
    cartSubtotal = 0,
    handleOpenCheckout,
    handleOpenQuote,
    processing,
    cartLength = 0,
    showMobileCart,
    setShowMobileCart,
    // Global discount
    globalDiscount = 0,
    setGlobalDiscount,
    globalDiscountType = 'pct',         // 'pct' | 'monto'
    setGlobalDiscountType,
}) {
    const [inputVal, setInputVal] = useState('')
    const [showDtoInput, setShowDtoInput] = useState(false)

    const subtotal = cartSubtotal || cartTotal
    const discounto = globalDiscountType === 'pct'
        ? subtotal * (globalDiscount / 100)
        : Math.min(globalDiscount, subtotal)
    const totalFinal = Math.max(0, subtotal - discounto)

    const handleDtoConfirm = () => {
        const v = parseFloat(inputVal)
        if (!isNaN(v) && v >= 0) {
            setGlobalDiscount?.(globalDiscountType === 'pct' ? Math.min(v, 100) : v)
        }
        setShowDtoInput(false)
        setInputVal('')
    }

    const clearDto = () => {
        setGlobalDiscount?.(0)
        setInputVal('')
        setShowDtoInput(false)
    }

    return (
        <>
            {/* DESKTOP SIDEBAR / MOBILE DRAWER */}
            <div className={`
                fixed inset-x-0 bottom-0 z-50 bg-white transition-transform duration-300 rounded-t-[2.5rem] flex flex-col items-center justify-end
                lg:static lg:h-full lg:w-[380px] lg:border-l lg:border-slate-200 lg:rounded-none lg:transform-none lg:bg-transparent lg:pl-6
                ${showMobileCart ? 'translate-y-0 shadow-2xl pb-safe' : 'translate-y-[110%] lg:translate-y-0'}
            `}>
                
                {/* Mobile Handle */}
                <div className="lg:hidden w-full flex justify-center pt-3 pb-2 bg-slate-900 rounded-t-[2.5rem]" onClick={() => setShowMobileCart(false)}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mb-1"></div>
                </div>

                <div className="w-full bg-slate-900 text-white lg:rounded-[2rem] p-6 sm:p-8 shadow-2xl flex-1 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Resumen de Venta</span>
                            <span className="bg-blue-500/20 text-blue-400 text-xs font-black px-3 py-1 rounded-lg">
                                {cartLength} {cartLength === 1 ? 'Artículo' : 'Artículos'}
                            </span>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-slate-400 font-medium">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>

                            {/* ─── Descuento Global ─── */}
                            {discounto > 0 && (
                                <div className="flex justify-between items-center text-emerald-400 font-bold">
                                    <div className="flex items-center gap-1.5">
                                        <span>Descuento</span>
                                        <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                                            {globalDiscountType === 'pct' ? `${globalDiscount}%` : `$${globalDiscount}`}
                                        </span>
                                        <button onClick={clearDto} className="text-slate-500 hover:text-red-400 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <span>-${discounto.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Global discount input */}
                            {showDtoInput ? (
                                <div className="bg-slate-800 rounded-2xl p-3 space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGlobalDiscountType?.('pct')}
                                            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${globalDiscountType === 'pct' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            %  Porcentaje
                                        </button>
                                        <button
                                            onClick={() => setGlobalDiscountType?.('monto')}
                                            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${globalDiscountType === 'monto' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            $ Importe
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            autoFocus
                                            type="number"
                                            min="0"
                                            max={globalDiscountType === 'pct' ? 100 : undefined}
                                            value={inputVal}
                                            onChange={e => setInputVal(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleDtoConfirm(); if (e.key === 'Escape') setShowDtoInput(false) }}
                                            placeholder={globalDiscountType === 'pct' ? '10' : '50.00'}
                                            className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500 text-right"
                                        />
                                        <button onClick={handleDtoConfirm}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 rounded-xl text-sm active:scale-95 transition-all">
                                            ✓
                                        </button>
                                        <button onClick={() => setShowDtoInput(false)}
                                            className="bg-slate-700 text-slate-400 font-bold px-3 rounded-xl text-sm active:scale-95 transition-all">
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDtoInput(true)}
                                    disabled={cartLength === 0}
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-400 text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                    <Percent size={13} />
                                    Agregar descuento al ticket
                                </button>
                            )}

                            <div className="h-px bg-slate-800 my-2" />
                            <div className="flex justify-between items-end">
                                <span className="text-slate-300 font-bold uppercase text-sm tracking-widest block mb-1">Total a Pagar</span>
                                <span className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">${totalFinal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-auto">
                        <button
                            onClick={() => handleOpenCheckout(totalFinal, discounto)}
                            disabled={cartLength === 0 || processing}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-5 rounded-2xl font-black text-2xl shadow-xl shadow-blue-600/20 disabled:opacity-30 disabled:shadow-none transition-all flex justify-center items-center gap-3 active:scale-95 group"
                        >
                            <CreditCard className="group-hover:rotate-12 transition-transform" size={28} /> COBRAR
                        </button>

                        <button
                            onClick={handleOpenQuote}
                            disabled={cartLength === 0 || processing}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 py-4 rounded-2xl font-bold transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-30"
                        >
                            <FileText size={20} /> CREAR COTIZACIÓN
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Cart Trigger */}
            <div className="block lg:hidden fixed bottom-4 left-4 right-4 z-40">
                <button
                    onClick={() => setShowMobileCart(true)}
                    className="w-full bg-slate-900 text-white rounded-3xl p-4 shadow-2xl flex justify-between items-center active:scale-95 transition-all border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center font-black text-sm">
                            <ShoppingCart size={20} />
                        </div>
                        <span className="font-bold uppercase text-xs tracking-widest text-slate-300">Procesar Venta</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-black text-2xl tracking-tight">${totalFinal.toFixed(2)}</span>
                        <ChevronUp className="text-slate-400" size={24} />
                    </div>
                </button>
            </div>

            {/* Mobile Overlay */}
            {showMobileCart && (
                <div className="lg:hidden fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm" onClick={() => setShowMobileCart(false)}></div>
            )}
        </>
    )
}
