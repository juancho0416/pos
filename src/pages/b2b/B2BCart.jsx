import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, CreditCard, ShoppingBag, PackageSearch } from 'lucide-react'
import { useMayoristaStore } from '../../stores/useMayoristaStore'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'

export default function B2BCart() {
    const { cart, removeFromCart, updateQuantity, calculateTotal, clearCart, userB2B } = useMayoristaStore()
    const [processing, setProcessing] = useState(false)
    const navigate = useNavigate()

    const handleConfirmOrder = async () => {
        if (cart.length === 0) return

        setProcessing(true)
        toast.loading('Procesando pedido de mayoreo...', { id: 'b2bFlow' })

        try {
            const total = calculateTotal()

            // Requeriremos ID de sucursal Bodega Mayoreo (usando 2 o idealmente lookup previa)
            // Para mantener simpleza, lo enviamos asumiendo sucursal origen
            const { data: sucursalData } = await supabase
                .from('sucursales')
                .select('id')
                .ilike('nombre', '%Bodega Mayoreo%')
                .limit(1)
                .single()

            const branchId = sucursalData ? sucursalData.id : 2

            const payload = {
                // Información requerida por la tabla ventas
                sucursal_id: branchId,
                total: total,
                vendedor_id: null, // Venta automática
                usuario_id: null, // Venta automática
                cliente_id: userB2B.id !== 'b2b-001' ? userB2B.id : null, // ID Mock para el login demo

                // Métrica Corporativa
                tipo_venta: 'MAYOREO', // <--- Discriminador Universal

                // Lógica de items
                items: cart.map(item => ({
                    producto_id: item.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: item.currentPrice
                })),

                metodo_pago: 'CREDITO', // B2B generalmente opera con crédito/transferencia
                estado_entrega: 'PENDIENTE',
                metodo_entrega: 'DOMICILIO',
                direccion_entrega: userB2B.direccion || 'Dirección Corporativa Registrada',
                nombre_receptor: userB2B.nombre_empresa
            }

            // Inserción directa a Supabase
            const { error: insertError } = await supabase.from('ventas').insert([payload])
            if (insertError) throw insertError

            // Si es un cliente real (no demo), descontamos de su crédito (Sumando a deuda)
            if (userB2B.id !== 'b2b-001') {
                // Hay que obtener el saldo actual para evitar desfaces
                // En un entorno de altísima concurrencia esto se haría por RPC, pero fetch->update funciona para Pymes
                const { data: clientData } = await supabase.from('clientes').select('saldo_deudor').eq('id', userB2B.id).single()
                if (clientData) {
                    const nuevoSaldo = (clientData.saldo_deudor || 0) + total
                    await supabase.from('clientes').update({ saldo_deudor: nuevoSaldo }).eq('id', userB2B.id)
                }
            }

            toast.success('Pedido confirmado exitosamente.', { id: 'b2bFlow' })
            clearCart()
            navigate('/mayoristas/pedidos')

        } catch (err) {
            console.error('Error de Checkout B2B:', err)
            toast.error('Ocurrió un error al procesar tu pedido.', { id: 'b2bFlow' })
        } finally {
            setProcessing(false)
        }
    }

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white rounded-2xl shadow-sm border border-slate-100">
                <ShoppingBag className="w-16 h-16 text-slate-200 mb-6" />
                <h2 className="text-2xl font-bold text-slate-700 font-display mb-2">Tu pedido está vacío</h2>
                <p className="text-slate-500 mb-8 max-w-sm text-center">Explora el catálogo para agregar productos a precio especial de mayoreo.</p>
                <Link
                    to="/mayoristas/catalogo"
                    className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                >
                    Ir al Catálogo Central
                </Link>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de Productos */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold font-display text-slate-800 mb-6 px-2">Resumen del Pedido</h2>

                {cart.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4 items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                            {item.imagen_url
                                ? <img src={item.imagen_url} alt={item.nombre} className="object-contain w-full h-full mix-blend-multiply" />
                                : <PackageSearch className="w-6 h-6 text-slate-300" />
                            }
                        </div>

                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-800 text-sm mb-1">{item.nombre}</h3>
                            <p className="text-xs text-slate-400 uppercase font-medium tracking-wider mb-2">
                                Mayoreo: ${Number(item.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                                    className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-bold text-slate-700 w-8 text-center">{item.cantidad}</span>
                                <button
                                    onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                                    disabled={item.cantidad >= item.stock}
                                    className="p-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                {item.cantidad >= item.stock && (
                                    <span className="text-[10px] text-amber-500 font-bold uppercase ml-2 px-2 py-0.5 bg-amber-50 rounded text-nowrap">Max Bodega</span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-4 ml-4">
                            <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-2"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <p className="font-extrabold text-lg text-slate-800">
                                ${(item.currentPrice * item.cantidad).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Check Out Panel */}
            <div className="lg:col-span-1">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/20 sticky top-24">
                    <h3 className="text-lg font-bold mb-6 font-display flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-400" />
                        Desglose Financiero
                    </h3>

                    <div className="space-y-4 text-sm mb-8 text-slate-300">
                        <div className="flex justify-between">
                            <span>Subtotal B2B</span>
                            <span className="font-semibold text-white">
                                ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex justify-between text-indigo-300">
                            <span>Manejo y Envío Flotilla</span>
                            <span>Incluido</span>
                        </div>
                        <div className="border-t border-slate-700 pt-4 flex justify-between items-end mt-4">
                            <span className="text-base text-slate-400">Total</span>
                            <span className="text-3xl font-bold font-display text-white tracking-tight">
                                ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirmOrder}
                        disabled={processing}
                        className="w-full bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-400 transition-all focus:ring-4 focus:ring-indigo-900 disabled:opacity-70"
                    >
                        {processing ? 'Emitiendo Orden...' : 'Confirmar Pedido'}
                    </button>

                    <p className="text-xs text-center text-slate-500 mt-4 leading-relaxed">
                        Al confirmar, se emitirá una orden de trabajo a la Bodega Central. El ejecutivo de cuenta se comunicará para el cierre fiscal.
                    </p>
                </div>
            </div>
        </div>
    )
}
