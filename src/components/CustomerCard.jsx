import { Phone, MessageCircle, DollarSign, History, CreditCard, Wallet } from 'lucide-react'

export default function CustomerCard({ customer, onRegisterPayment, onViewHistory }) {
    const saldoPendiente = Number(customer.saldo_pendiente || 0)
    const limiteCredito = Number(customer.limite_credito || 0)
    const isOverLimit = limiteCredito > 0 && saldoPendiente >= limiteCredito
    const hasDebt = saldoPendiente > 0

    const sendWhatsApp = () => {
        if (!customer.telefono) return alert('Cliente sin teléfono registrado')

        const message = `Hola ${customer.nombre}, te saludo de Ferretería La Ciénega. Tu saldo actual es de $${saldoPendiente.toFixed(2)}. Te adjunto el detalle de tus compras pendientes.`
        const url = `https://api.whatsapp.com/send?phone=52${customer.telefono}&text=${encodeURIComponent(message)}`

        window.open(url, '_blank')
    }

    return (
        <div className={`bg-white rounded-2xl p-6 shadow-sm border transition-all hover:shadow-md ${isOverLimit ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg leading-tight">{customer.nombre}</h3>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                        <Phone size={14} />
                        <span>{customer.telefono || 'Sin teléfono'}</span>
                    </div>
                </div>
                {hasDebt && (
                    <button
                        onClick={sendWhatsApp}
                        className="bg-green-100 text-green-600 p-2 rounded-full hover:bg-green-200 transition-colors tooltip"
                        title="Enviar Estado de Cuenta"
                    >
                        <MessageCircle size={20} />
                    </button>
                )}
            </div>

            <div className="mb-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Saldo Pendiente</p>
                <div className={`text-3xl font-bold ${hasDebt ? 'text-red-600' : 'text-gray-400'}`}>
                    ${saldoPendiente.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1 flex justify-between">
                    <span>Límite: ${limiteCredito.toFixed(2)}</span>
                    {isOverLimit && <span className="text-red-500 font-bold flex items-center gap-1">Excedido</span>}
                </div>
            </div>

            {/* Monedero Electrónico */}
            {Number(customer.saldo_monedero || 0) > 0 && (
                <div className="mb-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3">
                    <div className="bg-yellow-400 text-white p-2 rounded-lg"><Wallet size={18} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600">Monedero</p>
                        <p className="text-xl font-black text-yellow-700">${Number(customer.saldo_monedero).toFixed(2)}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => onRegisterPayment(customer)}
                    className="flex justify-center items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-xl font-bold text-sm hover:bg-blue-700 transition active:scale-95"
                >
                    <DollarSign size={16} />
                    Abonar
                </button>
                <button
                    onClick={() => onViewHistory(customer)}
                    className="flex justify-center items-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-bold text-sm hover:bg-gray-200 transition active:scale-95"
                >
                    <History size={16} />
                    Historial
                </button>
            </div>
        </div>
    )
}
