import { Component } from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'

/**
 * Error Boundary por sección — aísla crashes de una página sin matar la app entera.
 * Uso: <SectionErrorBoundary sectionName="Dashboard"><Dashboard /></SectionErrorBoundary>
 */
export default class SectionErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error(`[ErrorBoundary] ${this.props.sectionName || 'Sección'}:`, error, info.componentStack)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            const isChunkError =
                this.state.error?.message?.includes('Loading chunk') ||
                this.state.error?.message?.includes('Failed to fetch') ||
                this.state.error?.name === 'ChunkLoadError'

            return (
                <div className="flex items-center justify-center min-h-[60vh] p-8">
                    <div className="text-center max-w-md">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle className="text-red-500" size={32} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">
                            {isChunkError ? '🔄 Actualización Disponible' : `Error en ${this.props.sectionName || 'esta sección'}`}
                        </h2>
                        <p className="text-slate-500 text-sm mb-6">
                            {isChunkError
                                ? 'Hay una versión nueva disponible. Recarga para actualizar.'
                                : 'Ocurrió un error inesperado. Puedes reintentar sin perder tu sesión.'}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors active:scale-95"
                            >
                                <RotateCcw size={18} />
                                Reintentar
                            </button>
                            {isChunkError && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors active:scale-95"
                                >
                                    Recargar App
                                </button>
                            )}
                        </div>
                        {!isChunkError && (
                            <details className="mt-6 text-left">
                                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                                    Detalles técnicos
                                </summary>
                                <pre className="mt-2 text-[10px] text-red-400 bg-slate-50 p-3 rounded-lg overflow-auto max-h-32 border border-slate-100">
                                    {this.state.error?.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
