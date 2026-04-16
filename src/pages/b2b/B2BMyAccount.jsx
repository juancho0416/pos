import React, { useEffect, useState } from 'react'
import { useMayoristaStore } from '../../stores/useMayoristaStore'
import { supabase } from '../../supabaseClient'
import { ShoppingBag, CreditCard, DollarSign, Loader2, PackageSearch, Clock, Boxes, Truck, CheckCircle2 } from 'lucide-react'

export default function B2BMyAccount() {
    const userB2B = useMayoristaStore(state => state.userB2B)

    const [finances, setFinances] = useState({ limite_credito: 0, saldo_deudor: 0 })
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    // Translate logic states to customer friendly states
    const getOrderStatusInfo = (status) => {
        switch (status) {
            case 'PENDIENTE':
                return { text: 'Recibido, en revisión', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock }
            case 'EN_SURTIDO':
                return { text: 'Preparando tu carga', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Boxes }
            case 'LISTO_PARA_RUTA':
                return { text: 'Listo en andén / En ruta', color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: Truck }
            case 'ENTREGADO':
            case 'LISTO':
                return { text: 'Completado', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 }
            case 'CANCELADO':
                return { text: 'Cancelado', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: PackageSearch }
            default:
                return { text: 'Procesando', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: PackageSearch }
        }
    }

    useEffect(() => {
        if (!userB2B) return

        const fetchAccountData = async () => {
            try {
                // 1. Fetch Realtime Financial Data
                const { data: clientData, error: clientError } = await supabase
                    .from('clientes')
                    .select('limite_credito, saldo_deudor')
                    .eq('id', userB2B.id)
                    .single()

                if (clientData) {
                    setFinances(clientData)
                }

                // 2. Fetch Order History (Recent 50)
                const { data: ordersData, error: ordersError } = await supabase
                    .from('ventas')
                    .select('*')
                    .eq('cliente_id', userB2B.id)
                    .order('created_at', { ascending: false })
                    .limit(50)

                if (ordersData) {
                    setOrders(ordersData)
                }

            } catch (err) {
                console.error('Error fetching account data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchAccountData()

        // 3. Set up Realtime Subscription for Orders
        const channel = supabase.channel(`public:ventas:cliente=${userB2B.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'ventas', filter: `cliente_id=eq.${userB2B.id}` },
                (payload) => {
                    setOrders(prev => prev.map(order => order.id === payload.new.id ? payload.new : order))
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'ventas', filter: `cliente_id=eq.${userB2B.id}` },
                (payload) => {
                    setOrders(prev => [payload.new, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userB2B])

    if (!userB2B) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-500">
                Inicia sesión para ver tu cuenta.
            </div>
        )
    }

    const availableCredit = (finances.limite_credito || 0) - (finances.saldo_deudor || 0)

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-indigo-500">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Mi Cuenta Corporativa</h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        {userB2B.nombre_empresa || userB2B.nombre}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">RFC: {userB2B.rfc}</p>
                </div>
            </div>

            {/* Financial Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="bg-slate-100 p-4 rounded-xl text-slate-600">
                        <CreditCard className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Límite Autorizado</p>
                        <p className="text-2xl font-bold text-slate-800">
                            ${Number(finances.limite_credito || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="bg-rose-50 p-4 rounded-xl text-rose-500">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-rose-500 uppercase tracking-wider mb-1">Saldo Deudor</p>
                        <p className="text-2xl font-bold text-rose-600">
                            ${Number(finances.saldo_deudor || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 shadow-lg shadow-indigo-600/20 text-white flex items-center gap-4">
                    <div className="bg-white/10 p-4 rounded-xl text-indigo-100">
                        <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-indigo-200 uppercase tracking-wider mb-1">Crédito Disponible</p>
                        <p className="text-3xl font-bold text-white tracking-tight">
                            ${Number(Math.max(0, availableCredit)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Order History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-indigo-500" />
                        Mis Pedidos Recientes
                    </h2>
                </div>

                {orders.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No has realizado ningún pedido todavía.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold border-b border-slate-100">Ticket</th>
                                    <th className="px-6 py-4 font-semibold border-b border-slate-100">Fecha</th>
                                    <th className="px-6 py-4 font-semibold border-b border-slate-100">Artículos</th>
                                    <th className="px-6 py-4 font-semibold border-b border-slate-100">Total</th>
                                    <th className="px-6 py-4 font-semibold border-b border-slate-100">Estatus Logístico</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {orders.map(order => {
                                    const statusInfo = getOrderStatusInfo(order.estado_entrega)
                                    const StatusIcon = statusInfo.icon

                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                TKT-{String(order.id).padStart(5, '0')}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(order.created_at).toLocaleDateString()} a las {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">
                                                {order.items?.length || 0} pzs
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-800">
                                                ${Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {statusInfo.text}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
