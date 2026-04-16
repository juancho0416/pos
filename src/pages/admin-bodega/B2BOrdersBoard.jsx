import React, { useEffect, useState } from 'react'
import { PlusCircle, Loader2, PackageSearch, Clock, Boxes, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useB2BAdminStore } from '../../stores/useB2BAdminStore'
import { useAdminRealtime } from '../../hooks/useAdminRealtime'
import OrderDetailsModal from '../../components/admin-bodega/OrderDetailsModal'

export default function B2BOrdersBoard() {
    const [b2bBranchId, setB2bBranchId] = useState(null)
    const { pedidosNuevos, pedidosEnSurtido, pedidosListos, openOrderModal } = useB2BAdminStore()

    // 1. Resolver el ID de 'Bodega Mayoreo'
    useEffect(() => {
        const fetchBranch = async () => {
            try {
                const { data } = await supabase
                    .from('sucursales')
                    .select('id')
                    .ilike('nombre', '%Bodega Mayoreo%')
                    .limit(1)
                    .single()

                setB2bBranchId(data ? data.id : 2)
            } catch (err) {
                console.error(err)
            }
        }
        fetchBranch()
    }, [])

    // 2. Invocar el Hook de Realtime pasándole la sucursal correcta
    useAdminRealtime(b2bBranchId)

    if (!b2bBranchId) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    // Subcomponente de Tarjeta Kanban
    const OrderCard = ({ pedido, colorClass, icon: Icon }) => (
        <div
            className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 cursor-pointer hover:border-slate-500 transition-colors group flex flex-col gap-3 shadow-lg shadow-black/20"
            onClick={() => openOrderModal(pedido)}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        TKT-{String(pedido.id).padStart(5, '0')}
                    </span>
                </div>
                <span className="text-[10px] text-slate-500">
                    {new Date(pedido.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            <h3 className="text-sm font-semibold text-slate-200 line-clamp-2">
                {pedido.nombre_receptor || 'Cliente Corporativo'}
            </h3>

            <div className="flex items-end justify-between mt-2 pt-3 border-t border-slate-800">
                <div className="text-xs text-slate-500">
                    {pedido.items?.length || 0} PARTIDAS
                </div>
                <div className="text-base font-bold text-white font-display">
                    ${Number(pedido.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </div>
        </div>
    )

    return (
        <div className="h-full flex flex-col">
            <header className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white font-display tracking-tight flex items-center gap-3">
                        <Boxes className="text-indigo-400 w-7 h-7" />
                        Tablero de Surtido B2B
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Sincronización en tiempo real con el E-Commerce Mayorista.</p>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Realtime Activo
                </div>
            </header>

            {/* KANBAN COLUMNS */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* COL 1: Pendientes */}
                <div className="flex flex-col bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-rose-900/30 bg-rose-500/5 flex justify-between items-center">
                        <h3 className="font-bold text-slate-200 flex items-center gap-2">
                            <Clock className="text-rose-400 w-5 h-5" />
                            Nuevos Pedidos
                        </h3>
                        <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 rounded-full">
                            {pedidosNuevos.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {pedidosNuevos.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <PackageSearch className="w-10 h-10 mb-2 opacity-50" />
                                <span className="text-sm">Sin pedidos pendientes</span>
                            </div>
                        )}
                        {pedidosNuevos.map(p => <OrderCard key={p.id} pedido={p} colorClass="text-rose-400" icon={Clock} />)}
                    </div>
                </div>

                {/* COL 2: Picking */}
                <div className="flex flex-col bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-amber-900/30 bg-amber-500/5 flex justify-between items-center">
                        <h3 className="font-bold text-slate-200 flex items-center gap-2">
                            <Boxes className="text-amber-400 w-5 h-5" />
                            Cargando Camioneta
                        </h3>
                        <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                            {pedidosEnSurtido.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {pedidosEnSurtido.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <span className="text-sm">Ningún montacarguista activo</span>
                            </div>
                        )}
                        {pedidosEnSurtido.map(p => <OrderCard key={p.id} pedido={p} colorClass="text-amber-400" icon={Boxes} />)}
                    </div>
                </div>

                {/* COL 3: Listos */}
                <div className="flex flex-col bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-emerald-900/30 bg-emerald-500/5 flex justify-between items-center">
                        <h3 className="font-bold text-slate-200 flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-400 w-5 h-5" />
                            Listos para Ruta
                        </h3>
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                            {pedidosListos.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {pedidosListos.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <span className="text-sm">Muelle de carga vacío</span>
                            </div>
                        )}
                        {pedidosListos.map(p => <OrderCard key={p.id} pedido={p} colorClass="text-emerald-400" icon={CheckCircle2} />)}
                    </div>
                </div>

            </div>

            <OrderDetailsModal />

        </div>
    )
}
