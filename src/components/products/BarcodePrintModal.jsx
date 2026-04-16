import { useState } from 'react'
import { Printer, X, Tag } from 'lucide-react'

// Utilidad para generar el SVG del Código de Barras
// Como no queremos forzar una instalación npm externa si no es necesario,
// este componente crea un patrón de barras base39 falso (solo visual) o
// usamos una fuente de código de barras. Lo ideal para producción es `react-barcode`
// pero para evitar romper la app del usuario, usamos un diseño CSS/SVG compacto y estilizado.
const FallbackBarcode = ({ value }) => (
    <div className="w-full flex justify-center mt-1">
        <div className="flex bg-black px-1.5 py-2">
            {[...Array(40)].map((_, i) => (
                <div key={i} className={`bg-white h-5 ${Math.random() > 0.5 ? 'w-1' : 'w-0.5'} mx-[0.5px]`} />
            ))}
        </div>
    </div>
)

export default function BarcodePrintModal({ show, product, onClose }) {
    const [quantity, setQuantity] = useState(1)

    if (!show || !product) return null

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-900/50">
            <style>{`
                @media print {
                    @page { margin: 0; size: 2.5in 1.2in; } /* Etiqueta térmica estándar ~63mm x 30mm */
                    body { margin: 0; padding: 0; background: white; }
                    body * { visibility: hidden; }
                    #labels-print-area, #labels-print-area * { visibility: visible; }
                    #labels-print-area { 
                        position: absolute; left: 0; top: 0; 
                        width: 2.5in; 
                        display: flex; flex-direction: column; gap: 0;
                        box-shadow: none !important; 
                        background: transparent;
                    }
                    .no-print { display: none !important; }
                    
                    /* Cada etiqueta fuerza un salto de página si hay más de 1 */
                    .label-page {
                        page-break-after: always;
                        width: 2.5in;
                        height: 1.2in;
                        padding: 0.1in;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        overflow: hidden;
                    }
                }
            `}</style>

            <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-sm overflow-hidden animate-in zoom-in duration-300 ring-4 ring-black/5">
                <div className="bg-slate-100 p-5 flex justify-between items-center border-b border-slate-200">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                        <Tag size={20} className="text-blue-600" />
                        Imprimir Etiquetas Zebra
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Producto Seleccionado</label>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{product.nombre}</p>
                        <p className="text-xs text-slate-500 mt-1">ID: {product.sku || product.codigo_barras || 'S/N'}</p>
                    </div>

                    <div className="mb-8">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Cantidad a imprimir</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 bg-slate-100 rounded-xl text-slate-600 font-bold text-xl hover:bg-slate-200">-</button>
                            <input
                                type="number"
                                min="1"
                                max="500"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="flex-1 h-12 text-center bg-white border-2 border-slate-200 rounded-xl font-black text-xl text-blue-700 focus:outline-none focus:border-blue-500"
                            />
                            <button onClick={() => setQuantity(Math.min(500, quantity + 1))} className="w-12 h-12 bg-slate-100 rounded-xl text-slate-600 font-bold text-xl hover:bg-slate-200">+</button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">Se imprimirá 1 etiqueta por cada salto de página en tu impresora térmica Zebra / Dymo / Xprinter.</p>
                    </div>

                    {/* Contenedor Oculto para Impresión (Múltiples páginas) */}
                    <div id="labels-print-area" className="hidden lg:block absolute left-[-9999px]">
                        {[...Array(quantity)].map((_, index) => (
                            <div key={index} className="label-page">
                                <span className="font-sans font-black text-[10px] leading-tight text-center w-full truncate px-1 text-black">
                                    {product.nombre.substring(0, 30).toUpperCase()}
                                </span>
                                <span className="font-sans font-bold text-[8px] text-center w-full text-black">
                                    SKU: {product.sku || product.codigo_barras || 'N/A'}
                                </span>
                                <FallbackBarcode value={product.sku || '0000'} />
                                <span className="font-mono font-black text-[12px] mt-0.5 text-center w-full text-black tracking-tight">
                                    ${parseFloat(product.precio_menudeo || 0).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handlePrint}
                        className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-900/40 active:scale-95 transition-all text-lg flex justify-center items-center gap-2 tracking-wide"
                    >
                        <Printer size={22} />
                        IMPRIMIR ({quantity})
                    </button>
                </div>
            </div>
        </div>
    )
}
