import { Printer } from 'lucide-react'
import { useSettings } from '../../../hooks/useSettings'

export default function TicketModal({ showTicketModal, setShowTicketModal, lastSale }) {
    const { settings } = useSettings()
    
    if (!showTicketModal || !lastSale) return null

    const handlePrintTicket = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xl bg-slate-900/50">
            <div className="bg-white shadow-2xl w-full max-w-[400px] overflow-hidden animate-in zoom-in duration-300 ring-4 ring-black/10 flex flex-col max-h-[90vh]">
                
                {/* Header Action Bar */}
                <div className="no-print bg-slate-100 p-4 flex justify-between items-center border-b border-slate-200">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                        <Printer size={20} className="text-blue-600" />
                        Vista Previa (80mm)
                    </div>
                </div>

                {/* Contenedor escroleable del Ticket */}
                <div className="flex-1 overflow-y-auto bg-slate-200 p-4 sm:p-8 flex justify-center">
                    {/* ÁREA DE IMPRESIÓN (Formato Ticket Térmico 80mm = ~300px) */}
                    <div id="ticket-print-area" className="bg-white w-[300px] p-4 text-black font-sans leading-tight text-[11px] shadow-sm">
                        
                        {/* Cabecera Empresa */}
                        <div className="text-center mb-3">
                            <h1 className="text-xl font-black uppercase tracking-tighter mb-1 mt-2">{settings.empresa_nombre || 'MI EMPRESA POS'}</h1>
                            <p className="font-bold text-[10px]">RFC: {settings.empresa_rfc || 'XAXX010101000'}</p>
                            <p className="text-[10px] uppercase">{lastSale.branchName || 'SUCURSAL MATRIZ'}</p>
                            <p className="text-[9px] mt-1">{settings.empresa_direccion || 'Dirección no configurada'}</p>
                            <p className="text-[10px] mt-1 font-bold border-y border-dashed border-black/50 py-1.5 uppercase tracking-widest">
                                TICKET DE VENTA
                            </p>
                        </div>

                        {/* Datos de Venta */}
                        <div className="flex justify-between text-[10px] mb-3 border-b border-dashed border-black/50 pb-2">
                            <div>
                                <p><span className="font-bold">FECHA:</span> {new Date().toLocaleDateString()}</p>
                                <p><span className="font-bold">HORA:</span> {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                <p><span className="font-bold">CAJERO:</span> {lastSale.user || 'SISTEMA'}</p>
                            </div>
                            <div className="text-right">
                                <p><span className="font-bold">FOLIO:</span> #{Math.floor(Math.random()*100000)}</p>
                                <p><span className="font-bold">CLIENTE:</span></p>
                                <p className="truncate max-w-[120px]">{lastSale.customerName || 'PÚBLICO GENERAL'}</p>
                            </div>
                        </div>

                        {/* Tabla de Artículos */}
                        <table className="w-full text-left mb-2 text-[10px]">
                            <thead className="border-b border-black">
                                <tr>
                                    <th className="font-bold py-1 w-6">CANT</th>
                                    <th className="font-bold py-1">ARTÍCULO</th>
                                    <th className="font-bold py-1 text-right">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="font-mono text-[10px]">
                                {lastSale.items.map((item, i) => (
                                    <tr key={i} className="border-b border-dashed border-black/20">
                                        <td className="py-1 break-all align-top pr-1">{item.cantidad}</td>
                                        <td className="py-1 leading-tight pr-1">
                                            {item.nombre.toUpperCase()}
                                            <br/><span className="text-[9px] text-gray-600">${item.selectedPrice.toFixed(2)} c/u</span>
                                            {item.descuento > 0 && <span className="text-[9px] ml-1">(-{item.descuento}%)</span>}
                                        </td>
                                        <td className="py-1 text-right align-top font-bold">${(item.selectedPrice * item.cantidad * (1 - (item.descuento || 0)/100)).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totales */}
                        <div className="w-full border-t border-black pt-2 mb-3">
                            <div className="flex justify-between text-[11px] mb-0.5">
                                <span>SUBTOTAL:</span>
                                <span>${(lastSale.total / 1.16).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] mb-0.5">
                                <span>IVA (16%):</span>
                                <span>${(lastSale.total - (lastSale.total / 1.16)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-black mt-1 py-1 border-y border-dashed border-black/50">
                                <span>TOTAL:</span>
                                <span>${lastSale.total?.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Pagos (Split) */}
                        <div className="text-[10px] mb-4">
                            <p className="font-bold uppercase mb-1">Pagado mediante:</p>
                            <div className="flex justify-between font-mono">
                                <span>{lastSale.method === 'contado' ? 'EFECTIVO' : 'CRÉDITO'}</span>
                                <span>${(lastSale.monto_recibido > 0 ? lastSale.monto_recibido : lastSale.total).toFixed(2)}</span>
                            </div>
                            {lastSale.method === 'contado' && lastSale.cambio !== undefined && (
                                <div className="flex justify-between font-mono font-bold mt-1">
                                    <span>CAMBIO ENTREGADO:</span>
                                    <span>${lastSale.cambio?.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {/* Pie (Folio de Barras / QR / Legal) */}
                        <div className="text-center mt-6 flex flex-col items-center">
                            <p className="font-bold uppercase tracking-widest text-[10px] mb-2">{settings.ticket_lema || '¡GRACIAS POR SU COMPRA!'}</p>
                            <div className="w-[80%] h-12 border-4 border-l-8 border-r-8 border-t-2 border-b-2 border-black flex items-center justify-center font-barcode text-xs tracking-[8px] opacity-80 mb-1">
                                ||||| | |||| ||
                            </div>
                            <p className="text-[9px]">Cualquier devolución cuenta con 15 días presentando este ticket original íntegro.</p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="no-print p-4 sm:p-6 bg-slate-900 flex gap-3 z-10 shrink-0">
                    <button onClick={() => setShowTicketModal(false)} className="flex-1 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:text-white hover:bg-slate-700 transition-colors">Cerrar / Nueva Venta</button>
                    <button onClick={handlePrintTicket} className="flex-1 py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-900/50 active:scale-95 transition-all text-lg tracking-wide flex justify-center items-center gap-2">
                        <Printer size={20} />
                        IMPRIMIR
                    </button>
                </div>
            </div>
        </div>
    )
}
