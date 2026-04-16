import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

/**
 * Hook para gestionar múltiples pestañas de venta (Hold Tickets).
 * Permite tener "Ticket 1", "Ticket 2", etc., pausar ventas y alternar.
 * Mantiene persistencia en localStorage.
 */
export function useSalesCart(products, selectedBranch, settings = {}) {
    const storageKey = `sales_tabs_${selectedBranch || 'default'}`;

    // Estado base: Arreglo de tabs y el tab activo
    const [tabs, setTabs] = useState([{ id: 'tab_1', name: 'Ticket 1', cart: [] }]);
    const [activeTabId, setActiveTabId] = useState('tab_1');
    const isLoaded = useRef(false);

    // ── Cargar Tabs desde localStorage ──
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const data = JSON.parse(raw);
                if (data.tabs && data.tabs.length > 0) {
                    setTabs(data.tabs);
                    setActiveTabId(data.activeTabId || data.tabs[0].id);
                }
            }
        } catch { /* ignorar */ } finally {
            isLoaded.current = true;
        }
    }, [storageKey]);

    // ── Auto-Save con Debounce (300ms) ──
    // Evita serializar el carrito completo en cada keystroke o cambio de cantidad.
    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (!isLoaded.current) return;
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, JSON.stringify({ tabs, activeTabId }));
            } catch { /* ignorar por cuota excedida */ }
        }, 300);
        return () => clearTimeout(saveTimerRef.current);
    }, [tabs, activeTabId, storageKey]);

    // Obtener carrito activo derivado
    const activeIndex = useMemo(() => tabs.findIndex(t => t.id === activeTabId), [tabs, activeTabId]);
    const cart = useMemo(() => activeIndex >= 0 ? tabs[activeIndex].cart : [], [tabs, activeIndex]);

    // ── Mutaciones sobre el tab activo ──
    const updateActiveCart = useCallback((updater) => {
        setTabs(prev => {
            const idx = prev.findIndex(t => t.id === activeTabId);
            if (idx === -1) return prev;
            const newCart = typeof updater === 'function' ? updater(prev[idx].cart) : updater;
            const newTabs = [...prev];
            newTabs[idx] = { ...newTabs[idx], cart: newCart };
            return newTabs;
        });
    }, [activeTabId]);


    // ── GESTIÓN DE PESTAÑAS ──
    const addTab = useCallback(() => {
        setTabs(prev => {
            const newId = `tab_${Date.now()}`;
            const num = prev.length + 1;
            const newTabs = [...prev, { id: newId, name: `Ticket ${num}`, cart: [] }];
            setActiveTabId(newId);
            return newTabs;
        });
    }, []);

    const removeTab = useCallback((tabIdToRemove) => {
        setTabs(prev => {
            if (prev.length === 1) {
                // Si es el único, solo lo vaciamos en vez de borrarlo
                return [{ ...prev[0], cart: [] }];
            }
            const filtered = prev.filter(t => t.id !== tabIdToRemove);
            // Si eliminamos el activo, seleccionar el último que quede
            if (activeTabId === tabIdToRemove) {
                setActiveTabId(filtered[filtered.length - 1].id);
            }
            // Renombrar tickets secuencialmente
            return filtered.map((t, idx) => ({ ...t, name: `Ticket ${idx + 1}` }));
        });
    }, [activeTabId]);


    // ── Lógica de Carrito (aplica al activo) ──

    // ── Stock Disponible (global para todos los carritos o solo el activo?)
    // Bsale resta stock solo por lo que hay en el carrito activo, pero para no sobrevender entre tabs,
    // idealmente se suma TODO lo que hay en todos los tabs. Sin embargo, para no bloquear la venta, 
    // validamos contra el stock global disponible menos lo que hay en el tab activo.
    const getStockDisponible = useCallback((productId) => {
        const cartItems = cart.filter(item => item.id === productId);
        const enCarritoActivo = cartItems.reduce((sum, item) => sum + item.cantidad, 0);
        
        // 1. Intentar validar el stock fresco si el producto sigue visible en la tabla
        let masterStock = products?.find(p => p.id === productId)?.stock;
        
        // 2. Si desapareció por el LIMIT 50 de la búsqueda, buscar en el historial del carrito
        if (masterStock === undefined && cartItems.length > 0) {
            masterStock = cartItems[0].stock;
        }

        return (masterStock || 0) - enCarritoActivo;
    }, [cart, products]);

    const addToCart = useCallback((product, priceType) => {
        const price = priceType === 'mayoreo' ? product.prices?.precio_mayoreo : product.prices?.precio_menudeo;

        const stockDisponible = getStockDisponible(product.id);
        const permitidaFalta = settings.permitir_venta_sin_stock === 'true' || settings.permitir_venta_sin_stock === true;
        
        if (stockDisponible <= 0 && !permitidaFalta) {
            return { success: false, message: `Stock insuficiente (disponible: ${stockDisponible})` };
        }

        updateActiveCart(prev => {
            const existingIndex = prev.findIndex(item => item.id === product.id && item.priceType === priceType);
            if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], cantidad: updated[existingIndex].cantidad + 1 };
                return updated;
            }
            return [...prev, { ...product, cantidad: 1, priceType, selectedPrice: price }];
        });

        return { success: true };
    }, [getStockDisponible, updateActiveCart]);

    const updateQuantity = useCallback((itemId, priceType, change) => {
        const item = cart.find(i => i.id === itemId && i.priceType === priceType);
        if (!item) return { success: false, message: 'Item no encontrado en el carrito' };

        if (change > 0) {
            const stockDisponible = getStockDisponible(itemId);
            const permitidaFalta = settings.permitir_venta_sin_stock === 'true' || settings.permitir_venta_sin_stock === true;
            if (stockDisponible <= 0 && !permitidaFalta) {
                return { success: false, message: `Stock insuficiente (disponible: ${stockDisponible + item.cantidad})` };
            }
        }

        const newQty = Math.max(1, item.cantidad + change);
        updateActiveCart(prev => prev.map(i =>
            (i.id === itemId && i.priceType === priceType) ? { ...i, cantidad: newQty } : i
        ));

        return { success: true };
    }, [cart, getStockDisponible, updateActiveCart]);

    const removeFromCart = useCallback((itemId, priceType) => {
        updateActiveCart(prev => prev.filter(item => !(item.id === itemId && item.priceType === priceType)));
    }, [updateActiveCart]);

    const updateItemPrice = useCallback((itemId, priceType, newPrice) => {
        updateActiveCart(prev => prev.map(i =>
            (i.id === itemId && i.priceType === priceType) ? { ...i, selectedPrice: newPrice } : i
        ));
    }, [updateActiveCart]);

    const updateItemDiscount = useCallback((itemId, priceType, descuento) => {
        updateActiveCart(prev => prev.map(i =>
            (i.id === itemId && i.priceType === priceType) ? { ...i, descuento } : i
        ));
    }, [updateActiveCart]);

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            const dto = item.descuento ?? 0;
            const precioReal = item.selectedPrice * (1 - dto / 100);
            return sum + (precioReal * item.cantidad);
        }, 0);
    }, [cart]);

    const calculateTotal = useCallback(() => cartTotal, [cartTotal]);

    const clearCart = useCallback(() => {
        updateActiveCart([]);
    }, [updateActiveCart]);

    return {
        // Core cart
        cart,
        cartTotal,
        getStockDisponible,
        addToCart,
        updateQuantity,
        removeFromCart,
        calculateTotal,
        clearCart,
        updateItemPrice,
        updateItemDiscount,
        
        // Multi-tab extension
        tabs,
        activeTabId,
        setActiveTabId,
        addTab,
        removeTab
    };
}
