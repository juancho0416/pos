import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, UserPlus, Users, X, DollarSign, Calendar, Filter, Lock, Download } from 'lucide-react'
import CustomerCard from '../components/CustomerCard'
import { useAuth } from '../context/AuthContext'
import { ReportExports } from '../services/ReportExports'
import { powersync } from '../powersync/db'
import { toast } from 'sonner'

export default function Customers() {
    const { profile, branches, selectedBranch, changeBranch } = useAuth()
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modals State
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [customerHistory, setCustomerHistory] = useState([])

    // New Customer State
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
    const [newCustomer, setNewCustomer] = useState({ nombre: '', telefono: '', limite_credito: 5000 })

    const fetchCustomers = async () => {
        if (!selectedBranch) {
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('sucursal_id', selectedBranch)
                .or('rol.neq.MAYORISTA,rol.is.null')
                .order('nombre')

            if (error) console.error(error)
            else setCustomers(data || [])
        } catch (err) {
            console.error('Error fetching customers:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCustomers()
    }, [selectedBranch])


    // --- Actions ---

    const handleRegistrarAbono = async (e) => {
        e.preventDefault()
        if (!selectedCustomer || !paymentAmount) return

        const amount = parseFloat(paymentAmount)
        if (isNaN(amount) || amount <= 0) { toast.error('Monto inválido'); return }

        const { error } = await supabase.rpc('registrar_abono', {
            p_cliente_id: selectedCustomer.id,
            p_monto: amount
        })

        if (error) {
            toast.error('Error al registrar abono: ' + error.message)
            return
        }

        toast.success('Abono registrado correctamente')
        setShowPaymentModal(false)
        setPaymentAmount('')
        fetchCustomers()
    }

    const fetchCustomerHistory = async (clienteId) => {
        const { data, error } = await supabase
            .from('ventas')
            .select('*, venta_detalles(*, productos(nombre))')
            .eq('cliente_id', clienteId)
            .in('metodo_pago', ['credito', 'abono'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
        } else {
            setCustomerHistory(data || []);
        }
    };

    const handleViewHistory = async (customer) => {
        setSelectedCustomer(customer);
        setShowHistoryModal(true);
        setCustomerHistory([]); // clear prev

        await fetchCustomerHistory(customer.id);
    }

    const handleCreateCustomer = async (e) => {
        e.preventDefault()

        const newClientData = {
            nombre: newCustomer.nombre,
            telefono: newCustomer.telefono || null,
            limite_credito: newCustomer.limite_credito,
            saldo_pendiente: 0,
            saldo_monedero: 0,
            sucursal_id: selectedBranch
        }

        if (!navigator.onLine) {
            // Guardar en PowerSync SQLite local (offline-first)
            const localId = crypto.randomUUID()
            const offlineClient = { id: localId, ...newClientData }

            try {
                await powersync.execute(
                    `INSERT INTO clientes (id, nombre, telefono, limite_credito, saldo_pendiente, saldo_monedero, sucursal_id, created_at) 
                     VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
                    [localId, newClientData.nombre, newClientData.telefono || null, newClientData.limite_credito, selectedBranch, new Date().toISOString()]
                )

                toast.success('Cliente creado (Modo Offline)', { description: 'Sincronizará al volver la red.' })
                setShowNewCustomerModal(false)
                setNewCustomer({ nombre: '', telefono: '', limite_credito: 5000 })
                setCustomers(prev => [...prev, offlineClient].sort((a, b) => a.nombre.localeCompare(b.nombre)))
            } catch (err) {
                console.error('Error guardando cliente offline:', err)
                toast.error('Error al guardar cliente localmente')
            }
            return
        }

        // FLUJO ONLINE SUPABASE
        const { data, error } = await supabase.from('clientes').insert([newClientData]).select().single()

        if (error) {
            toast.error('Error al crear cliente: ' + error.message)
        } else {
            toast.success('Cliente creado exitosamente')
            setShowNewCustomerModal(false)
            setNewCustomer({ nombre: '', telefono: '', limite_credito: 5000 })
            fetchCustomers()
        }
    }

    // --- Filters ---
    const filteredCustomers = customers.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.telefono && c.telefono.includes(searchTerm))
    )

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-blue-600" />
                        Cartera de Clientes
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gestiona deudas, abonos y estados de cuenta</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Branch Selector */}
                    <div className="relative">
                        {profile?.rol === 'vendedor' ? (
                            <div className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium cursor-not-allowed text-sm">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                                {branches.find(b => b.id == selectedBranch)?.nombre || 'Mi Sucursal'}
                            </div>
                        ) : (
                            <>
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                                <select
                                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-blue-100 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer hover:border-blue-300 transition"
                                    value={selectedBranch}
                                    onChange={(e) => changeBranch(e.target.value)}
                                >
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                </select>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => ReportExports.exportCustomersExcel(filteredCustomers, branches.find(b => b.id == selectedBranch)?.nombre || 'General')}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm shadow-green-200"
                    >
                        <Download size={20} /> Excel
                    </button>

                    <button
                        onClick={() => setShowNewCustomerModal(true)}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95 whitespace-nowrap"
                    >
                        <UserPlus size={20} />
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cliente por nombre o teléfono..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center p-10 text-gray-400">Cargando clientes...</div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center p-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                    No se encontraron clientes.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCustomers.map(customer => (
                        <CustomerCard
                            key={customer.id}
                            customer={customer}
                            onRegisterPayment={(c) => {
                                setSelectedCustomer(c);
                                setShowPaymentModal(true);
                            }}
                            onViewHistory={handleViewHistory}
                        />
                    ))}
                </div>
            )}

            {/* --- Modals --- */}

            {/* 1. Payment Modal */}
            {showPaymentModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-blue-600 text-white">
                            <h3 className="font-bold text-lg">Registrar Abono</h3>
                            <p className="opacity-80 text-sm">Cliente: {selectedCustomer.nombre}</p>
                        </div>
                        <form onSubmit={handleRegistrarAbono} className="p-6">
                            <div className="mb-4 text-center">
                                <p className="text-gray-500 text-sm mb-1">Deuda Actual</p>
                                <p className="text-3xl font-bold text-red-600">${selectedCustomer.saldo_pendiente?.toFixed(2)}</p>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Monto a Abonar</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                                        placeholder="0.00"
                                        autoFocus
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200">Cancelar</button>
                                <button type="button" onClick={handleRegistrarAbono} className="flex-1 py-3 text-white font-bold bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">Confirmar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. New Customer Modal */}
            {showNewCustomerModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h3 className="font-bold text-xl text-gray-800">Nuevo Cliente</h3>
                            <button onClick={() => setShowNewCustomerModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newCustomer.nombre} onChange={e => setNewCustomer({ ...newCustomer, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                                <input type="text" placeholder="10 dígitos" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newCustomer.telefono} onChange={e => setNewCustomer({ ...newCustomer, telefono: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Límite de Crédito</label>
                                <input required type="number" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newCustomer.limite_credito} onChange={e => setNewCustomer({ ...newCustomer, limite_credito: e.target.value })} />
                            </div>
                            <button type="submit" className="w-full py-3 mt-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Guardar Cliente</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. History Modal */}
            {showHistoryModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-xl text-gray-800">Historial de Crédito</h3>
                                <p className="text-sm text-gray-500">{selectedCustomer.nombre}</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {customerHistory.length === 0 ? (
                                <p className="text-center text-gray-400 italic">No hay historial reciente de compras a crédito.</p>
                            ) : (
                                <div className="space-y-4">
                                    {customerHistory.map(sale => (
                                        <div key={sale.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Calendar size={16} />
                                                    <span className="text-sm font-medium">{new Date(sale.created_at).toLocaleString()}</span>
                                                </div>
                                                {sale.metodo_pago === 'abono' ? (
                                                    <span className="font-bold text-green-600 text-lg">ABONO RECIBIDO: +${sale.total.toFixed(2)}</span>
                                                ) : (
                                                    <span className="font-bold text-red-600 text-lg">-${sale.total.toFixed(2)}</span>
                                                )}
                                            </div>
                                            {sale.metodo_pago !== 'abono' && (
                                                <div className="pl-4 border-l-2 border-gray-100 space-y-1">
                                                    {sale.venta_detalles?.map((item, idx) => (
                                                        <div key={idx} className="text-sm text-gray-600 flex justify-between">
                                                            <span>{item.cantidad}x {item.productos?.nombre || 'Producto'}</span>
                                                            <span className="text-gray-400">${item.precio_unitario}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
