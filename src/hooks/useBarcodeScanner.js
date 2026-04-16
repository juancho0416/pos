import { useEffect, useRef } from 'react'

export function useBarcodeScanner({ onScan, isActive = true }) {
    const buffer = useRef('')
    const lastKeyTime = useRef(Date.now())

    useEffect(() => {
        if (!isActive) return

        const handleKeyDown = (e) => {
            const activeElem = document.activeElement
            const isInput = activeElem && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElem.tagName) || activeElem.isContentEditable)
            const isMainSearch = activeElem?.id === 'main-pos-search'

            // 3. Prevención de Conflictos: Si el foco está en un campo de texto distinto al buscador global, se pausa
            if (isInput && !isMainSearch) {
                buffer.current = ''
                return
            }

            const currentTime = Date.now()

            // Lógica de detección: Los lectores físicos envían teclas con menos de 30-50ms de separación
            if (currentTime - lastKeyTime.current > 50) {
                // Si tardó mucho, no es una pistola (escaner), borramos lo anterior
                buffer.current = ''
            }

            if (e.key === 'Enter') {
                if (buffer.current.length >= 3) {
                    // Acción Automática Detectada
                    e.preventDefault()
                    e.stopPropagation()
                    onScan(buffer.current)
                }
                buffer.current = ''
            } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                buffer.current += e.key
            }

            lastKeyTime.current = currentTime
        }

        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [onScan, isActive])
}
