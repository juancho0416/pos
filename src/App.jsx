import React, { useEffect, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import LockScreen from './pages/LockScreen'
import Sales from './pages/Sales'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SyncProvider } from './hooks/useSync'
import NetworkGuard from './components/NetworkGuard'
import TransferNotifications from './components/TransferNotifications'
import { Toaster } from 'sonner'
import { useInventoryRealtime } from './hooks/useInventoryRealtime'
import RoleGuard from './components/guards/RoleGuard'
import { useMayoristaStore } from './stores/useMayoristaStore'

// ════════════════════════════════════════════════════════════
// ★ lazyWithRetry: Si Chrome sirve un chunk obsoleto (404),
//   forzar una recarga limpia desde el servidor UNA sola vez.
//   Evita loops infinitos con un flag en sessionStorage.
// ════════════════════════════════════════════════════════════
const lazyWithRetry = (importFn) =>
  React.lazy(() =>
    importFn().catch((error) => {
      const hasRetried = sessionStorage.getItem('chunk_retry')

      if (!hasRetried) {
        console.error('⚠️ ChunkLoadError — forzando recarga limpia:', error.message)
        sessionStorage.setItem('chunk_retry', '1')
        window.location.reload()
        return new Promise(() => { })
      }

      sessionStorage.removeItem('chunk_retry')
      throw error
    })
  )

// Limpiar el flag de retry cuando la app carga exitosamente
sessionStorage.removeItem('chunk_retry')

// ★ Code-Split con protección anti-chunk-muerto
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'))
const Reception = lazyWithRetry(() => import('./pages/Reception'))
const Compras = lazyWithRetry(() => import('./pages/Compras'))
const Proveedores = lazyWithRetry(() => import('./pages/Proveedores'))
const Products = lazyWithRetry(() => import('./pages/Products'))
const Stock = lazyWithRetry(() => import('./pages/Stock'))
const Transfers = lazyWithRetry(() => import('./pages/Transfers'))
const CashClose = lazyWithRetry(() => import('./pages/CashClose'))
const Customers = lazyWithRetry(() => import('./pages/Customers'))
const ShiftHistory = lazyWithRetry(() => import('./pages/ShiftHistory'))
const VentasHistory = lazyWithRetry(() => import('./pages/VentasHistory'))
const UsersAdmin = lazyWithRetry(() => import('./pages/UsersAdmin'))
const SettingsAdmin = lazyWithRetry(() => import('./pages/SettingsAdmin'))
const TransferReport = lazyWithRetry(() => import('./pages/TransferReport'))
const Quotes = lazyWithRetry(() => import('./pages/Quotes'))
const KardexGeneral = lazyWithRetry(() => import('./pages/KardexGeneral'))
const Devoluciones = lazyWithRetry(() => import('./pages/Devoluciones'))
const ImportProductos = lazyWithRetry(() => import('./pages/ImportProductos'))
const DigitalTicketView = lazyWithRetry(() => import('./pages/DigitalTicketView'))
const DeliveryDispatch = lazyWithRetry(() => import('./pages/DeliveryDispatch'))
const DriverRoute = lazyWithRetry(() => import('./pages/DriverRoute'))
const DeliveryTicketView = lazyWithRetry(() => import('./pages/DeliveryTicketView'))

// ★ B2B (Mayoreo) Code-Split
const B2BLayout = lazyWithRetry(() => import('./components/b2b/B2BLayout'))
const MayoristaLogin = lazyWithRetry(() => import('./pages/b2b/MayoristaLogin'))
const B2BCatalog = lazyWithRetry(() => import('./pages/b2b/B2BCatalog'))
const B2BCart = lazyWithRetry(() => import('./pages/b2b/B2BCart'))
const B2BMyAccount = lazyWithRetry(() => import('./pages/b2b/B2BMyAccount'))

// ★ Admin Bodega B2B Code-Split
const B2BAdminLayout = lazyWithRetry(() => import('./components/admin-bodega/B2BAdminLayout'))
const B2BOrdersBoard = lazyWithRetry(() => import('./pages/admin-bodega/B2BOrdersBoard'))
const B2BInventoryMonitor = lazyWithRetry(() => import('./pages/admin-bodega/B2BInventoryMonitor'))
const B2BClientPortfolio = lazyWithRetry(() => import('./pages/admin-bodega/B2BClientPortfolio'))
const B2BPhoneOrder = lazyWithRetry(() => import('./pages/admin-bodega/B2BPhoneOrder'))
const B2BDispatchBoard = lazyWithRetry(() => import('./pages/admin-bodega/B2BDispatchBoard'))

// ★ Mobile Delivery App Code-Split
const DriverAppRoute = lazyWithRetry(() => import('./pages/chofer/DriverRoute'))

// ════════════════════════════════════════════════════════════
// ★ ErrorBoundary mejorado: detecta ChunkLoadError y ofrece
//   recarga manual si lazyWithRetry no pudo recuperarlo
// ════════════════════════════════════════════════════════════
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.name === 'ChunkLoadError'

      return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">{isChunkError ? '🔄' : '⚠️'}</div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">
              {isChunkError ? 'Actualización Disponible' : 'Algo salió mal'}
            </h1>
            <p className="text-slate-500 text-sm mb-6">
              {isChunkError
                ? 'Hay una versión nueva de la app. Recarga para obtener la última versión.'
                : this.state.error.toString()
              }
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem('chunk_retry')
                window.location.href = '/'
              }}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              🔄 RECARGAR SISTEMA
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ════════════════════════════════════════════════════════════
// ★ ConnectionGuard: Limpieza preventiva de canales Supabase
//   Al OCULTAR pestaña: cierra canales para que Chrome
//   no los corrompa durante Memory Saver.
//   SIN Worker. SIN Dexie. Solo Supabase channels.
// ════════════════════════════════════════════════════════════
const ConnectionGuard = () => {
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        try {
          const { supabase } = await import('./supabaseClient')
          supabase.removeAllChannels()
        } catch {
          // Prevención — ignorar si falla
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  return null
}

// ════════════════════════════════════════════════════════════
// ★ GlobalRealtimeGuard: Mantiene el Websocket encendido a nivel 
//   App para que /stock y /sales estén sincronizados globalmente.
// ════════════════════════════════════════════════════════════
const GlobalRealtimeGuard = ({ children }) => {
  const { selectedBranch } = useAuth()
  useInventoryRealtime(selectedBranch)
  return children
}

// Wrapper for protected routes (Employees POS)
const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  const isLocked = localStorage.getItem('pos_is_locked') === 'true'

  // Evitar flash: mientras carga la sesión, mostrar spinner
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // ★ SOFT LOGOUT (Pantalla de Bloqueo)
  if (isLocked) {
    return <Navigate to="/lock-screen" replace />
  }

  // ★ HARD LOGOUT (Login Completo)
  if (!user && !localStorage.getItem('auth_user')) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

// Wrapper for Admin Bodega
const AdminBodegaGuard = () => {
  const { user, profile } = useAuth()

  if (!user && !localStorage.getItem('auth_user')) {
    return <Navigate to="/login" replace />
  }

  // Verificar si tiene rol administrativo o especialista en bodega
  // Ajustar acorde a los roles de la base de datos ('admin', 'ADMIN_BODEGA', etc.)
  if (profile && profile.rol !== 'admin' && profile.rol !== 'ADMIN_BODEGA') {
    return <Navigate to="/sales" replace />
  }

  return <Outlet />
}

// Wrapper for B2B protected routes
const B2BProtectedRoute = () => {
  // Leer desde el store de Zustand (en memoria) — no desde localStorage directamente
  // Evita bypass vía DevTools editando el JSON de localStorage
  const userB2B = useMayoristaStore(state => state.userB2B)
  const isAuth = userB2B !== null && userB2B !== undefined

  if (!isAuth) {
    return <Navigate to="/mayoristas/login" replace />
  }
  return <Outlet />
}


function App() {
  return (
    <ErrorBoundary>
      <Toaster position="bottom-right" richColors expand={false} />
      <AuthProvider>
        <SyncProvider>
          <GlobalRealtimeGuard>
            <BrowserRouter>
              <ConnectionGuard />
              <NetworkGuard />
              <TransferNotifications />
              <Suspense fallback={
                <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }>
                <Routes>
                  {/* Public Core Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/lock-screen" element={<LockScreen />} />
                  <Route path="/traspasos/ticket/:id" element={<DigitalTicketView />} />
                  <Route path="/entregas/ticket/:id" element={<DeliveryTicketView />} />

                  {/* ────────────────────────────────────────────────────────
                      B2B WHOLESALE SYSTEM (UNIVERSO PARALELO)
                  ──────────────────────────────────────────────────────── */}
                  <Route path="/mayoristas/login" element={<MayoristaLogin />} />

                  <Route element={<B2BProtectedRoute />}>
                    <Route path="/mayoristas" element={<B2BLayout />}>
                      <Route index element={<Navigate to="catalogo" replace />} />
                      <Route path="catalogo" element={<B2BCatalog />} />
                      <Route path="carrito" element={<B2BCart />} />
                      <Route path="mi-cuenta" element={<B2BMyAccount />} />
                      {/* Redirección para URLs viejas o de testing usando ruta absoluta */}
                      <Route path="pedidos" element={<Navigate to="/mayoristas/mi-cuenta" replace />} />
                    </Route>
                  </Route>

                  {/* ────────────────────────────────────────────────────────
                      ADMIN BODEGA B2B (FULFILLMENT CENTER)
                  ──────────────────────────────────────────────────────── */}
                  <Route element={<AdminBodegaGuard />}>
                    <Route path="/admin-bodega" element={<B2BAdminLayout />}>
                      <Route index element={<Navigate to="pedidos" replace />} />
                      <Route path="pedidos" element={<B2BOrdersBoard />} />
                      <Route path="inventario" element={<B2BInventoryMonitor />} />
                      <Route path="cartera" element={<B2BClientPortfolio />} />
                      <Route path="nuevo-pedido" element={<B2BPhoneOrder />} />
                      <Route path="despacho" element={<B2BDispatchBoard />} />
                      {/* Móvil de Entrega incorporado en Bodega */}
                      <Route path="rutas-activas" element={<DriverAppRoute />} />
                      {/* Opcionales para despues */}
                      <Route path="manifiestos" element={<div className="p-8 text-white">Manifiestos en Desarrollo</div>} />
                      <Route path="logistica" element={<div className="p-8 text-white">Integración Logística en Desarrollo</div>} />
                    </Route>
                  </Route>

                  {/* ────────────────────────────────────────────────────────
                      POS SYSTEM (MENUDEO - EMPLEADOS)
                  ──────────────────────────────────────────────────────── */}
                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Navigate to="/sales" replace />} />

                      {/* ── Rutas de VENDEDOR + ADMIN ── */}
                      <Route path="sales" element={<Sales />} />
                      <Route path="recepcion" element={<Reception />} />
                      <Route path="compras" element={<Compras />} />
                      <Route path="proveedores" element={<Proveedores />} />
                      <Route path="devoluciones" element={<Devoluciones />} />
                      <Route path="products" element={<Products />} />
                      <Route path="importar-productos" element={<RoleGuard allowedRoles={['admin']}><ImportProductos /></RoleGuard>} />
                      <Route path="inventory" element={<Stock />} />
                      <Route path="transfers" element={<Transfers />} />
                      <Route path="cash-close" element={<CashClose />} />
                      <Route path="customers" element={<Customers />} />
                      <Route path="quotes" element={<Quotes />} />
                      <Route path="entregas" element={<DeliveryDispatch />} />
                      <Route path="chofer/ruta" element={<DriverRoute />} />

                      {/* ── Rutas SOLO ADMIN (Blindadas) ── */}
                      <Route path="dashboard" element={<RoleGuard allowedRoles={['admin']}><Dashboard /></RoleGuard>} />
                      <Route path="reporte-traspasos" element={<RoleGuard allowedRoles={['admin', 'admin_bodega']}><TransferReport /></RoleGuard>} />
                      <Route path="historial-turnos" element={<RoleGuard allowedRoles={['admin']}><ShiftHistory /></RoleGuard>} />
                      <Route path="historial-ventas" element={<VentasHistory />} />
                      <Route path="kardex" element={<RoleGuard allowedRoles={['admin', 'admin_bodega']}><KardexGeneral /></RoleGuard>} />
                      <Route path="users-admin" element={<RoleGuard allowedRoles={['admin']}><UsersAdmin /></RoleGuard>} />
                      <Route path="settings-admin" element={<RoleGuard allowedRoles={['admin']}><SettingsAdmin /></RoleGuard>} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </GlobalRealtimeGuard>
        </SyncProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App