import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Save, Settings, Building2, ShoppingBag, PackageSearch, Info, Percent } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../hooks/useSettings'

export default function SettingsAdmin() {
    const { profile } = useAuth()
    const { settings: currentSettings, isLoading: loadingSettings } = useSettings()
    
    const [config, setConfig] = useState({})
    const [activeTab, setActiveTab] = useState('identidad')
    const [saving, setSaving] = useState(false)

    // Clonar settings al estado editable cuando cargan
    useEffect(() => {
        if (!loadingSettings && Object.keys(currentSettings).length > 0) {
            setConfig(prev => ({ ...currentSettings }))
        }
    }, [currentSettings, loadingSettings])

    const handleSave = async () => {
        if (profile?.rol !== 'admin') {
            toast.error('Privilegios insuficientes')
            return
        }

        setSaving(true)
        try {
            // Transformar el obj a array de { llave, valor } para upsert masivo
            const upserts = Object.keys(config).map(llave => ({
                llave,
                valor: String(config[llave]),
                updated_at: new Date().toISOString()
            }))

            const { error } = await supabase
                .from('configuraciones_sistema')
                .upsert(upserts, { onConflict: 'llave' })

            if (error) throw error
            toast.success('Configuraciones globales guardadas exitosamente')
        } catch (error) {
            toast.error('Error guardando configuraciones')
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    if (profile?.rol !== 'admin') {
        return (
            <div className="flex h-[calc(100vh-5rem)] items-center justify-center p-8">
                <div className="text-center animate-in fade-in zoom-in duration-500">
                    <span className="text-6xl mb-4 block">🔒</span>
                    <h2 className="text-2xl font-black text-slate-800">Acceso Restringido</h2>
                    <p className="text-slate-500 mt-2">Solo los Administradores Globales pueden acceder a las Configuraciones del Sistema.</p>
                </div>
            </div>
        )
    }

    const TABS = [
        { id: 'identidad', label: 'Identidad (Tickets)', icon: Building2 },
        { id: 'ventas', label: 'Reglas de Venta', icon: ShoppingBag },
        { id: 'compras', label: 'Abastecimiento', icon: PackageSearch },
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 p-4 lg:p-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Settings className="text-blue-600" size={32} />
                        Centro de Control Múltiple
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Autonomía de Negocio: Modifica operativas técnicas sin programar.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save size={20} />
                    {saving ? 'Aplicando Reglas...' : 'Guardar y Aplicar Reglas'}
                </button>
            </header>

            {loadingSettings ? (
                <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Tabs */}
                    <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
                        {TABS.map(tab => {
                            const active = activeTab === tab.id
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 w-full text-left px-5 py-4 rounded-2xl font-bold transition-all ${
                                        active ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                                    }`}
                                >
                                    <Icon size={20} className={active ? 'text-white' : 'text-slate-400'} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[500px]">
                        
                        {/* TAB IDENTIDAD */}
                        {activeTab === 'identidad' && (
                            <div className="space-y-6 animate-in fade-in">
                                <h2 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4 mb-6">Datos Fiscales y Estéticos del Ticket</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Nombre Comercial (Frontend)</label>
                                        <input type="text" value={config.empresa_nombre || ''}
                                            onChange={e => setConfig({ ...config, empresa_nombre: e.target.value })}
                                            className="w-full font-bold text-slate-700 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">RFC de la Empresa</label>
                                        <input type="text" value={config.empresa_rfc || ''}
                                            onChange={e => setConfig({ ...config, empresa_rfc: e.target.value })}
                                            className="w-full font-bold text-slate-700 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Dirección Matriz</label>
                                        <input type="text" value={config.empresa_direccion || ''}
                                            onChange={e => setConfig({ ...config, empresa_direccion: e.target.value })}
                                            className="w-full font-bold text-slate-700 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Lema al final del Ticket</label>
                                        <textarea value={config.ticket_lema || ''} onChange={e => setConfig({ ...config, ticket_lema: e.target.value })} rows={2}
                                            className="w-full font-bold text-slate-700 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none resize-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB VENTAS */}
                        {activeTab === 'ventas' && (
                            <div className="space-y-8 animate-in fade-in">
                                <h2 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4">Motor de Ventas y Cajeros</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                                            Vender sin Stock Físico
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-4 h-8">Permite que el sistema despache productos creando inventario negativo (Ideal para emergencias operativas).</p>
                                        <select value={config.permitir_venta_sin_stock || 'false'} onChange={e => setConfig({ ...config, permitir_venta_sin_stock: e.target.value })}
                                            className="w-full bg-white border border-slate-200 font-bold p-3 rounded-xl focus:border-blue-500 outline-none">
                                            <option value="true">Sí, Permitir vender sin stock</option>
                                            <option value="false">No, Bloquear ventas sin stock (Estricto)</option>
                                        </select>
                                    </div>

                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                                            Seguridad Cajas
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-4 h-8">Exigir PIN del Gerente para borrar productos de un ticket en proceso.</p>
                                        <select value={config.requiere_pin_cancelacion || 'false'} onChange={e => setConfig({ ...config, requiere_pin_cancelacion: e.target.value })}
                                            className="w-full bg-white border border-slate-200 font-bold p-3 rounded-xl focus:border-blue-500 outline-none">
                                            <option value="false">Desactivado (Confiar en cajeros)</option>
                                            <option value="true">Activado (Requiere autorización)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-8 border-t border-slate-100 pt-8">
                                    <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                        <div className="bg-yellow-100 text-yellow-600 p-1.5 rounded-lg"><Percent size={18} /></div>
                                        Fidelización (Dinero Electrónico)
                                    </h3>
                                    <div className="max-w-xs">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">% de Cashback en Ventas</label>
                                        <div className="relative">
                                            <input type="number" min="0" max="100" step="0.5"
                                                value={config.porcentaje_monedero || 0}
                                                onChange={(e) => setConfig({ ...config, porcentaje_monedero: Number(e.target.value) })}
                                                className="w-full font-black text-slate-700 p-3 pl-6 border border-slate-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 outline-none"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB COMPRAS */}
                        {activeTab === 'compras' && (
                            <div className="space-y-8 animate-in fade-in">
                                <h2 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4">Política de Abastecimiento Base</h2>
                                
                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex gap-3 text-sm text-blue-800">
                                    <Info className="shrink-0 mt-0.5 text-blue-500" size={18} />
                                    <div>
                                        <strong>Márgenes de Utilidad Sugeridos.</strong> Cuando ingresas una factura de compra y cambias el Costo de un artículo, el sistema usará estos porcentajes en cascada para calcular y sugerirte los 3 niveles de precio al Cliente de manera automática.
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">1. Menudeo</label>
                                        <div className="relative">
                                            <input type="number" value={config.utilidad_menudeo_default || 30} onChange={e => setConfig({ ...config, utilidad_menudeo_default: e.target.value })}
                                                className="w-full font-black text-blue-700 p-3 bg-white border border-slate-200 rounded-xl outline-none" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">2. Medio Mayoreo</label>
                                        <div className="relative">
                                            <input type="number" value={config.utilidad_medio_mayoreo_default || 20} onChange={e => setConfig({ ...config, utilidad_medio_mayoreo_default: e.target.value })}
                                                className="w-full font-black text-purple-700 p-3 bg-white border border-slate-200 rounded-xl outline-none" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">3. Mayoreo</label>
                                        <div className="relative">
                                            <input type="number" value={config.utilidad_mayoreo_default || 15} onChange={e => setConfig({ ...config, utilidad_mayoreo_default: e.target.value })}
                                                className="w-full font-black text-emerald-700 p-3 bg-white border border-slate-200 rounded-xl outline-none" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6 max-w-xs">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">IVA Default al recibir</label>
                                    <select value={config.iva_default || 16} onChange={e => setConfig({ ...config, iva_default: Number(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 font-bold p-3 rounded-xl focus:border-blue-500 outline-none">
                                        <option value={16}>16 % Normal</option>
                                        <option value={8}>8 % Frontera</option>
                                        <option value={0}>0 % Exento / Extranjero</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
