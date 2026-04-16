import { useState, useRef } from 'react'
import { AlertCircle, Plus, Minus, Pencil, Check } from 'lucide-react'

/**
 * Una fila individual del inventario completo.
 * Permite edición inline del stock actual haciendo clic en el número.
 */
export default function InventoryRow({ item, onAdjust, onUpdateMinStock, onSetStock }) {
    const isZero = item.stock_actual === 0
    const minVal = item.stock_minimo || 0
    const isLow = item.stock_actual < minVal && !isZero

    const [editingStock, setEditingStock] = useState(false)
    const [stockInput, setStockInput] = useState('')
    const inputRef = useRef(null)

    let rowBg = 'hover:bg-blue-50/50'
    if (isZero) rowBg = 'bg-red-50 hover:bg-red-100'
    else if (isLow) rowBg = 'bg-orange-50 hover:bg-orange-100'

    const startEdit = () => {
        setStockInput(String(item.stock_actual))
        setEditingStock(true)
        setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 50)
    }

    const confirmEdit = () => {
        const val = parseFloat(stockInput)
        if (!isNaN(val) && val >= 0 && val !== item.stock_actual) {
            onSetStock?.(item, val)
        }
        setEditingStock(false)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') confirmEdit()
        if (e.key === 'Escape') setEditingStock(false)
    }

    return (
        <div className={`grid grid-cols-12 p-4 items-center transition-colors group ${rowBg} border-b border-gray-100 last:border-0`}>
            {/* Product Info */}
            <div className="col-span-5 md:col-span-4 pr-2">
                <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-2">{item.producto.nombre}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] md:text-xs text-gray-500 font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">
                        {item.producto.sku}
                    </span>
                    {isLow && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                            <AlertCircle size={10} /> BAJO
                        </span>
                    )}
                </div>
            </div>

            {/* Editable Min Stock */}
            <div className="col-span-2 flex justify-center">
                <input
                    type="number"
                    min="0"
                    defaultValue={item.stock_minimo}
                    onBlur={(e) => onUpdateMinStock(item, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                    className="w-16 md:w-20 text-center py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-700 shadow-sm"
                    title="Editar Stock Mínimo"
                />
            </div>

            {/* Current Stock — inline editable */}
            <div className="col-span-2 text-center" onClick={!editingStock ? startEdit : undefined}>
                {editingStock ? (
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                            ref={inputRef}
                            type="number"
                            min="0"
                            value={stockInput}
                            onChange={e => setStockInput(e.target.value)}
                            onBlur={confirmEdit}
                            onKeyDown={handleKeyDown}
                            className="w-20 text-center text-base font-bold border-2 border-blue-500 rounded-lg py-1 outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                        />
                        <button
                            onMouseDown={(e) => { e.preventDefault(); confirmEdit() }}
                            className="w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <Check size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-0.5 cursor-pointer group/stock" title="Clic para editar stock directo">
                        <span className={`text-xl md:text-2xl font-bold transition-all group-hover/stock:text-blue-600 ${isZero ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-800'}`}>
                            {item.stock_actual}
                        </span>
                        <span className="text-[9px] text-gray-400 group-hover/stock:text-blue-400 flex items-center gap-0.5 transition-colors">
                            <Pencil size={8} /> editar
                        </span>
                        {isZero && <span className="text-[10px] text-red-500 font-bold">AGOTADO</span>}
                    </div>
                )}
            </div>

            {/* Quick ±1 Actions */}
            <div className="col-span-3 flex justify-center items-center gap-2 md:gap-4">
                <button
                    onClick={() => onAdjust(item, -1)}
                    disabled={isZero}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={() => onAdjust(item, 1)}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 active:scale-95 transition shadow-sm"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    )
}
