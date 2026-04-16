import React, { useEffect, useState } from 'react'
import { Users, Search, Loader2, Building2, CreditCard, Receipt, Building, Briefcase } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import AddB2BClientModal from '../../components/admin-bodega/AddB2BClientModal'

export default function B2BClientPortfolio() {
    const { user } = useAuth()
    const [clientes, setClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false)
    const [selectedClient, setSelectedClient] = useState(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentBank, setPaymentBank] = useState('BBVA')
    const [paymentRef, setPaymentRef] = useState('')

    const [isAddClientModalOpen, setAddClientModalOpen] = useState(false)

    useEffect(() => {
        const fetchPortfolio = async () => {
            setLoading(true)
            try {
                // Traemos todos los clientes que tienen límite de crédito o son mayoristas implícitos
                const { data, error } = await supabase
                    .from('clientes')
                    .select('*')
                    .eq('rol', 'MAYORISTA')
                    .order('nombre_empresa', { ascending: true })

                if (error) throw error

                if (data) setClientes(data)
            } catch (err) {
                console.error('Error fetching B2B portfolio', err)
                toast.error('Error al cargar la cartera de clientes')
            } finally {
                setLoading(false)
            }
        }

        fetchPortfolio()
    }, [])

    const openPayment = (client) => {
        setSelectedClient(client)
        setPaymentAmount('')
        setPaymentRef('')
        setPaymentBank('BBVA')
        setPaymentModalOpen(true)
    }

    const handlePayment = async (e) => {
        e.preventDefault()
        if (!selectedClient || !paymentAmount || !paymentRef) return

        const amountNum = Number(paymentAmount)
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Monto inválido.')
            return
        }

        try {
            toast.loading('Validando transferencia...', { id: 'spei' })

            // Lógica financiera: Reducir Deuda
            const currentDebt = selectedClient.saldo_deudor || 0
            const newDebt = currentDebt - amountNum

            // 1. Aplicar en Supabase a Clientes
            const { error: clientError } = await supabase
                .from('clientes')
                .update({ saldo_deudor: newDebt < 0 ? 0 : newDebt }) // Evitar deudas negativas en mock simple
                .eq('id', selectedClient.id)

            if (clientError) throw clientError

            // 2. Insertar trace en logs (Abonos)
            // Esto es crucial para un CRM, simulamos la tabla 'historial_pagos'
            try {
                await supabase.from('historial_pagos').insert([{
                    cliente_id: selectedClient.id,
                    usuario_id: user.id, // Empleado que validó
                    monto: amountNum,
                    forma_pago: 'TRANSFERENCIA',
                    banco_origen: paymentBank,
                    referencia_spei: paymentRef,
                    notas: `Abono B2B a Cartera`
                }])
            } catch (e) { console.warn("Tabla historial_pagos no detectada, omitiendo auditoría") }

            // Update local state
            setClientes(prev => prev.map(c =>
                c.id === selectedClient.id ? { ...c, saldo_deudor: newDebt < 0 ? 0 : newDebt } : c
            ))

            toast.success(`Abono aplicado exitosamente a: ${selectedClient.nombre_empresa || selectedClient.nombre}`, { id: 'spei' })
            setPaymentModalOpen(false)

        } catch (error) {
            console.error(error)
            toast.error('No se pudo consolidar el pago en el sistema.', { id: 'spei' })
        }
    }

    const filtered = clientes.filter(c =>
        (c.nombre_empresa && c.nombre_empresa.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.nombre && c.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.rfc && c.rfc.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="h-full flex flex-col space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white font-display tracking-tight flex items-center gap-3">
                        <Briefcase className="text-indigo-400 w-7 h-7" />
                        Cartera de Mayoristas (CRM)
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Gestión de Créditos Corporativos y Consolidación de SPEIs.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar Empresa o RFC..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <button
                        onClick={() => setAddClientModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all whitespace-nowrap"
                    >
                        ✚ Nueva Constructora
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                        <span className="text-slate-500">Analizando expedientes de crédito...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500">
                        <Building2 className="w-16 h-16 text-slate-800 mb-4" />
                        No se encontraron constructoras en la cartera.
                    </div>
                ) : filtered.map(client => {
                    const limite = client.limite_credito || 0
                    const deuda = client.saldo_deudor || 0
                    const disponible = limite - deuda

                    // Lógica para color de estado de cuenta
                    const ratio = deuda / (limite || 1)
                    let statusClass = "text-emerald-400"
                    if (ratio > 0.8) statusClass = "text-rose-400"
                    else if (ratio > 0.5) statusClass = "text-amber-400"

                    return (
                        <div key={client.id} className="bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors rounded-2xl p-5 flex flex-col shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white line-clamp-1">
                                        {client.nombre_empresa || client.nombre}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                                        <Building size={12} /> RFC: {client.rfc || 'Genérico'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mt-auto border-t border-slate-800 pt-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Límite Aprobado</span>
                                    <span className="text-sm font-bold text-slate-300">${Number(limite).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo Vencido</span>
                                    <span className={`text-base font-bold ${deuda > 0 ? statusClass : 'text-slate-500'}`}>
                                        ${Number(deuda).toLocaleString()}
                                    </span>
                                </div>

                                {/* Progress Bar Mini */}
                                {limite > 0 && (
                                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden">
                                        <div className={`h-1.5 rounded-full ${ratio > 0.8 ? 'bg-rose-500' : ratio > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }}></div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 flex gap-2">
                                <button
                                    onClick={() => openPayment(client)}
                                    className="flex-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors"
                                >
                                    <Receipt size={16} /> Aplicar Abono
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Modal de SPEI */}
            {isPaymentModalOpen && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CreditCard className="text-indigo-400 w-6 h-6" /> Consolidación SPEI
                            </h3>
                            <button onClick={() => setPaymentModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
                        </div>

                        <div className="mb-6 p-4 bg-slate-950 rounded-lg border border-slate-800">
                            <p className="text-xs text-indigo-400 font-bold mb-1">CUENTA CORRIENTE</p>
                            <p className="text-slate-200 text-sm font-bold">{selectedClient.nombre_empresa || selectedClient.nombre}</p>
                            <div className="mt-3 flex justify-between items-center text-sm">
                                <span className="text-slate-500">Deuda Vigente:</span>
                                <span className="font-bold text-rose-400 text-lg">${Number(selectedClient.saldo_deudor || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <form onSubmit={handlePayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Monto de la Transferencia</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-bold">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        min="0.1"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-white text-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Banco Origen</label>
                                    <select
                                        required
                                        value={paymentBank}
                                        onChange={(e) => setPaymentBank(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="BBVA">BBVA</option>
                                        <option value="Santander">Santander</option>
                                        <option value="Banorte">Banorte</option>
                                        <option value="Citibanamex">Citibanamex</option>
                                        <option value="HSBC">HSBC</option>
                                        <option value="Otro">Otro SPEI</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Referencia / Folio</label>
                                    <input
                                        type="text"
                                        required
                                        value={paymentRef}
                                        onChange={(e) => setPaymentRef(e.target.value)}
                                        placeholder="Ej. T-99120"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setPaymentModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">Registrar Pago</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Alta de Mayorista */}
            <AddB2BClientModal
                isOpen={isAddClientModalOpen}
                onClose={() => setAddClientModalOpen(false)}
                onClientAdded={(newClient) => setClientes(prev => [...prev, newClient].sort((a, b) => (a.nombre_empresa || '').localeCompare(b.nombre_empresa || '')))}
            />
        </div>
    )
}
