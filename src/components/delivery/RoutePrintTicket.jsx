// RoutePrintTicket.jsx — Ticket térmico de ruta despachada (Oculto, solo para impresión)
import React, { forwardRef } from 'react'
import { Printer } from 'lucide-react'

// Utiliza la misma clase 'print-only' y 'ticket-container' que el ticket de ventas regular
const RoutePrintTicket = forwardRef(({ choferNombre, vehiculo, ventasIds, ventasObject, firmaChofer }, ref) => {
    if (!ventasIds || ventasIds.length === 0) return null

    const totalCobrar = ventasIds.map(id => ventasObject[id]).reduce((sum, v) => {
        if (v.metodo_pago !== 'contado' && v.metodo_pago !== 'tarjeta' && v.metodo_pago !== 'credito') {
            return sum + (v.total || 0)
        }
        return sum
    }, 0)

    const dateStr = new Date().toLocaleString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })

    return (
        <div style={{ display: 'none' }}>
            <div ref={ref} className="ticket-container bg-white text-black p-4 w-[80mm] mx-auto" style={{ fontFamily: 'monospace', fontSize: '12px' }}>

                {/* Header */}
                <div className="text-center mb-4 border-b border-black pb-2 border-dashed">
                    <h1 className="font-bold text-lg mb-1" style={{ fontSize: '16px' }}>HOJA DE RUTA</h1>
                    <p className="font-bold">{choferNombre}</p>
                    <p>{vehiculo || 'Sin vehículo'}</p>
                    <p className="text-[10px] mt-1">{dateStr}</p>
                </div>

                {/* Resumen */}
                <div className="mb-4">
                    <p className="font-bold whitespace-nowrap">ENTREGAS: {ventasIds.length}</p>
                    <p className="font-bold whitespace-nowrap">COBRAR: ${totalCobrar.toLocaleString('es-MX')}</p>
                </div>

                {/* Lista de Entregas */}
                <div className="mb-4 border-t border-b border-black py-2 border-dashed space-y-3">
                    {ventasIds.map((id, index) => {
                        const v = ventasObject[id]
                        const isContado = v.metodo_pago === 'contado' || v.metodo_pago === 'tarjeta'
                        const isCredito = v.metodo_pago === 'credito'

                        return (
                            <div key={id} className="mb-2">
                                <p className="font-bold break-words">{index + 1}. {v.cliente?.nombre || 'Cliente'}</p>
                                <p className="break-words pl-2">Dir: {v.direccion_entrega || 'N/A'}</p>
                                <p className="pl-2">Tel: {v.cliente?.telefono || v.telefono_entrega || 'N/A'}</p>

                                <div className="pl-2 mt-1">
                                    {isContado && <p className="font-bold">* PAGADO *</p>}
                                    {isCredito && <p className="font-bold">* CRÉDITO *</p>}
                                    {!isContado && !isCredito && (
                                        <p className="font-bold underline">COBRAR: ${v.total?.toLocaleString('es-MX')}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Firma */}
                <div className="mt-8 text-center pt-4">
                    <p className="mb-2 font-bold text-[10px]">FIRMA DE CHOFER (ACEPTA CARGA)</p>
                    {firmaChofer ? (
                        <img
                            src={firmaChofer}
                            alt="Firma"
                            style={{
                                width: '100%',
                                maxHeight: '60px',
                                objectFit: 'contain',
                                filter: 'grayscale(100%) contrast(200%)' // Óptimo para térmico
                            }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '40px', borderBottom: '1px solid black' }}></div>
                    )}
                    <p className="mt-2 text-[10px]">{choferNombre}</p>
                </div>

                <div className="text-center mt-6 text-[10px]">
                    <p>Ferretería POS - Módulo Ferre-FedEx</p>
                </div>
            </div>
        </div>
    )
})

export default RoutePrintTicket
