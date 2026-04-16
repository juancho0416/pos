// TransferTicket.jsx — Modal de impresión de comprobante de traslado
// Formato: Ticket 80mm/58mm con líneas de firma
import { Printer, X } from 'lucide-react'

export default function TransferTicket({ transfer, branches, onClose }) {
    if (!transfer) return null

    const origen = branches.find(b => b.id === transfer.origen_id)?.nombre || '—'
    const destino = branches.find(b => b.id === transfer.destino_id)?.nombre || '—'

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
            {/* Botones fuera del área de impresión */}
            <div className="absolute top-4 right-4 flex gap-2 print:hidden z-50">
                <button
                    onClick={handlePrint}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"
                >
                    <Printer size={18} />
                    Imprimir
                </button>
                <button
                    onClick={onClose}
                    className="bg-white text-slate-600 px-3 py-2 rounded-lg font-bold hover:bg-slate-100 transition shadow-lg"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Ticket — Area de impresión */}
            <div id="transfer-ticket" className="bg-white w-[80mm] min-h-[200mm] p-4 font-mono text-xs leading-relaxed shadow-2xl rounded-lg print:shadow-none print:rounded-none print:w-full print:min-h-0 print:p-2">
                {/* Header */}
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                    <h1 className="text-base font-black tracking-tight">COMPROBANTE DE TRASLADO</h1>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold">FERRETERÍA — CONTROL DE MERCANCÍA</p>
                    <p className="text-lg font-black text-blue-700 mt-2">#{String(transfer.folio).padStart(4, '0')}</p>
                </div>

                {/* Info */}
                <div className="space-y-2 border-b border-dashed border-slate-300 pb-3 mb-3">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Fecha:</span>
                        <span className="font-bold">{new Date(transfer.created_at).toLocaleDateString('es-MX')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Hora:</span>
                        <span className="font-bold">{new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Estado:</span>
                        <span className="font-bold text-amber-600">EN TRÁNSITO</span>
                    </div>
                </div>

                {/* Ruta */}
                <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black">SALE</span>
                        <span className="font-bold text-sm">{origen}</span>
                    </div>
                    <div className="text-center text-slate-400 text-lg">↓</div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-black">ENTRA</span>
                        <span className="font-bold text-sm">{destino}</span>
                    </div>
                </div>

                {/* Items */}
                <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                    <p className="font-black text-[10px] text-slate-500 uppercase tracking-widest mb-2">Artículos</p>
                    <table className="w-full">
                        <thead>
                            <tr className="text-slate-400 text-[9px] uppercase">
                                <th className="text-left pb-1">Producto</th>
                                <th className="text-right pb-1">Cant.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfer.items?.map((item, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                    <td className="py-1.5 pr-2">
                                        <div className="font-bold text-[11px] leading-tight">{item.producto?.nombre || item.nombre}</div>
                                        <div className="text-[9px] text-slate-400">{item.producto?.sku || item.sku}</div>
                                    </td>
                                    <td className="py-1.5 text-right font-black text-sm">{item.cantidad}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="text-right mt-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-500 text-[10px]">Total artículos: </span>
                        <span className="font-black text-sm">{transfer.items?.reduce((s, i) => s + i.cantidad, 0)}</span>
                    </div>
                </div>

                {transfer.notas && (
                    <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                        <p className="font-black text-[10px] text-slate-500 uppercase tracking-widest mb-1">Notas</p>
                        <p className="text-[11px] text-slate-700">{transfer.notas}</p>
                    </div>
                )}

                {/* Firmas */}
                <div className="mt-8 space-y-8">
                    <div>
                        <div className="border-b border-slate-400 w-full mb-1"></div>
                        <p className="text-[10px] text-slate-500 text-center font-bold uppercase">Firma de quien ENTREGA</p>
                        <p className="text-[9px] text-slate-400 text-center">Sucursal {origen}</p>
                    </div>
                    <div>
                        <div className="border-b border-slate-400 w-full mb-1"></div>
                        <p className="text-[10px] text-slate-500 text-center font-bold uppercase">Firma de quien TRANSPORTA</p>
                    </div>
                    <div>
                        <div className="border-b border-slate-400 w-full mb-1"></div>
                        <p className="text-[10px] text-slate-500 text-center font-bold uppercase">Firma de quien RECIBE</p>
                        <p className="text-[9px] text-slate-400 text-center">Sucursal {destino}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 pt-3 border-t border-dashed border-slate-300">
                    <p className="text-[9px] text-slate-400">Documento generado el {new Date().toLocaleString('es-MX')}</p>
                    <p className="text-[9px] text-slate-400 mt-1">Este comprobante no tiene valor fiscal</p>
                </div>
            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #transfer-ticket, #transfer-ticket * { visibility: visible; }
                    #transfer-ticket {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        margin: 0;
                        padding: 4mm;
                        font-size: 10px;
                    }
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    )
}
