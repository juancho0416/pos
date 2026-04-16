import React, { useRef } from 'react'
import { X, CheckCircle, Printer, AlertTriangle, UserCheck, CreditCard } from 'lucide-react'
import { useB2BAdminStore } from '../../stores/useB2BAdminStore'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'
// Si tuvieras react-to-print instalado:
// import { useReactToPrint } from 'react-to-print'

export default function OrderDetailsModal() {
    const { selectedOrder, isModalOpen, closeOrderModal } = useB2BAdminStore()
    const printRef = useRef(null)

    if (!isModalOpen || !selectedOrder) return null

    // Simulación de validación de crédito del cliente
    const creditLimit = selectedOrder.cliente?.limite_credito || 150000
    const creditUsed = selectedOrder.cliente?.saldo_deudor || 45000
    const availableCredit = creditLimit - creditUsed
    const isCreditApproved = selectedOrder.total <= availableCredit

    const handleApproveAndDispatch = async () => {
        try {
            toast.loading('Autorizando orden...', { id: 'approve' })

            const { error } = await supabase
                .from('ventas')
                .update({ estado_entrega: 'EN_SURTIDO' })
                .eq('id', selectedOrder.id)

            if (error) throw error

            toast.success('Orden enviada a surtido (picking).', { id: 'approve' })
            // Aquí iríamos a print, llamando a react-to-print
            // handlePrint()

            closeOrderModal()
        } catch (err) {
            console.error(err)
            toast.error('Error al autorizar el pedido.', { id: 'approve' })
        }
    }

    const handleFinishLoading = async () => {
        try {
            toast.loading('Registrando carga...', { id: 'finish' })

            const { error } = await supabase
                .from('ventas')
                .update({ estado_entrega: 'LISTO_PARA_RUTA' }) // Cambio a LISTO_PARA_RUTA
                .eq('id', selectedOrder.id)

            if (error) throw error

            toast.success('Camioneta cargada. Esperando asignación de chofer/ruta.', { id: 'finish' })
            closeOrderModal()
        } catch (err) {
            console.error(err)
            toast.error('Error al registrar carga.', { id: 'finish' })
        }
    }

    const handlePrintPDF = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        const content = `
            <html>
                <head>
                    <title>Lista de Carga TKT-${selectedOrder.id}</title>
                    <style>
                        body { font-family: system-ui, sans-serif; padding: 30px; color: #000; }
                        h1 { margin: 0 0 5px 0; font-size: 24px; }
                        h2 { margin: 0 0 20px 0; font-size: 18px; color: #4b5563; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; font-size: 14px; }
                        th { background: #f3f4f6; color: #374151; }
                        .qty { font-size: 22px; font-weight: bold; text-align: center; }
                        .header { margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                        .sign { margin-top: 60px; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Lista de Carga de Camioneta (B2B)</h1>
                        <h2>Ticket TKT-${String(selectedOrder.id).padStart(5, '0')}</h2>
                        <p><strong>Cliente de Ruta:</strong> ${selectedOrder.nombre_receptor}</p>
                        <p><strong>Fecha de Expedición:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th width="15%">Cantidad</th>
                                <th width="20%">Art/SKU</th>
                                <th>Descripción de Carga</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedOrder.items?.map(item => `
                                <tr>
                                    <td class="qty">${item.cantidad}</td>
                                    <td>${item.producto_id}</td>
                                    <td>${item.nombre}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="sign">
                        <p>____________________________________________</p>
                        <p>Nombre y Firma del Encargado de Carga</p>
                    </div>
                </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <div>
                        <h2 className="text-xl font-bold text-white font-display">TKT-{String(selectedOrder.id).padStart(5, '0')}</h2>
                        <p className="text-slate-400 text-sm">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={closeOrderModal} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 bg-slate-900 border border-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Detalles del Cliente / Crédito */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <UserCheck size={14} /> Cliente B2B
                            </h3>
                            <p className="text-white font-semibold text-sm">{selectedOrder.nombre_receptor}</p>
                            <p className="text-slate-500 text-xs mt-1">RFC: {selectedOrder.cliente?.rfc || 'No registrado'}</p>
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                                <p className="text-slate-400 text-xs">Dirección de Entrega</p>
                                <p className="text-slate-300 text-sm mt-1 leading-snug">{selectedOrder.direccion_entrega}</p>
                            </div>
                        </div>

                        <div className={`border p-4 rounded-xl ${isCreditApproved ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${isCreditApproved ? 'text-emerald-400' : 'text-rose-400'}`}>
                                <CreditCard size={14} /> Análisis de Crédito
                            </h3>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-400">Total Pedido:</span>
                                <span className="text-white font-bold">${Number(selectedOrder.total).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-400">Crédito Libre:</span>
                                <span className="text-slate-300">${availableCredit.toLocaleString()}</span>
                            </div>

                            {!isCreditApproved && (
                                <div className="mt-3 pt-3 border-t border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    <span>El pedido excede el límite de crédito disponible. Requiere cobro anticipado.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Partidas (Items) */}
                    <div className="md:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
                            <h3 className="text-slate-300 text-sm font-bold">Lista de Carga (Bodeguero)</h3>
                            <button onClick={handlePrintPDF} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold uppercase flex items-center gap-1">
                                <Printer size={14} /> Imprimir Lista
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="text-xs uppercase bg-slate-900/50 text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">Cant</th>
                                        <th className="px-4 py-2">Descripción</th>
                                        <th className="px-4 py-2 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items?.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                            <td className="px-4 py-3 font-bold text-white w-16 align-top">
                                                <div className="bg-slate-700 text-center rounded text-base py-1">{item.cantidad}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top leading-tight">
                                                <span className="text-[10px] text-indigo-400 block mb-0.5">SKU {item.producto_id}</span>
                                                {item.nombre}
                                            </td>
                                            <td className="px-4 py-3 text-right align-top font-medium">
                                                ${(item.cantidad * item.precio_unitario).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Footer / Actions */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-4">
                    <button
                        onClick={closeOrderModal}
                        className="px-6 py-2.5 rounded-lg font-bold text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>

                    {selectedOrder.estado_entrega === 'PENDIENTE' && (
                        <button
                            onClick={handleApproveAndDispatch}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all
                                ${isCreditApproved
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                                }
                            `}
                        >
                            <CheckCircle size={18} />
                            {isCreditApproved ? 'Aprobar y Mandar a Muelle de Carga' : 'Forzar Aprobación (Fuera de Límite)'}
                        </button>
                    )}

                    {selectedOrder.estado_entrega === 'EN_SURTIDO' && (
                        <button
                            onClick={handleFinishLoading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg transition-all"
                        >
                            <CheckCircle size={18} /> ✅ Terminar de Cargar Camioneta
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}
