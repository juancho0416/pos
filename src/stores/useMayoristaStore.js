import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useMayoristaStore = create(
    persist(
        (set, get) => ({
            // ─── AUTHENTICATION STATE ───
            userB2B: null,      // { id, nombre_empresa, rfc, correo, etc. }
            tokenB2B: null,

            login: (userData, sessionToken) => set({ userB2B: userData, tokenB2B: sessionToken }),
            logout: () => set({ userB2B: null, tokenB2B: null, cart: [] }),

            // ─── SHOPPING CART STATE ───
            cart: [],

            addToCart: (product, qty = 1) => set((state) => {
                const existingItem = state.cart.find(item => item.id === product.id)
                if (existingItem) {
                    // Regla de Negocio: Validar stock máximo vs bodega Mayoreo
                    const maxStock = product.stock // Asumido ya filtrado por la DB a Bodega Mayoreo
                    const newQty = Math.min(existingItem.cantidad + qty, maxStock)

                    return {
                        cart: state.cart.map(item =>
                            item.id === product.id
                                ? { ...item, cantidad: newQty, currentPrice: product.precio_mayoreo }
                                : item
                        )
                    }
                }

                return {
                    cart: [...state.cart, {
                        ...product,
                        cantidad: qty,
                        currentPrice: product.precio_mayoreo // Estricto: Forzar precio de mayoreo
                    }]
                }
            }),

            removeFromCart: (productId) => set((state) => ({
                cart: state.cart.filter(item => item.id !== productId)
            })),

            updateQuantity: (productId, newQty) => set((state) => ({
                cart: state.cart.map(item =>
                    item.id === productId ? { ...item, cantidad: Math.max(1, newQty) } : item
                )
            })),

            clearCart: () => set({ cart: [] }),

            calculateTotal: () => {
                const currentCart = get().cart
                return currentCart.reduce((acc, item) => acc + (item.currentPrice * item.cantidad), 0)
            }
        }),
        {
            name: 'b2b-store', // key in local storage
        }
    ))
