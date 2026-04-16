import { Search, Settings, LogOut, Lock, Scan, X as CloseIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export default function SalesTopBar({
    searchTerm,
    setSearchTerm,
    onSearchEnter,
    dailyTotal,
    setShowScanner,
    searchInputRef,
    allProducts = [],
    initAddToCart,
    getStockDisponible,
    setShowCFDIModal
}) {
    const { profile, branches, selectedBranch, changeBranch, signOut } = useAuth()
    const navigate = useNavigate()
    const [showDropdown, setShowDropdown] = useState(false)

    // searchResults es re-calculado muy eficientemente porque allProducts ya está 
    // filtrado por SQLite en backend gracias al debounce de Sales.jsx (LIMIT 50)
    const searchResults = useMemo(() => {
        if (!searchTerm || searchTerm.length < 1) return []
        return allProducts
    }, [searchTerm, allProducts])

    // ── VIRTUALIZATION ──
    const parentRef = useRef(null)
    const rowVirtualizer = useVirtualizer({
        count: searchResults.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 92, // Altura estimada del DIV del producto en px
        overscan: 5,            // Pre-cargas para scroll fluido
    })

    // Detectar cuando abrir el menú flotante
    useEffect(() => {
        if (searchTerm.length >= 2 && searchResults.length > 0) {
            setShowDropdown(true)
        } else {
            setShowDropdown(false)
        }
    }, [searchTerm, searchResults])

    const handleSelectProduct = (product) => {
        if (initAddToCart) {
            initAddToCart(product)
        }
        setSearchTerm('')
        setShowDropdown(false)
        if (searchInputRef.current) {
            searchInputRef.current.blur() // Esconde el teclado virtual táctil
        }
    }

    const clearSearch = () => {
        setSearchTerm('')
        setShowDropdown(false)
        if (searchInputRef.current) {
            searchInputRef.current.blur()
        }
    }

    // Cerrar el dropdown si haces click fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('#search-container')) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    return (
        <div className={`no-print bg-white/95 p-3 sm:py-5 sm:px-6 border-b shadow-md z-40 sticky top-0 sm:top-auto ${profile?.rol === 'admin' ? 'border-yellow-400/50 shadow-yellow-100' : 'border-slate-200/60'}`}>
            <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center">

                {/* SEARCH UNIVERSAL & IDENTITY */}
                <div className="relative flex-1 group w-full flex items-center gap-4">
                    <div id="search-container" className="relative flex-1 z-50">
                        {/* GIANT TOUCH-FIRST INPUT */}
                        <div className="relative flex items-center">
                            <Search className="absolute left-5 text-blue-500 scale-125 transition-transform" size={24} />
                            <input
                                id="main-pos-search"
                                ref={searchInputRef}
                                type="text"
                                placeholder="Búsqueda Inteligente de Productos..."
                                className="w-full pl-14 pr-16 py-4 sm:py-5 bg-white border-2 border-blue-200 focus:bg-white focus:border-blue-500 rounded-2xl text-xl font-bold outline-none transition-all shadow-lg text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSearchEnter()
                                }}
                                onFocus={() => {
                                    if (searchTerm.length >= 2 && searchResults.length > 0) setShowDropdown(true)
                                }}
                            />
                            {/* X CLEAR BUTTON */}
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-500 rounded-full transition-colors active:scale-95"
                                >
                                    <CloseIcon size={22} className="stroke-[3]" />
                                </button>
                            )}
                        </div>

                        {/* GIANT DROPDOWN MODAL (FUZZY RESULTS) */}
                        {showDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-50 transform origin-top animate-in slide-in-from-top-2 fade-in duration-200 flex flex-col max-h-[60vh]">
                                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
                                    <span className="text-xs font-black text-slate-400 tracking-widest uppercase">Resultados ({searchResults.length})</span>
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-200 px-2 rounded-md">1 Tap = Agregar</span>
                                </div>
                                <div ref={parentRef} className="overflow-y-auto overscroll-contain flex-1 max-h-[50vh]">
                                    <div
                                        className="w-full relative"
                                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                                    >
                                        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                            const p = searchResults[virtualItem.index]
                                            const stock = getStockDisponible ? getStockDisponible(p.id) : p.stock_actual
                                            const hasStock = stock > 0
                                            
                                            return (
                                                <div
                                                    key={virtualItem.key}
                                                    data-index={virtualItem.index}
                                                    ref={rowVirtualizer.measureElement}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        transform: `translateY(${virtualItem.start}px)`,
                                                    }}
                                                >
                                                    <div
                                                        onClick={() => handleSelectProduct(p)}
                                                        className={`flex items-center justify-between p-5 border-b border-slate-50 cursor-pointer transition-colors active:bg-blue-100 hover:bg-slate-50 h-full ${virtualItem.index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                                    >
                                                        <div className="flex-1 pr-4">
                                                            <h3 className="text-lg sm:text-xl font-black text-slate-800 leading-tight mb-1">{p.nombre}</h3>
                                                            <div className="flex gap-2 items-center">
                                                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{p.codigo_barras || 'SIN CÓDIGO'}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end shrink-0 pl-4 border-l border-slate-100">
                                                            <span className="text-xl font-black text-blue-600 leading-none">
                                                                ${Number(p.prices?.precio_menudeo || 0).toFixed(2)}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 mb-1 mt-0.5 uppercase tracking-widest">
                                                                Mayorista: ${Number(p.prices?.precio_mayoreo || 0).toFixed(2)}
                                                            </span>
                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${hasStock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                                <div className={`w-2.5 h-2.5 rounded-full ${hasStock ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                                <span className="text-sm font-black tracking-tight">{hasStock ? `${stock} ud` : 'AGOTADO'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ADMIN / USER IDENTITY HIDDEN ON SMALL MOBILE TO PRIORITIZE SEARCH */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        {profile?.rol === 'admin' ? (
                            <div className="flex items-center gap-3">
                                <div className="hidden lg:block text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Panel Maestro</p>
                                    <p className="font-bold text-slate-800 leading-none">{branches.find(b => b.id === selectedBranch)?.nombre || 'General'}</p>
                                </div>
                                <div className="bg-yellow-400 text-black text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-md">
                                    ADMIN
                                </div>
                            </div>
                        ) : (
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vendedor</p>
                                <p className="font-bold text-slate-700">{profile?.nombre || 'Usuario'}</p>
                            </div>
                        )}

                        {profile?.rol === 'admin' && (
                            <div className="hidden xl:flex flex-col items-end mr-2 border-r border-slate-200 pr-4">
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Venta Día</span>
                                <span className="text-lg font-black text-slate-800 leading-none">${(dailyTotal || 0).toFixed(2)}</span>
                            </div>
                        )}

                        <button
                            onClick={signOut}
                            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={22} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 sm:gap-4 h-14 sm:h-16 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                    {/* BRANCH SELECTOR */}
                    <div className="relative flex-1 sm:min-w-[200px]">
                        {profile?.rol === 'vendedor' ? (
                            <div className="w-full h-full bg-slate-200 border-2 border-slate-300 rounded-2xl px-5 flex items-center font-bold text-slate-500 cursor-not-allowed select-none text-sm sm:text-base">
                                <Lock size={14} className="mr-2 opacity-50" />
                                <span className="truncate">{branches.find(b => b.id === selectedBranch)?.nombre || 'Mi Sucursal'}</span>
                            </div>
                        ) : (
                            <>
                                <select
                                    className={`w-full h-full bg-slate-100 border-2 border-transparent rounded-2xl px-5 font-bold text-slate-700 outline-none focus:bg-white cursor-pointer appearance-none text-sm sm:text-base hover:bg-slate-200 transition-colors ${profile?.rol === 'admin' ? 'focus:border-blue-500 border-blue-100 bg-blue-50/30' : ''}`}
                                    value={selectedBranch}
                                    onChange={(e) => changeBranch(e.target.value)}
                                >
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 font-bold text-xs">▼</div>
                            </>
                        )}
                    </div>

                    <button onClick={() => setShowScanner(true)} className="aspect-square h-full bg-slate-800 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center" title="Escanear Código">
                        <Scan size={26} />
                    </button>
                    
                    <button 
                        onClick={() => setShowCFDIModal(true)} 
                        className="h-full px-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-green-500" 
                        title="Ingresar Factura XML (Compra)"
                    >
                        <span className="hidden sm:inline">Recibir</span> CFDI
                    </button>
                </div>
            </div>
        </div>
    )
}
