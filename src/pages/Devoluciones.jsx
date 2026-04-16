import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@powersync/react'
import { useAuth } from '../context/AuthContext'
import { powersync } from '../powersync/db'
import { toast } from 'sonner'
import {
    Search, RotateCcw, Wallet, PackageX, CheckCircle2,
    Loader2, X, Minus, Plus, QrCode, Copy, Ticket, History
} from 'lucide-react'

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function fmt(d) {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    } catch { return d }
}

function money(n) { return `$${parseFloat(n || 0).toFixed(2)}` }

function genCouponCode() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const seg = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join('')
    return `DEV-${seg()}-${seg()}`
}

// ──────────────────────────────────────────────────────────
// CouponModal – shown after generating a QR coupon
// ──────────────────────────────────────────────────────────
function CouponModal({ coupon, onClose }) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(coupon.codigo)}`

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 py-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Ticket size={20} />
                        <span className="font-black text-base">Cupón de Devolución</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl border-4 border-slate-100 shadow-inner">
                        <img src={qrUrl} alt="QR" className="w-48 h-48 rounded-xl" />
                    </div>

                    <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Código</p>
                            <p className="font-mono font-black text-slate-800 text-lg">{coupon.codigo}</p>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(coupon.codigo); toast.success('Código copiado') }}
                            className="p-2 hover:bg-slate-200 rounded-xl text-slate-500">
                            <Copy size={18} />
                        </button>
                    </div>

                    <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4 text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-1">Valor</p>
                        <p className="text-4xl font-black text-emerald-700">{money(coupon.monto)}</p>
                        <p className="text-xs font-bold text-emerald-500 mt-1">Válido 90 días · Canjeable en caja</p>
                    </div>

                    <button onClick={onClose} className="w-full py-3 bg-slate-800 text-white font-black rounded-2xl active:scale-95 transition-all">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}

// ──────────────────────────────────────────────────────────
// ConfirmModal
// ──────────────────────────────────────────────────────────
function ConfirmModal({ venta, items, total, isGuest, saving, onClose, onConfirm }) {
    const [motivo, setMotivo] = useState('')
    return (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 rounded-t-3xl flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                        <RotateCcw className="text-amber-600" size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-800">Confirmar Devolución</h2>
                        <p className="text-xs font-bold text-slate-400">{items.length} partida(s) · {money(total)}</p>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2 max-h-36 overflow-auto">
                        {items.map((it, i) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="font-bold text-slate-700 truncate flex-1 mr-2">{it.nombre}</span>
                                <span className="font-black text-slate-500 shrink-0">{it.qty} × {money(it.precio_unitario)}</span>
                            </div>
                        ))}
                    </div>

                    {isGuest ? (
                        <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-2xl p-4">
                            <QrCode className="text-violet-600 mt-0.5 shrink-0" size={20} />
                            <div>
                                <p className="font-black text-violet-800 text-sm">Se generará Cupón QR</p>
                                <p className="text-2xl font-black text-violet-700">{money(total)}</p>
                                <p className="text-xs text-violet-600 font-bold mt-1">Sin devolución en efectivo.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                            <Wallet className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                            <div>
                                <p className="font-black text-emerald-800 text-sm">Abono a Monedero</p>
                                <p className="text-2xl font-black text-emerald-700">{money(total)}</p>
                                <p className="text-xs text-emerald-600 font-bold mt-1">Sin devolución en efectivo.</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Motivo (opcional)</label>
                        <input value={motivo} onChange={e => setMotivo(e.target.value)}
                            placeholder="Ej: Producto defectuoso..."
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-amber-500" />
                    </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
                    <button onClick={onClose} disabled={saving}
                        className="flex-1 px-4 py-2.5 text-slate-600 font-bold bg-white border border-slate-200 rounded-2xl disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={() => onConfirm(motivo)} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        {saving ? 'Procesando...' : 'Procesar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ──────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────
export default function Devoluciones() {
    const { user, selectedBranch } = useAuth()

    // UI state
    const [tab, setTab] = useState('nueva')          // 'nueva' | 'historial' | 'cupones'
    const [search, setSearch] = useState('')
    const [selectedVenta, setSelectedVenta] = useState(null)
    const [qtys, setQtys] = useState({})             // { [detalle.id]: number }
    const [showConfirm, setShowConfirm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [generatedCoupon, setGeneratedCoupon] = useState(null)

    // ── Ventas list ──
    const { data: ventas = [] } = useQuery(
        `SELECT v.id, v.total, v.metodo_pago, v.created_at, v.items_json,
                v.cliente_id,
                c.nombre   AS cliente_nombre,
                c.saldo_monedero AS saldo_monedero_actual
         FROM ventas v
         LEFT JOIN clientes c ON c.id = v.cliente_id
         WHERE v.sucursal_id = ?
         ORDER BY v.created_at DESC
         LIMIT 500`,
        [selectedBranch]
    )

    // ── Historial devoluciones ──
    const { data: historial = [] } = useQuery(
        `SELECT d.id, d.total_devolucion, d.monto_monedero, d.motivo, d.created_at,
                c.nombre AS cliente_nombre
         FROM devoluciones d
         LEFT JOIN clientes c ON c.id = d.cliente_id
         WHERE d.sucursal_id = ?
         ORDER BY d.created_at DESC LIMIT 100`,
        [selectedBranch]
    )

    // ── Cupones activos ──
    const { data: cupones = [] } = useQuery(
        `SELECT id, codigo, monto_disponible, motivo, created_at, expira_at
         FROM cupones
         WHERE sucursal_id = ? AND estado = 'ACTIVO'
         ORDER BY created_at DESC LIMIT 50`,
        [selectedBranch]
    )

    // ── Detalles of selected venta (direct execute to avoid stale hook) ──
    const [detalles, setDetalles] = useState([])
    useEffect(() => {
        if (!selectedVenta) { setDetalles([]); return }
        let cancelled = false
        powersync.execute(
            `SELECT id, producto_id, nombre, cantidad, precio_unitario, subtotal,
                    producto_id AS pid
             FROM venta_detalles
             WHERE venta_id = ?
             ORDER BY id`,
            [selectedVenta.id]
        ).then(res => {
            const rows = res.rows?._array ?? []
            if (cancelled) return
            if (rows.length > 0) {
                setDetalles(rows)
            } else {
                // Fallback: parse items_json from the venta row
                try {
                    const parsed = JSON.parse(selectedVenta.items_json || '[]')
                    setDetalles(parsed.map((item, i) => ({
                        id: `json_${i}`,
                        pid: item.producto_id || null,
                        producto_id: item.producto_id || null,
                        nombre: item.nombre || '(Sin nombre)',
                        cantidad: item.cantidad || 1,
                        precio_unitario: item.precio_unitario || 0,
                        subtotal: (item.cantidad || 1) * (item.precio_unitario || 0),
                        _fromJson: true
                    })))
                } catch { setDetalles([]) }
            }
        }).catch(() => setDetalles([]))
        return () => { cancelled = true }
    }, [selectedVenta?.id])

    // ── Ya devuelto por producto en este ticket ──
    const { data: yaDevueltoRows = [] } = useQuery(
        selectedVenta
            ? `SELECT dd.nombre, SUM(dd.cantidad_devuelta) AS ya
               FROM devolucion_detalles dd
               JOIN devoluciones dv ON dv.id = dd.devolucion_id
               WHERE dv.venta_id = ? AND dv.estado = 'PROCESADA'
               GROUP BY dd.nombre`
            : `SELECT 1 WHERE 0=1`,
        selectedVenta ? [selectedVenta.id] : []
    )
    const yaDevuelto = useMemo(() => {
        const m = {}
        yaDevueltoRows.forEach(r => { m[r.nombre] = parseFloat(r.ya || 0) })
        return m
    }, [yaDevueltoRows])

    // ── Filtered ventas ──
    const filteredVentas = useMemo(() => {
        const t = search.toLowerCase()
        if (!t) return ventas.slice(0, 80)
        return ventas.filter(v =>
            (v.cliente_nombre || '').toLowerCase().includes(t) ||
            v.id.toLowerCase().includes(t) ||
            (v.created_at || '').includes(t)
        ).slice(0, 80)
    }, [ventas, search])

    // ── Build items to return (plain, no memo) ──
    const itemsSeleccionados = detalles
        .map(d => ({
            ...d,
            qty: Math.min(
                parseFloat(qtys[d.id] ?? 0),
                Math.max(0, parseFloat(d.cantidad) - parseFloat(yaDevuelto[d.nombre] || 0))
            )
        }))
        .filter(d => d.qty > 0)

    const total = itemsSeleccionados.reduce(
        (s, d) => s + d.qty * parseFloat(d.precio_unitario), 0
    )

    const isGuest = !selectedVenta?.cliente_id

    const setQty = (id, val, max) => {
        const v = Math.max(0, Math.min(max, parseFloat(val) || 0))
        setQtys(prev => ({ ...prev, [id]: v }))
    }

    const handleSelectVenta = (v) => {
        setSelectedVenta(v)
        setQtys({})
        setShowConfirm(false)
    }

    // ── Core return logic ──
    const handleConfirm = async (motivo) => {
        if (itemsSeleccionados.length === 0) return
        setSaving(true)
        try {
            const devId = crypto.randomUUID()

            // 1. Header
            await powersync.execute(
                `INSERT INTO devoluciones
                 (id, venta_id, cliente_id, sucursal_id, usuario_id,
                  total_devolucion, monto_monedero, motivo, estado, created_at)
                 VALUES (?,?,?,?,?,?,?,?,'PROCESADA', datetime('now'))`,
                [devId, selectedVenta.id, selectedVenta.cliente_id || null,
                 selectedBranch, user?.id,
                 total, isGuest ? 0 : total,
                 motivo || null]
            )

            for (const item of itemsSeleccionados) {
                const subTotal = item.qty * parseFloat(item.precio_unitario)

                // 2. Detail line
                await powersync.execute(
                    `INSERT INTO devolucion_detalles
                     (id, devolucion_id, producto_id, nombre, cantidad_devuelta, precio_unitario, subtotal)
                     VALUES (?,?,?,?,?,?,?)`,
                    [crypto.randomUUID(), devId,
                     item.pid || null, item.nombre,
                     item.qty, item.precio_unitario, subTotal]
                )

                // 3. Inventory re-entry
                if (item.pid) {
                    const invRes = await powersync.execute(
                        `SELECT id, stock_actual FROM inventario
                         WHERE producto_id = ? AND sucursal_id = ? LIMIT 1`,
                        [item.pid, selectedBranch]
                    )
                    const invRow = invRes.rows?._array?.[0]
                    const prevStock = parseFloat(invRow?.stock_actual ?? 0)
                    const newStock = prevStock + item.qty

                    if (invRow) {
                        await powersync.execute(
                            `UPDATE inventario SET stock_actual = ? WHERE id = ?`,
                            [newStock, invRow.id]
                        )
                    } else {
                        await powersync.execute(
                            `INSERT INTO inventario (id, producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo)
                             VALUES (?,?,?,?,0,9999)`,
                            [crypto.randomUUID(), item.pid, selectedBranch, item.qty]
                        )
                    }

                    // 4. Kardex entry
                    await powersync.execute(
                        `INSERT INTO kardex
                         (id, producto_id, sucursal_id, tipo_movimiento, cantidad,
                          saldo_previo, saldo_nuevo, concepto, referencia_id, usuario_id, created_at)
                         VALUES (?,?,?,'DEVOLUCION',?,?,?,?,?,?,datetime('now'))`,
                        [crypto.randomUUID(), item.pid, selectedBranch,
                         item.qty, prevStock, newStock,
                         `Devolución${motivo ? ': ' + motivo : ''}`,
                         devId, user?.id]
                    )
                }
            }

            // 5a. Wallet credit (registered customer)
            if (!isGuest) {
                const saldoActual = parseFloat(selectedVenta.saldo_monedero_actual || 0)
                await powersync.execute(
                    `UPDATE clientes SET saldo_monedero = ?, updated_at = datetime('now') WHERE id = ?`,
                    [saldoActual + total, selectedVenta.cliente_id]
                )
                toast.success('✅ Devolución Procesada', {
                    description: `${money(total)} abonados al monedero de ${selectedVenta.cliente_nombre}`
                })
            } else {
                // 5b. QR Coupon (guest)
                const codigo = genCouponCode()
                const expira = new Date(); expira.setDate(expira.getDate() + 90)
                await powersync.execute(
                    `INSERT INTO cupones
                     (id, codigo, tipo, monto_original, monto_disponible,
                      venta_origen_id, sucursal_id, usuario_id, motivo, estado, expira_at, created_at)
                     VALUES (?,?,'devolucion',?,?,?,?,?,?,'ACTIVO',?,datetime('now'))`,
                    [crypto.randomUUID(), codigo, total, total,
                     selectedVenta.id, selectedBranch, user?.id,
                     motivo || null, expira.toISOString()]
                )
                setGeneratedCoupon({ codigo, monto: total })
                toast.success('🎫 Cupón QR generado')
            }

            setShowConfirm(false)
            setSelectedVenta(null)
            setQtys({})
        } catch (err) {
            console.error('[Devoluciones] Error:', err)
            toast.error('Error al procesar devolución', {
                description: err?.message || String(err),
                duration: 8000
            })
        } finally {
            setSaving(false)
        }
    }

    // ──────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-100">

            {/* ─── Page Header ─── */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm shrink-0">
                <div className="w-11 h-11 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                    <RotateCcw className="text-amber-600" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Devoluciones</h1>
                    <p className="text-xs font-bold text-slate-400">Clientes registrados → Monedero · Público General → Cupón QR</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
                    {[
                        { key: 'nueva', label: 'Nueva' },
                        { key: 'historial', label: 'Historial', badge: historial.length },
                        { key: 'cupones', label: 'Cupones QR', badge: cupones.length }
                    ].map(({ key, label, badge }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`relative px-4 py-2 rounded-xl font-black text-xs transition-all ${tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            {label}
                            {badge > 0 && (
                                <span className={`ml-1.5 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ${key === 'historial' ? 'bg-amber-500' : 'bg-violet-500'}`}>
                                    {badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── TAB: Nueva Devolución ─── */}
            {tab === 'nueva' && (
                <div className="flex flex-1 overflow-hidden">

                    {/* Left panel: ticket list */}
                    <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
                        <div className="p-3 border-b border-slate-100">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar ticket, cliente..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 font-bold text-sm text-slate-800 focus:outline-none focus:border-amber-500" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto divide-y divide-slate-50">
                            {filteredVentas.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 p-6">
                                    <PackageX size={36} />
                                    <p className="text-slate-400 font-bold text-sm">Sin ventas</p>
                                </div>
                            ) : filteredVentas.map(v => (
                                <button key={v.id} onClick={() => handleSelectVenta(v)}
                                    className={`w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors ${selectedVenta?.id === v.id ? 'bg-amber-50 border-l-2 border-amber-400' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="font-black text-slate-700 text-sm truncate">
                                                {v.cliente_nombre || 'Público General'}
                                            </p>
                                            <p className="text-[10px] font-mono text-slate-400 truncate">{v.id.slice(-14)}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{fmt(v.created_at)}</p>
                                        </div>
                                        <span className="font-black text-slate-800 text-sm shrink-0">{money(v.total)}</span>
                                    </div>
                                    {!v.cliente_id && (
                                        <span className="inline-flex items-center gap-1 text-[9px] text-violet-600 font-black bg-violet-50 px-2 py-0.5 rounded-lg mt-1">
                                            <QrCode size={8} /> Cupón QR
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right panel: item selection */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {!selectedVenta ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3">
                                <RotateCcw size={52} />
                                <p className="font-bold text-slate-500">Selecciona un ticket de la lista</p>
                            </div>
                        ) : (
                            <>
                                {/* Ticket info bar */}
                                <div className="bg-white border-b border-slate-100 px-6 py-4 shrink-0 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ticket seleccionado</p>
                                        <p className="font-black text-slate-800 text-lg leading-tight">{selectedVenta.cliente_nombre || 'Público General'}</p>
                                        <div className="flex flex-wrap gap-3 mt-1">
                                            <p className="text-xs font-mono text-slate-400">{selectedVenta.id.slice(-16)}</p>
                                            <p className="text-xs font-bold text-slate-500">{fmt(selectedVenta.created_at)}</p>
                                            <p className="text-xs font-black text-slate-700">{money(selectedVenta.total)}</p>
                                        </div>
                                        {isGuest ? (
                                            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-xl">
                                                <QrCode size={12} /> Se generará cupón QR imprimible
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                                                <Wallet size={12} /> Monedero actual: {money(selectedVenta.saldo_monedero_actual)}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setSelectedVenta(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 shrink-0">
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Items */}
                                <div className="flex-1 overflow-auto p-5 space-y-3">
                                    {detalles.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-3">
                                            <PackageX size={40} />
                                            <p className="text-slate-400 font-bold">Sin productos en este ticket</p>
                                        </div>
                                    ) : detalles.map(d => {
                                        const maxQ = Math.max(0, parseFloat(d.cantidad) - parseFloat(yaDevuelto[d.nombre] || 0))
                                        const qty = parseFloat(qtys[d.id] ?? 0)
                                        const alreadyReturned = parseFloat(yaDevuelto[d.nombre] || 0)
                                        const fullyReturned = maxQ === 0

                                        return (
                                            <div key={d.id}
                                                className={`bg-white rounded-2xl border p-4 flex items-center gap-4 shadow-sm transition-colors ${qty > 0 ? 'border-amber-300 bg-amber-50/30' : fullyReturned ? 'border-slate-100 opacity-40' : 'border-slate-200'}`}>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-slate-800 text-sm truncate">{d.nombre}</p>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        <span className="text-xs font-bold text-slate-500">
                                                            Vendido: {parseFloat(d.cantidad).toFixed(0)} × {money(d.precio_unitario)}
                                                        </span>
                                                        {alreadyReturned > 0 && (
                                                            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">
                                                                Ya devuelto: {alreadyReturned}
                                                            </span>
                                                        )}
                                                        {fullyReturned && (
                                                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">Agotado</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {!fullyReturned && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                                            <button onClick={() => setQty(d.id, qty - 1, maxQ)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-all">
                                                                <Minus size={12} strokeWidth={3} />
                                                            </button>
                                                            <input type="number" min="0" max={maxQ}
                                                                value={qty || ''}
                                                                placeholder="0"
                                                                onChange={e => setQty(d.id, e.target.value, maxQ)}
                                                                className="w-10 text-center font-black text-slate-800 text-sm bg-transparent focus:outline-none" />
                                                            <button onClick={() => setQty(d.id, qty + 1, maxQ)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-all">
                                                                <Plus size={12} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                        {qty > 0 && (
                                                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                                                -{money(qty * parseFloat(d.precio_unitario))}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Footer action bar — always visible */}
                                <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {isGuest ? 'Valor del Cupón QR' : 'Abono al Monedero'}
                                        </p>
                                        <p className={`text-3xl font-black ${isGuest ? 'text-violet-700' : 'text-emerald-700'}`}>
                                            {money(total)}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400">
                                            {itemsSeleccionados.length > 0
                                                ? `${itemsSeleccionados.length} artículo(s) seleccionado(s)`
                                                : 'Añade cantidades para continuar'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowConfirm(true)}
                                        disabled={itemsSeleccionados.length === 0}
                                        className={`flex items-center gap-2 px-8 py-3.5 text-white font-black rounded-2xl active:scale-95 transition-all
                                            ${itemsSeleccionados.length === 0
                                                ? 'bg-slate-300 cursor-not-allowed'
                                                : isGuest
                                                    ? 'bg-violet-600 hover:bg-violet-700 shadow-lg'
                                                    : 'bg-amber-500 hover:bg-amber-600 shadow-lg'}`}>
                                        {isGuest ? <QrCode size={20} /> : <Wallet size={20} />}
                                        {isGuest ? 'Generar Cupón QR' : 'Procesar Devolución'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB: Historial ─── */}
            {tab === 'historial' && (
                <div className="flex-1 overflow-auto p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                        {historial.length} devoluciones registradas
                    </p>
                    {historial.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-300 gap-3">
                            <History size={48} />
                            <p className="font-bold text-slate-400">Sin devoluciones aún</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-w-2xl">
                            {historial.map(d => (
                                <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4 shadow-sm">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-800 text-sm">{d.cliente_nombre || 'Público General'}</p>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">{fmt(d.created_at)}</p>
                                        {d.motivo && <p className="text-xs text-slate-500 font-bold mt-1 truncate">{d.motivo}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-slate-800 text-sm">{money(d.total_devolucion)}</p>
                                        {parseFloat(d.monto_monedero || 0) > 0 ? (
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Monedero</span>
                                        ) : (
                                            <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">Cupón QR</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── TAB: Cupones ─── */}
            {tab === 'cupones' && (
                <div className="flex-1 overflow-auto p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                        {cupones.length} cupones activos
                    </p>
                    {cupones.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-300 gap-3">
                            <QrCode size={48} />
                            <p className="font-bold text-slate-400">Sin cupones activos</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-w-2xl">
                            {cupones.map(c => (
                                <div key={c.id} className="bg-white rounded-2xl border border-violet-200 p-4 flex items-start justify-between gap-4 shadow-sm">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono font-black text-violet-800 text-sm tracking-wider">{c.codigo}</p>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">Emitido: {fmt(c.created_at)}</p>
                                        {c.expira_at && <p className="text-[10px] font-bold text-orange-500 mt-0.5">Vence: {fmt(c.expira_at)}</p>}
                                        {c.motivo && <p className="text-xs text-slate-500 font-bold mt-1 truncate">{c.motivo}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-violet-700 text-lg">{money(c.monto_disponible)}</p>
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">ACTIVO</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Modals ─── */}
            {showConfirm && (
                <ConfirmModal
                    venta={selectedVenta}
                    items={itemsSeleccionados}
                    total={total}
                    isGuest={isGuest}
                    saving={saving}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={handleConfirm}
                />
            )}

            {generatedCoupon && (
                <CouponModal
                    coupon={generatedCoupon}
                    onClose={() => setGeneratedCoupon(null)}
                />
            )}

        </div>
    )
}
