import { useState } from 'react'
import { Trash2, Plus, Minus, PackageX, Tag, Edit3, Check, X } from 'lucide-react'

// ─── Inline editable price cell ───────────────────────────────
function EditablePrice({ value, onChange }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value.toFixed(2))

    const commit = () => {
        const n = parseFloat(draft)
        if (!isNaN(n) && n >= 0) onChange(n)
        setEditing(false)
    }

    if (editing) return (
        <div className="flex items-center gap-1">
            <span className="text-slate-400 text-xs font-bold">$</span>
            <input
                type="number" min="0" step="0.01" autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
                className="w-20 bg-white border-2 border-blue-500 text-blue-700 font-black text-sm rounded-lg px-2 py-1 text-right focus:outline-none"
            />
            <button onClick={commit} className="text-emerald-600 hover:text-emerald-700"><Check size={14} strokeWidth={3}/></button>
        </div>
    )

    return (
        <button onClick={() => { setDraft(value.toFixed(2)); setEditing(true) }}
            className="flex items-center gap-1 group/ep hover:bg-blue-50 rounded-lg px-2 py-1 transition-colors">
            <span className="font-bold text-slate-600">${value.toFixed(2)}</span>
            <Edit3 size={11} className="text-slate-300 group-hover/ep:text-blue-500 transition-colors" />
        </button>
    )
}

// ─── Inline discount cell ──────────────────────────────────────
function DiscountCell({ value = 0, onChange }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value.toString())

    const commit = () => {
        const n = Math.min(100, Math.max(0, parseFloat(draft) || 0))
        onChange(n)
        setEditing(false)
    }

    if (editing) return (
        <div className="flex items-center gap-1">
            <input type="number" min="0" max="100" step="0.5" autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
                className="w-14 bg-white border-2 border-orange-400 text-orange-600 font-black text-sm rounded-lg px-2 py-1 text-center focus:outline-none"
            />
            <span className="text-orange-500 text-xs font-black">%</span>
        </div>
    )

    return (
        <button onClick={() => { setDraft(value.toString()); setEditing(true) }}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors
                ${value > 0 ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'}`}
        >
            <Tag size={11} />
            <span className="text-xs font-black">{value > 0 ? `-${value}%` : 'Dto'}</span>
        </button>
    )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function POSCartTable({ cart, updateQuantity, removeFromCart, clearCart, updateItemPrice, updateItemDiscount }) {
    return (
        <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-safe">
            {/* Table Header */}
            <div className="flex justify-between items-center bg-slate-50 border-b border-slate-200 px-6 py-4 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Ticket de Venta</h2>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}
                    </span>
                </div>
                {cart.length > 0 && (
                    <button
                        onClick={clearCart}
                        className="text-slate-400 hover:text-red-600 flex items-center gap-1.5 text-sm font-bold bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all active:scale-95"
                    >
                        <Trash2 size={16} /> Vaciar Ticket
                    </button>
                )}
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 p-8">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
                            <PackageX size={40} className="text-slate-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold tracking-tight text-slate-700">El ticket está vacío</p>
                            <p className="text-sm font-medium mt-1">Busca un producto o escanea un código de barras</p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Cód/SKU</th>
                                <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Producto</th>
                                <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-28">Cant.</th>
                                <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Precio</th>
                                <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Dto%</th>
                                <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Subtotal</th>
                                <th className="py-3 px-2 border-b border-slate-100 w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {cart.map((item, idx) => {
                                const descuento = item.descuento ?? 0
                                const precioConDto = item.selectedPrice * (1 - descuento / 100)
                                const subtotal = precioConDto * item.cantidad

                                return (
                                    <tr key={`${item.id}-${item.priceType}-${idx}`} className="group hover:bg-blue-50/20 transition-colors">
                                        <td className="py-3.5 px-4 align-middle">
                                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100/80 px-2 py-1 rounded">
                                                {item.sku || item.codigo_barras || 'S/C'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 align-middle min-w-[200px]">
                                            <p className="font-bold text-slate-800 leading-tight text-sm">{item.nombre}</p>
                                            <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider mt-0.5">
                                                {item.priceType === 'mayoreo' ? '🟣 MAYOREO' : item.priceType === 'medio_mayoreo' ? '🟤 MEDIO MAY.' : '🔵 MENUDEO'}
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-4 align-middle">
                                            <div className="flex items-center justify-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-[88px] mx-auto">
                                                <button
                                                    onClick={() => { const r = updateQuantity(item.id, item.priceType, -1); if (r?.success === false) alert(r.message) }}
                                                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-blue-600 active:scale-95 text-slate-500 transition-all"
                                                >
                                                    <Minus size={13} strokeWidth={3} />
                                                </button>
                                                <span className="flex-1 text-center font-black text-slate-800 text-base">{item.cantidad}</span>
                                                <button
                                                    onClick={() => { const r = updateQuantity(item.id, item.priceType, 1); if (r?.success === false) alert(r.message) }}
                                                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-blue-600 active:scale-95 text-slate-500 transition-all"
                                                >
                                                    <Plus size={13} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 align-middle text-right">
                                            <EditablePrice
                                                value={item.selectedPrice}
                                                onChange={(newPrice) => updateItemPrice?.(item.id, item.priceType, newPrice)}
                                            />
                                            {descuento > 0 && (
                                                <p className="text-[10px] text-orange-500 font-bold text-right">${precioConDto.toFixed(2)} c/dto</p>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 align-middle text-center">
                                            <DiscountCell
                                                value={descuento}
                                                onChange={(dto) => updateItemDiscount?.(item.id, item.priceType, dto)}
                                            />
                                        </td>
                                        <td className="py-3.5 px-4 align-middle text-right">
                                            <span className="font-black text-slate-800 text-lg">${subtotal.toFixed(2)}</span>
                                        </td>
                                        <td className="py-3.5 px-2 align-middle text-center">
                                            <button
                                                onClick={() => removeFromCart(item.id, item.priceType)}
                                                className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
