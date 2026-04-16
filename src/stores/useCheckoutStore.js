// useCheckoutStore.js — Estado global para el proceso de Checkout (Zustand)
// Elimina el "Prop Drilling" y centraliza la lógica de pago/envío.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const initialState = {
    // ─── Estado Base del Pago ───
    paymentMethod: 'contado', // 'contado' | 'credito'
    selectedCustomerForSale: '',
    montoRecibido: 0,
    cambioCalculado: 0,

    // ─── Monedero Electrónico ───
    usarMonedero: false,
    montoMonederoUsado: 0,

    // ─── Cupón de Devolución ───
    cuponAplicado: null, // { id, codigo, monto_disponible }

    // ─── Estado de Entregas (Ferre-FedEx) ───
    tipoEntrega: 'MOSTRADOR', // 'MOSTRADOR' | 'DOMICILIO'
    direccionEntrega: '',
    telefonoEntrega: '',
    nombreReceptor: '',
    pagoEnvio: 'pagado', // 'pagado' | 'contra_entrega'
}

export const useCheckoutStore = create(
    persist(
        (set, get) => ({
            ...initialState,

            // ─── Setters Base ───
            setPaymentMethod: (method) => set({ paymentMethod: method }),
            setSelectedCustomerForSale: (id) => set({ selectedCustomerForSale: id, usarMonedero: false, montoMonederoUsado: 0, cuponAplicado: null }),
            setMontoRecibido: (monto) => set({ montoRecibido: Number(monto) }),
            setCambioCalculado: (cambio) => set({ cambioCalculado: Number(cambio) }),

            // ─── Setters Monedero ───
            setUsarMonedero: (usar) => set({ usarMonedero: usar }),
            setMontoMonederoUsado: (monto) => set({ montoMonederoUsado: Number(monto) }),

            // ─── Setters Cupón ───
            setCuponAplicado: (cupon) => set({ cuponAplicado: cupon }),

            // ─── Setters Entregas ───
            setTipoEntrega: (tipo) => set({ tipoEntrega: tipo }),
            setDireccionEntrega: (dir) => set({ direccionEntrega: dir }),
            setTelefonoEntrega: (tel) => set({ telefonoEntrega: tel }),
            setNombreReceptor: (nombre) => set({ nombreReceptor: nombre }),
            setPagoEnvio: (tipo) => set({ pagoEnvio: tipo }),

            // ─── Acciones Compuestas ───

            // Limpia todo el checkout al cerrar el modal o completar la venta
            resetCheckoutState: () => set({ ...initialState }),

            // Obtiene todo el payload de configuración para inyectarlo directo a Supabase
            getCheckoutPayload: () => {
                const state = get()
                const isContraEntrega = state.tipoEntrega === 'DOMICILIO' && state.pagoEnvio === 'contra_entrega';
                return {
                    metodo_pago: isContraEntrega ? 'contra_entrega' : state.paymentMethod,
                    cliente_id: state.selectedCustomerForSale || null,
                    metodo_entrega: state.tipoEntrega,
                    direccion_entrega: state.tipoEntrega === 'DOMICILIO' ? state.direccionEntrega : null,
                    telefono_entrega: state.tipoEntrega === 'DOMICILIO' ? state.telefonoEntrega : null,
                    nombre_receptor: state.tipoEntrega === 'DOMICILIO' ? state.nombreReceptor : null,
                    estado_entrega: state.tipoEntrega === 'DOMICILIO' ? 'PENDIENTE' : null,
                    monto_recibido: (state.paymentMethod === 'contado' && !isContraEntrega) ? state.montoRecibido : null,
                    cambio: (state.paymentMethod === 'contado' && !isContraEntrega) ? state.cambioCalculado : null,
                    usar_monedero: state.usarMonedero,
                    monto_monedero_usado: state.usarMonedero ? state.montoMonederoUsado : 0,
                    cupon_id: state.cuponAplicado?.id || null,
                    // Store the full available amount — SalesService will enforce the actual cap
                    monto_cupon_usado: parseFloat(state.cuponAplicado?.monto_disponible || 0),
                }
            }
        }),
        {
            name: 'ferreteria_checkout_cache' // Se guarda en localStorage
        }
    )
)
