import { useState } from 'react'
import { X, DollarSign, Wallet, CreditCard, Landmark, CheckCircle2, ChevronRight, Plus } from 'lucide-react'
import { useQuery } from '@powersync/react'
import { powersync } from '../../powersync/db'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'

export default function PagosOrdenCompraModal({ show, orden, onClose }) {
    const { user } = useAuth()
    const [monto, setMonto] = useState('')
    const [metodo, setMetodo] = useState('TRANSFERENCIA')
    const [procesando, setProcesando] = useState(false)

    // Consultamos los abonos existentes
    const { data: pagos = [] } = useQuery(
        `SELECT p.* FROM pagos_proveedores p WHERE p.orden_compra_id = ? ORDER BY p.fecha DESC`,
        [orden?.id],
        { enabled: !!orden?.id }
    )

    if (!show || !orden) return null

    const totalDoc = parseFloat(orden.total || 0)
    const abonosTotal = pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0)
    const saldoPendiente = totalDoc - abonosTotal
    const isPagada = saldoPendiente <= 0.01

    const handleAbonar = async (e) => {
        e.preventDefault()
        const cantidad = parseFloat(monto)
        if (isNaN(cantidad) || cantidad <= 0) {
            toast.error('Ingresa un monto válido')
            return
        }
        if (cantidad > saldoPendiente + 0.1) {
            toast.error('El abono no puede ser mayor al saldo pendiente')
            return
        }

        setProcesando(true)
        try {
            await powersync.execute(
                `INSERT INTO pagos_proveedores (id, proveedor_id, orden_compra_id, monto, metodo_pago, fecha, usuario_id)
                 VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
                [crypto.randomUUID(), orden.proveedor_id, orden.id, cantidad, metodo, user?.id]
            )
            toast.success('Pago registrado correctamente')
            setMonto('')
        } catch (error) {
            console.error(error)
            toast.error('Falló al registrar el pago')
        } finally {
            setProcesando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-slate-900 p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 text-white">
                        <div className="p-3 bg-white/10 rounded-2xl">
                            <DollarSign size={24} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Cuentas por Pagar</h2>
                            <p className="text-slate-400 text-sm font-semibold">Folio: {orden.numero_folio || orden.uuid_factura?.slice(0,8) || orden.id.slice(0,8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col gap-6">
                    
                    {/* Resumen de Deuda */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-6">
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Factura</p>
                            <p className="text-2xl font-black text-slate-800">${totalDoc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                            <p className="text-sm font-bold text-slate-500 mt-2">{orden.proveedor_nombre}</p>
                        </div>
                        <div className="hidden sm:block w-px bg-slate-100"></div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saldo Pendiente</p>
                            <p className={`text-3xl font-black ${isPagada ? 'text-emerald-500' : 'text-rose-600'}`}>
                                ${Math.max(0, saldoPendiente).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            {isPagada && (
                                <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                                    <CheckCircle2 size={12} /> FACTURA LIQUIDADA
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Formulario Nuevo Abono */}
                    {!isPagada && (
                        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
                            <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-100">
                                <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest">Registrar Nuevo Abono</h3>
                            </div>
                            <form onSubmit={handleAbonar} className="p-5 flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Monto a pagar</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            max={saldoPendiente}
                                            value={monto}
                                            onChange={e => setMonto(e.target.value)}
                                            placeholder={saldoPendiente.toFixed(2)}
                                            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl pl-8 pr-4 py-3 font-black text-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Método</label>
                                    <select 
                                        value={metodo}
                                        onChange={e => setMetodo(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    >
                                        <option value="TRANSFERENCIA">Transferencia SPEI</option>
                                        <option value="EFECTIVO">Efectivo</option>
                                        <option value="TARJETA">Tarjeta C/D</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={procesando}
                                    className="w-full sm:w-auto bg-blue-600 text-white font-black px-6 py-3.5 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {procesando ? '...' : <><Plus size={18} /> Pagar</>}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Historial de Pagos */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 shrink-0">
                        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-700 tracking-tight">Historial de Pagos</h3>
                            <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                                {pagos.length} abonos
                            </span>
                        </div>
                        {pagos.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-semibold">
                                No hay pagos registrados para esta compra.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {pagos.map(p => (
                                    <li key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                {p.metodo_pago === 'TRANSFERENCIA' ? <Landmark size={18} /> : 
                                                 p.metodo_pago === 'EFECTIVO' ? <Wallet size={18} /> : <CreditCard size={18} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{p.metodo_pago}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                                    {new Date(p.fecha).toLocaleDateString()} a las {new Date(p.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-emerald-600">+ ${parseFloat(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
