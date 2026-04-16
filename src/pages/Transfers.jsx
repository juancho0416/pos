// Transfers.jsx — Flujo Digital de Traspasos: Petición → Despacho → Recepción
import { useAuth } from '../context/AuthContext'
import { useTransfers } from '../hooks/useTransfers'
import {
    ArrowRightLeft, Search, Plus, Trash2, Send,
    Truck, PackageCheck, Clock, XCircle
} from 'lucide-react'
import DigitalDispatchModal from '../components/transfers/DigitalDispatchModal'
import DigitalReceiveModal from '../components/transfers/DigitalReceiveModal'

const TABS = [
    { id: 'solicitar', label: 'Solicitar Material', icon: Send },
    { id: 'entrantes', label: 'Solicitudes Entrantes', icon: Clock },
    { id: 'transito', label: 'En Tránsito', icon: Truck },
]

const ESTADO_BADGE = {
    SOLICITADO: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Solicitado' },
    EN_TRANSITO: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En Tránsito' },
    RECIBIDO: { bg: 'bg-green-100', text: 'text-green-800', label: 'Recibido' },
    CANCELADO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
}

export default function Transfers() {
    const { user, branches, selectedBranch } = useAuth()
    const {
        activeTab, setActiveTab, loading,
        dispatchTarget, setDispatchTarget, receiveTarget, setReceiveTarget,
        destId, setDestId, cart, setCart, searchTerm, setSearchTerm,
        notas, setNotas, stockMap, loadingStock, hasStockError,
        addToCart, updateCartQty, handleSolicitar, handleCancelar,
        fetchTraslados,
        solicitudesEntrantes, enTransito, misSolicitudes, filteredProducts,
    } = useTransfers({ user, branches, selectedBranch })

    const currentBranchName = branches.find(b => b.id === selectedBranch)?.nombre || ''

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-2.5 rounded-xl"><ArrowRightLeft size={24} className="text-blue-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Traspasos de Mercancía</h1>
                    <p className="text-sm text-gray-500">Sucursal activa: <span className="font-bold text-blue-600">{currentBranchName}</span></p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const count = tab.id === 'entrantes' ? solicitudesEntrantes.length : tab.id === 'transito' ? enTransito.length : 0
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={16} />{tab.label}
                            {count > 0 && (<span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{count}</span>)}
                        </button>
                    )
                })}
            </div>

            {/* TAB 1: SOLICITAR */}
            {activeTab === 'solicitar' && (
                <div className="space-y-6">
                    {misSolicitudes.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2"><Clock size={16} />Mis solicitudes pendientes ({misSolicitudes.length})</h3>
                            <div className="space-y-2">
                                {misSolicitudes.map(t => (
                                    <div key={t.id} className="bg-white rounded-lg p-3 flex justify-between items-center border border-amber-100">
                                        <div>
                                            <span className="font-bold text-slate-700">#{String(t.folio).padStart(4, '0')}</span>
                                            <span className="text-sm text-slate-500 ml-2">← {branches.find(b => b.id === t.origen_id)?.nombre}</span>
                                            <span className="text-xs text-slate-400 ml-2">{t.items?.length} producto(s)</span>
                                        </div>
                                        <button onClick={() => handleCancelar(t)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"><XCircle size={14} /> Cancelar</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Send size={20} className="text-blue-600" />Nueva Solicitud de Material</h2>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Solicitar material de:</label>
                            <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition font-medium" value={destId} onChange={e => setDestId(e.target.value)}>
                                <option value="">Seleccionar sucursal...</option>
                                {branches.filter(b => b.id !== selectedBranch).map(b => (<option key={b.id} value={b.id}>{b.nombre}</option>))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Agregar productos</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="text" placeholder="Buscar por nombre o SKU..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                {filteredProducts.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-lg mt-1 border border-gray-100 max-h-60 overflow-y-auto z-10">
                                        {filteredProducts.map(p => (
                                            <button key={p.id} type="button" className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex justify-between items-center" onClick={() => addToCart(p)}>
                                                <span className="font-medium">{p.nombre}</span>
                                                <span className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.sku}</span>
                                                    <Plus size={16} className="text-blue-500" />
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {cart.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Productos seleccionados ({cart.length})</h3>
                                {cart.map(item => {
                                    const available = stockMap[item.producto_id]
                                    const overLimit = available !== undefined && item.cantidad > available
                                    return (
                                        <div key={item.producto_id} className={`flex flex-col bg-white p-3 rounded-lg border ${overLimit ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
                                            <div className="flex items-center justify-between">
                                                <div><p className="font-bold text-gray-800 text-sm">{item.nombre}</p><p className="text-xs text-gray-400">{item.sku}</p></div>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => updateCartQty(item.producto_id, item.cantidad - 1)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">−</button>
                                                    <input type="number" min="1" value={item.cantidad} onChange={e => updateCartQty(item.producto_id, parseInt(e.target.value) || 0)} className={`w-14 text-center border rounded-lg py-1 font-mono font-bold ${overLimit ? 'border-red-400 text-red-600' : 'border-gray-200'}`} />
                                                    <button type="button" onClick={() => updateCartQty(item.producto_id, item.cantidad + 1)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">+</button>
                                                    <button type="button" onClick={() => setCart(cart.filter(c => c.producto_id !== item.producto_id))} className="text-red-400 hover:text-red-600 ml-2"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            {destId && available !== undefined && (<p className={`text-xs mt-1.5 font-medium ${overLimit ? 'text-red-500' : 'text-green-600'}`}>{overLimit ? `⚠️ Excede stock — Disponible en origen: ${available} uds` : `✓ Disponible en origen: ${available} uds`}</p>)}
                                            {destId && available === undefined && loadingStock && (<p className="text-xs mt-1.5 text-slate-400 italic">Consultando stock...</p>)}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Notas (opcional)</label>
                            <textarea className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={2} placeholder="Ej: Urgente, cliente esperando..." value={notas} onChange={e => setNotas(e.target.value)} />
                        </div>

                        <button onClick={handleSolicitar} disabled={loading || cart.length === 0 || !destId || hasStockError} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-base">
                            <Send size={20} />{loading ? 'Enviando solicitud...' : `Enviar Solicitud (${cart.length} producto${cart.length !== 1 ? 's' : ''})`}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 2: ENTRANTES */}
            {activeTab === 'entrantes' && (
                <div className="space-y-4">
                    {solicitudesEntrantes.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                            <Clock size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold text-sm uppercase tracking-wider">No hay solicitudes pendientes</p>
                            <p className="text-xs mt-1">Las solicitudes de otras sucursales aparecerán aquí</p>
                        </div>
                    ) : solicitudesEntrantes.map(t => (
                        <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-50 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-lg font-black text-slate-800">#{String(t.folio).padStart(4, '0')}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_BADGE[t.estado].bg} ${ESTADO_BADGE[t.estado].text}`}>{ESTADO_BADGE[t.estado].label}</span>
                                    </div>
                                    <p className="text-sm text-gray-500"><span className="font-bold text-green-600">{branches.find(b => b.id === t.destino_id)?.nombre}</span> solicita material de <span className="font-bold text-red-600">{currentBranchName}</span></p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(t.created_at).toLocaleString('es-MX')}</p>
                                    {t.notas && <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">📝 {t.notas}</p>}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-gray-500 text-xs uppercase"><th className="text-left py-1 font-semibold">Producto</th><th className="text-right py-1 font-semibold">Cantidad</th></tr></thead>
                                    <tbody>{t.items?.map(item => (<tr key={item.id} className="border-t border-gray-100"><td className="py-2"><span className="font-medium text-gray-800">{item.producto?.nombre}</span><span className="text-xs text-gray-400 ml-2">{item.producto?.sku}</span></td><td className="py-2 text-right font-bold text-gray-900">{item.cantidad}</td></tr>))}</tbody>
                                </table>
                            </div>
                            <div className="p-4 flex gap-3 justify-end border-t border-gray-100">
                                <button onClick={() => handleCancelar(t)} className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1"><XCircle size={16} /> Rechazar</button>
                                <button onClick={() => setDispatchTarget(t)} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition shadow-sm flex items-center gap-2 disabled:opacity-50"><Truck size={18} />Aprobar y Despachar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 3: EN TRÁNSITO */}
            {activeTab === 'transito' && (
                <div className="space-y-4">
                    {enTransito.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                            <Truck size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold text-sm uppercase tracking-wider">No hay traslados en tránsito</p>
                            <p className="text-xs mt-1">Los traslados despachados hacia esta sucursal aparecerán aquí</p>
                        </div>
                    ) : enTransito.map(t => (
                        <div key={t.id} className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-50 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-lg font-black text-slate-800">#{String(t.folio).padStart(4, '0')}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_BADGE.EN_TRANSITO.bg} ${ESTADO_BADGE.EN_TRANSITO.text}`}>🚚 En Tránsito</span>
                                    </div>
                                    <p className="text-sm text-gray-500">Desde <span className="font-bold text-slate-700">{branches.find(b => b.id === t.origen_id)?.nombre}</span> → <span className="font-bold text-green-600">{currentBranchName}</span></p>
                                    <p className="text-xs text-gray-400 mt-1">Despachado: {t.despachado_at ? new Date(t.despachado_at).toLocaleString('es-MX') : '—'}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-gray-500 text-xs uppercase"><th className="text-left py-1 font-semibold">Producto</th><th className="text-right py-1 font-semibold">Cantidad</th></tr></thead>
                                    <tbody>{t.items?.map(item => (<tr key={item.id} className="border-t border-gray-100"><td className="py-2"><span className="font-medium text-gray-800">{item.producto?.nombre}</span><span className="text-xs text-gray-400 ml-2">{item.producto?.sku}</span></td><td className="py-2 text-right font-bold text-gray-900">{item.cantidad}</td></tr>))}</tbody>
                                </table>
                            </div>
                            <div className="p-4 flex justify-end border-t border-gray-100">
                                <button onClick={() => setReceiveTarget(t)} disabled={loading} className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-sm flex items-center gap-2 disabled:opacity-50"><PackageCheck size={18} />Confirmar Recepción Física</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {dispatchTarget && (<DigitalDispatchModal transfer={dispatchTarget} branches={branches} userId={user.id} onClose={() => setDispatchTarget(null)} onSuccess={fetchTraslados} />)}
            {receiveTarget && (<DigitalReceiveModal transfer={receiveTarget} branches={branches} userId={user.id} onClose={() => setReceiveTarget(null)} onSuccess={fetchTraslados} />)}
        </div>
    )
}
