import { Lock, Unlock, AlertTriangle, Save, DollarSign, Clock, RotateCcw, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCashClose } from '../hooks/useCashClose'
import { ReportExports } from '../services/ReportExports'

export default function CashClose() {
    const { branches, selectedBranch, changeBranch, profile } = useAuth()
    const {
        activeTurn, loading, closing, totals,
        initialCash, setInitialCash, physicalCash, setPhysicalCash,
        showConfirmClose, setShowConfirmClose, confirmData,
        handleOpenTurn, handleCloseTurn, executeCloseTurn, handleForceClose,
    } = useCashClose(selectedBranch)

    if (loading) return <div className="p-10 text-center text-gray-500">Verificando estado de caja...</div>

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Lock className="text-blue-600" />Corte de Caja</h1>
                    <p className="text-gray-500 text-sm">Gestión de Turnos y Arqueo</p>
                </div>
                <select className="bg-white border border-gray-300 rounded-lg px-4 py-2" value={selectedBranch} onChange={(e) => changeBranch(e.target.value)}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
            </div>

            {!activeTurn ? (
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 max-w-lg mx-auto">
                    <div className="bg-blue-600 p-6 text-white text-center">
                        <Unlock size={48} className="mx-auto mb-3 opacity-80" />
                        <h2 className="text-xl font-bold">Abrir Nuevo Turno</h2>
                        <p className="opacity-80 text-sm mt-1">Sucursal: {branches.find(b => b.id == selectedBranch)?.nombre}</p>
                    </div>
                    <form onSubmit={handleOpenTurn} className="p-8 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Fondo de Caja (Monto Inicial)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="number" placeholder="0.00" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-2xl font-bold text-gray-800" value={initialCash} onChange={(e) => setInitialCash(e.target.value)} autoFocus />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Ingresa el dinero con el que inicias el día.</p>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">INICIAR TURNO</button>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div className="bg-green-50 border border-green-100 p-6 rounded-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-green-700 font-bold flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"></span> TURNO ACTIVO</p>
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Clock size={12} /> Iniciado: {activeTurn.fecha_inicio ? new Date(activeTurn.fecha_inicio).toLocaleTimeString() : 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-green-600 font-bold uppercase">Fondo Inicial</p>
                                    <p className="text-2xl font-bold text-green-800">${(activeTurn.monto_inicial || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><RotateCcw size={18} />Movimientos del Turno</h3>
                                <button type="button" onClick={() => ReportExports.exportCashClosePDF({ ...activeTurn, branchName: branches.find(b => b.id == selectedBranch)?.nombre, userName: profile?.email || 'Admin', diferencia: (parseFloat(physicalCash || 0) - ((activeTurn.monto_inicial || 0) + totals.efectivo)) }, totals)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md font-bold hover:bg-blue-100 flex items-center gap-1.5 border border-blue-100 transition"><FileText size={14} /> PDF</button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Ventas Efectivo</span><span className="font-bold text-gray-800">+${totals.efectivo.toFixed(2)}</span></div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Ventas Tarjeta</span><span className="font-bold text-blue-600">+${totals.tarjeta.toFixed(2)}</span></div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Créditos Otorgados</span><span className="font-bold text-purple-600">+${totals.credito.toFixed(2)}</span></div>
                                <div className="border-t border-gray-100 pt-3 flex justify-between"><span className="font-bold text-gray-800">Total Esperado (Efectivo)</span><span className="font-bold text-xl text-gray-900">${((activeTurn.monto_inicial || 0) + totals.efectivo).toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Lock className="text-red-500" />Cerrar Turno</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Efectivo Físico en Caja</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="number" step="0.01" placeholder="0.00" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 text-2xl font-bold text-gray-800" value={physicalCash} onChange={(e) => setPhysicalCash(e.target.value)} />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Cuenta los billetes y monedas que tienes físicamente.</p>
                            </div>
                            {physicalCash && (
                                <div className={`p-4 rounded-xl border ${(parseFloat(physicalCash) - ((activeTurn.monto_inicial || 0) + totals.efectivo)) < 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
                                    <div className="flex justify-between items-center"><span className="font-bold text-sm">Diferencia Estimada:</span><span className="font-black text-lg">${(parseFloat(physicalCash) - ((activeTurn.monto_inicial || 0) + totals.efectivo)).toFixed(2)}</span></div>
                                    {(parseFloat(physicalCash) - ((activeTurn.monto_inicial || 0) + totals.efectivo)) < 0 && (<div className="flex items-center gap-2 mt-2 text-xs font-bold"><AlertTriangle size={12} />FALTA DINERO</div>)}
                                </div>
                            )}
                            <button type="button" onClick={handleCloseTurn} disabled={closing} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"><Save size={20} />{closing ? 'CERRANDO...' : 'CONFIRMAR CIERRE'}</button>
                        </div>
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                            <button type="button" onClick={handleForceClose} disabled={closing} className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-3 rounded-xl font-bold hover:bg-orange-100 transition-colors flex justify-center items-center gap-2 text-sm active:scale-95 disabled:opacity-50"><AlertTriangle size={16} />FORZAR CIERRE (Sin Arqueo)</button>
                            <p className="text-xs text-gray-400 mt-2 text-center">Usa esto solo si el turno está trabado y no puedes cerrarlo normalmente.</p>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmClose && confirmData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Resumen de Cierre</h3>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Fondo Inicial</span><span className="font-bold">${(activeTurn.monto_inicial || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Ventas Efectivo</span><span className="font-bold">+${totals.efectivo.toFixed(2)}</span></div>
                            <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"><span className="font-bold text-blue-800">Esperado</span><span className="font-black text-blue-800">${confirmData.esperado.toFixed(2)}</span></div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Físico Contado</span><span className="font-bold">${confirmData.fisico.toFixed(2)}</span></div>
                            <div className={`flex justify-between p-3 rounded-lg border ${confirmData.diferencia < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}><span className="font-bold">DIFERENCIA</span><span className="font-black text-lg">${confirmData.diferencia.toFixed(2)}</span></div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowConfirmClose(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button type="button" onClick={executeCloseTurn} disabled={closing} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50">{closing ? 'Cerrando...' : 'Confirmar'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
