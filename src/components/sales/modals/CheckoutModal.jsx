import { CreditCard, RotateCcw, User, Store, Truck, MapPin, Phone, Wallet, QrCode, X } from 'lucide-react'
import { useCheckoutStore } from '../../../stores/useCheckoutStore'
import { powersync } from '../../../powersync/db'
import { useState } from 'react'

export default function CheckoutModal({
    showCheckoutModal,
    setShowCheckoutModal,
    calculateTotal,
    customers,
    handleConfirmSale,
    processing,
}) {
    const {
        paymentMethod, setPaymentMethod,
        selectedCustomerForSale, setSelectedCustomerForSale,
        tipoEntrega, setTipoEntrega,
        direccionEntrega, setDireccionEntrega,
        telefonoEntrega, setTelefonoEntrega,
        nombreReceptor, setNombreReceptor,
        pagoEnvio, setPagoEnvio,
        // ─── Monedero State (REACTIVO) ───
        usarMonedero, setUsarMonedero,
        montoMonederoUsado, setMontoMonederoUsado,
        montoRecibido, setMontoRecibido,
        cambioCalculado, setCambioCalculado,
        cuponAplicado, setCuponAplicado,
    } = useCheckoutStore()

    const [cuponInput, setCuponInput] = useState('')
    const [cuponError, setCuponError] = useState('')
    const [cuponLoading, setCuponLoading] = useState(false)

    if (!showCheckoutModal) return null

    const totalBruto = calculateTotal();
    const descuentoMonedero = usarMonedero ? montoMonederoUsado : 0
    const descuentoCupon = cuponAplicado ? Math.min(parseFloat(cuponAplicado.monto_disponible || 0), totalBruto) : 0
    const netTotal = Math.max(0, totalBruto - descuentoMonedero - descuentoCupon);

    // Buscar el cliente seleccionado para mostrar su saldo
    const clienteSeleccionado = selectedCustomerForSale
        ? customers.find(c => c.id == selectedCustomerForSale)
        : null;
    const saldoMonedero = Number(clienteSeleccionado?.saldo_monedero || 0);

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[999999] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-[95%] max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ring-4 ring-black/5">

                {/* ═══ HEADER ═══ */}
                <div className="p-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Finalizar Venta</h2>
                        <p className="opacity-80 font-medium text-sm mt-1">Total: ${netTotal.toFixed(2)}</p>
                        {usarMonedero && montoMonederoUsado > 0 && (
                            <p className="text-yellow-300 font-bold text-xs mt-0.5">💰 Monedero: -${montoMonederoUsado.toFixed(2)}</p>
                        )}
                        {cuponAplicado && descuentoCupon > 0 && (
                            <p className="text-fuchsia-300 font-bold text-xs mt-0.5">🎫 Cupón {cuponAplicado.codigo}: -${descuentoCupon.toFixed(2)}</p>
                        )}
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm relative z-10 shadow-lg border border-white/10"><CreditCard size={28} /></div>
                </div>

                {/* ═══ BODY ═══ */}
                <div className="p-8 space-y-6">

                    {/* Método de Pago */}
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Método de Pago</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setPaymentMethod('contado')}
                                className={`py-5 rounded-2xl border-2 font-black uppercase tracking-wide transition-all active:scale-95 ${paymentMethod === 'contado' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg transform scale-[1.02]' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                            >
                                Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentMethod('credito')}
                                className={`py-5 rounded-2xl border-2 font-black uppercase tracking-wide transition-all active:scale-95 ${paymentMethod === 'credito' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-lg transform scale-[1.02]' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                            >
                                Crédito
                            </button>
                        </div>
                    </div>

                    {/* ═══ Selección de Cliente ═══ */}
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Cliente asociado a la venta</label>
                        <div className="relative">
                            <select
                                className="w-full p-4 pl-5 border-2 border-purple-100 bg-purple-50/50 rounded-2xl font-bold text-slate-700 outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer hover:bg-purple-100/50"
                                value={selectedCustomerForSale}
                                onChange={(e) => setSelectedCustomerForSale(e.target.value)}
                            >
                                <option value="">Público General (Sin recompensas)</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}
                                        {c.saldo_monedero > 0 ? ` 💰$${Number(c.saldo_monedero).toFixed(0)}` : ''}
                                        {c.saldo_pendiente > 0 ? ` ⚠️ Deuda: $${c.saldo_pendiente}` : ''}
                                    </option>
                                ))}
                            </select>
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300 pointer-events-none" size={20} />
                        </div>

                        {/* ─── Alerta de deuda ─── */}
                        {clienteSeleccionado && Number(clienteSeleccionado.saldo_pendiente || 0) > 0 && (
                            <div className="mt-3 flex items-start gap-3 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 animate-in fade-in duration-200">
                                <span className="text-2xl shrink-0">⚠️</span>
                                <div>
                                    <p className="font-black text-red-700 text-sm">Este cliente tiene deuda pendiente</p>
                                    <p className="text-red-600 font-bold text-xs mt-0.5">
                                        Saldo por cobrar: <span className="text-lg font-black">${Number(clienteSeleccionado.saldo_pendiente).toFixed(2)}</span>
                                    </p>
                                    <p className="text-red-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Considera cobrar antes de continuar</p>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* ═══ Monedero Electrónico Card (Solo Efectivo) ═══ */}
                    {paymentMethod === 'contado' && selectedCustomerForSale && saldoMonedero > 0 && (
                        <div className={`relative overflow-hidden transition-all duration-300 rounded-3xl border-2 p-5 ${usarMonedero ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/30' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className={`text-xs font-black uppercase tracking-widest ${usarMonedero ? 'text-yellow-100' : 'text-slate-400'}`}>
                                        <Wallet size={14} className="inline mr-1" />Monedero Disponible
                                    </p>
                                    <p className="text-3xl font-black mt-1">${saldoMonedero.toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const nuevoUsar = !usarMonedero;
                                        setUsarMonedero(nuevoUsar);
                                        if (nuevoUsar) {
                                            const totalVenta = calculateTotal();
                                            const maxUsable = Math.min(saldoMonedero, totalVenta);
                                            setMontoMonederoUsado(maxUsable);
                                        } else {
                                            setMontoMonederoUsado(0);
                                        }
                                    }}
                                    className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors shadow-inner ${usarMonedero ? 'bg-white' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-7 w-7 transform rounded-full transition-transform shadow ${usarMonedero ? 'translate-x-8 bg-yellow-500' : 'translate-x-1 bg-white'}`} />
                                </button>
                            </div>
                            {usarMonedero && (
                                <div className="mt-3 text-sm font-bold bg-white/20 p-3 rounded-xl text-center">
                                    ✅ Usando ${montoMonederoUsado.toFixed(2)} de tu monedero
                                    {montoMonederoUsado >= totalBruto && (
                                        <p className="text-[11px] mt-1 opacity-80">🎉 ¡El monedero cubre el 100% de esta compra!</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}


                    {/* ═══ Cupón de Devolución QR ═══ */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Canjear Cupón de Devolución</label>
                        {cuponAplicado ? (
                            <div className="flex items-center justify-between bg-fuchsia-50 border-2 border-fuchsia-300 rounded-2xl px-4 py-3">
                                <div>
                                    <p className="font-mono font-black text-fuchsia-800 text-sm">{cuponAplicado.codigo}</p>
                                    <p className="text-xs font-bold text-fuchsia-600">-${descuentoCupon.toFixed(2)} aplicado</p>
                                </div>
                                <button onClick={() => { setCuponAplicado(null); setCuponInput(''); setCuponError(''); }}
                                    className="p-2 rounded-xl bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <QrCode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={cuponInput}
                                        onChange={e => { setCuponInput(e.target.value.toUpperCase()); setCuponError('') }}
                                        placeholder="DEV-XXXX-XXXX"
                                        className="w-full pl-9 pr-3 py-3 border-2 border-slate-200 rounded-2xl font-mono font-bold text-slate-800 text-sm focus:outline-none focus:border-fuchsia-500 bg-slate-50"
                                    />
                                </div>
                                <button
                                    disabled={cuponLoading || !cuponInput.trim()}
                                    onClick={async () => {
                                        setCuponLoading(true); setCuponError('')
                                        try {
                                            const res = await powersync.execute(
                                                `SELECT id, codigo, monto_disponible FROM cupones WHERE codigo = ? AND estado = 'ACTIVO' LIMIT 1`,
                                                [cuponInput.trim().toUpperCase()]
                                            )
                                            const found = res.rows?._array?.[0]
                                            if (!found) { setCuponError('Cupón no encontrado o ya fue canjeado.'); return }
                                            if (parseFloat(found.monto_disponible) <= 0) { setCuponError('Este cupón no tiene saldo.'); return }
                                            setCuponAplicado(found)
                                        } catch (e) { setCuponError('Error al verificar el cupón.') }
                                        finally { setCuponLoading(false) }
                                    }}
                                    className="px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black rounded-2xl disabled:opacity-40 transition-all text-sm">
                                    Aplicar
                                </button>
                            </div>
                        )}
                        {cuponError && <p className="text-xs font-bold text-red-500 px-1">{cuponError}</p>}
                    </div>

                    {/* ═══ Calculadora de Efectivo Táctil ═══ */}
                    {paymentMethod === 'contado' && !(tipoEntrega === 'DOMICILIO' && pagoEnvio === 'contra_entrega') && netTotal > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-inner">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block text-center">Monto Recibido</label>

                            {/* Input Gigante */}
                            <div className="relative flex justify-center">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-black text-blue-300">$</span>
                                <input
                                    type="number"
                                    min={netTotal}
                                    step="0.01"
                                    className="w-full text-center text-4xl sm:text-5xl font-black text-blue-700 bg-white border-2 border-blue-200 rounded-2xl py-4 sm:py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all placeholder:text-blue-100"
                                    placeholder="0.00"
                                    value={montoRecibido || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setMontoRecibido(val);
                                        setCambioCalculado(val - netTotal);
                                    }}
                                />
                            </div>

                            {/* Botones de Billetes Rápidos (Acumulables) */}
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={() => {
                                        setMontoRecibido(netTotal);
                                        setCambioCalculado(0);
                                    }}
                                    className="col-span-2 py-3 bg-blue-50 border-2 border-blue-200 text-blue-700 font-black rounded-xl hover:bg-blue-100 hover:border-blue-300 active:scale-95 transition-all text-sm"
                                >
                                    ✓ EXACTO
                                </button>
                                <button
                                    onClick={() => {
                                        setMontoRecibido(0);
                                        setCambioCalculado(-netTotal);
                                    }}
                                    className="col-span-2 py-3 bg-red-50 border-2 border-red-200 text-red-600 font-black rounded-xl hover:bg-red-100 hover:border-red-300 active:scale-95 transition-all text-sm flex justify-center items-center gap-1"
                                >
                                    <RotateCcw size={16} /> LIMPIAR
                                </button>
                                
                                {[20, 50, 100, 200, 500, 1000].map((monto) => (
                                    <button
                                        key={`bill-${monto}`}
                                        onClick={() => {
                                            const current = Number(montoRecibido) || 0;
                                            const newVal = current + monto;
                                            setMontoRecibido(newVal);
                                            setCambioCalculado(newVal - netTotal);
                                        }}
                                        className="py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-700 shadow-sm hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all flex flex-col items-center justify-center leading-none"
                                    >
                                        <span className="text-[10px] text-slate-400 font-bold mb-0.5">+</span>
                                        ${monto}
                                    </button>
                                ))}
                            </div>
                            {/* Pantalla de Cambio */}
                            {montoRecibido > 0 && (
                                <div className={`mt-4 p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-colors ${montoRecibido >= netTotal ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${montoRecibido >= netTotal ? 'text-green-600' : 'text-red-500'}`}>
                                        {montoRecibido >= netTotal ? 'Cambio a Entregar' : 'Falta Dinero'}
                                    </span>
                                    <span className={`text-3xl font-black tracking-tighter ${montoRecibido >= netTotal ? 'text-green-600' : 'text-red-600'}`}>
                                        ${Math.abs(cambioCalculado).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Si netTotal es 0 (100% cubierto por monedero), mostrar aviso */}
                    {paymentMethod === 'contado' && netTotal === 0 && usarMonedero && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 text-center animate-in fade-in duration-300">
                            <p className="text-2xl mb-1">🎉</p>
                            <p className="text-green-700 font-black text-sm">¡Compra 100% cubierta con Monedero!</p>
                            <p className="text-green-600 text-xs mt-1">No se requiere efectivo.</p>
                        </div>
                    )}

                    {/* ═══ Tipo de Entrega ═══ */}
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Tipo de Entrega</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setTipoEntrega('MOSTRADOR')}
                                className={`py-4 rounded-2xl border-2 font-bold transition-all active:scale-95 flex flex-col items-center gap-1.5 ${tipoEntrega === 'MOSTRADOR'
                                    ? 'border-green-500 bg-green-50 text-green-700 shadow-lg scale-[1.02]'
                                    : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                            >
                                <Store size={22} />
                                <span className="text-xs uppercase tracking-wider">Mostrador</span>
                            </button>
                            <button
                                onClick={() => setTipoEntrega('DOMICILIO')}
                                className={`py-4 rounded-2xl border-2 font-bold transition-all active:scale-95 flex flex-col items-center gap-1.5 ${tipoEntrega === 'DOMICILIO'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-lg scale-[1.02]'
                                    : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                            >
                                <Truck size={22} />
                                <span className="text-xs uppercase tracking-wider">Domicilio</span>
                            </button>
                        </div>
                    </div>

                    {/* Campos condicionales (solo Domicilio) */}
                    {tipoEntrega === 'DOMICILIO' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <MapPin size={14} /> Dirección de Entrega *
                                </label>
                                <textarea
                                    className="w-full p-4 border-2 border-orange-100 bg-orange-50/30 rounded-2xl font-medium text-slate-700 outline-none focus:border-orange-500 transition-all resize-none"
                                    rows={2}
                                    placeholder="Calle, número, colonia, referencias..."
                                    value={direccionEntrega}
                                    onChange={e => setDireccionEntrega(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Phone size={14} /> Teléfono de Contacto *
                                </label>
                                <input
                                    type="tel"
                                    className="w-full p-4 border-2 border-orange-100 bg-orange-50/30 rounded-2xl font-medium text-slate-700 outline-none focus:border-orange-500 transition-all"
                                    placeholder="10 dígitos"
                                    value={telefonoEntrega}
                                    onChange={e => setTelefonoEntrega(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <User size={14} /> Nombre de quien recibe *
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 border-2 border-orange-100 bg-orange-50/30 rounded-2xl font-medium text-slate-700 outline-none focus:border-orange-500 transition-all"
                                    placeholder="Ej. Juan Pérez"
                                    value={nombreReceptor}
                                    onChange={e => setNombreReceptor(e.target.value)}
                                />
                            </div>

                            {/* Tipo de Pago del Envío */}
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Tipo de Pago del Envío</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setPagoEnvio('pagado')}
                                        className={`py-4 rounded-2xl border-2 font-bold transition-all active:scale-95 flex flex-col items-center gap-1.5 ${pagoEnvio === 'pagado'
                                            ? 'border-green-500 bg-green-50 text-green-700 shadow-lg scale-[1.02]'
                                            : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <span className="text-xs uppercase tracking-wider">Pagado en Caja</span>
                                    </button>
                                    <button
                                        onClick={() => setPagoEnvio('contra_entrega')}
                                        className={`py-4 rounded-2xl border-2 font-bold transition-all active:scale-95 flex flex-col items-center gap-1.5 ${pagoEnvio === 'contra_entrega'
                                            ? 'border-red-500 bg-red-50 text-red-700 shadow-lg scale-[1.02]'
                                            : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <span className="text-xs uppercase tracking-wider">Contra Entrega</span>
                                    </button>
                                </div>
                            </div>

                            {/* Info box */}
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 text-center">
                                <p className="text-xs font-bold text-amber-800">
                                    🚚 Este pedido aparecerá en el Panel de Entregas para ser asignado a un chofer
                                </p>
                                {pagoEnvio === 'contra_entrega' ? (
                                    <p className="text-[10px] text-amber-600 mt-1">
                                        🔴 ATENCIÓN: El chofer deberá cobrar ${netTotal.toFixed(2)} al entregar.
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-green-600 mt-1">
                                        🟢 Ya pagado. El chofer solo entregará la mercancía.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                </div>
                {/* ═══ END BODY ═══ */}

                {/* ═══ FOOTER ═══ */}
                <div className="p-8 bg-slate-50 flex gap-4 border-t border-slate-100">
                    <button onClick={() => setShowCheckoutModal(false)} className="flex-1 py-4 font-bold text-slate-400 bg-white rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button
                        onClick={handleConfirmSale}
                        disabled={
                            processing ||
                            (tipoEntrega === 'DOMICILIO' && (!direccionEntrega.trim() || !telefonoEntrega.trim() || !nombreReceptor.trim())) ||
                            (paymentMethod === 'contado' && !(tipoEntrega === 'DOMICILIO' && pagoEnvio === 'contra_entrega') && netTotal > 0 && montoRecibido < netTotal)
                        }
                        className="flex-[2] py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-green-500/30 active:scale-95 transition-all flex justify-center items-center gap-2 hover:from-green-400 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? <RotateCcw className="animate-spin" /> : 'CONFIRMAR'}
                    </button>
                </div>

            </div>
        </div>
    )
}
