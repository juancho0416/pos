// TransferNotifications.jsx — Suscripción Realtime a solicitudes de traslado entrantes
// Componente invisible que vive en App.jsx (dentro de AuthProvider)
import { useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useTransferStore } from '../stores/useTransferStore'
import { useNotificationStore } from '../stores/useNotificationStore'
import { useNavigate } from 'react-router-dom'

// ─── Sonido de notificación (Base64 embebido — ding corto) ───
const BELL_SOUND_B64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAbmVjqq+vs6+vq6d/YFpobn+JkJOUkpGMhX1yZ15WUFBRU1ldZW50f4mSmJubnJqXko2GfndsY1pSS0dFR0pQWGJsdn+IjpKVlZWTj4uGfnVrY1tTTkpHR0lOVFxlbnZ9g4eKi4uKiIWBfHVuaGJdWlhYWVtfZGpwd3yBhIaGhYOBfnp2cWxoY19cWldXV1pdYWdtcnh9gYOEhIOBf3x5dXFtaWZjYF9eXl9hZGhtcnd7foCBgYCAf317eXdzbm1ramlpaWpsbW9ydXd5e3x9fX18fHt5eHZzcnBubGtqamtrbG5wcnR3eXt7fHx8e3p5eHZ0cm9ubGppaWlqbG5wcnR3eXt8fX19fXx7e3l4dXNxbm1ramhpa2xucHN2eHt9fn9/f359fHt5d3VzcG5sa2loaGlrbG5xc3Z5e31+fn9/fn18e3l3dXNwbm1ramhpa2xucHJ1d3p8fn5/f35+fXt6eHZ0cnBubGtqaWlrbG5wcnV3ent9fn5+fn18e3l4dnRycG5tamloaGlrbG5wcnV4ent9fn9/fn59fHp4dnRycG5tamloaGprbW9xdHd5e31+f39/fn18enl3dXNxb21ramloaGprbW9xdHd5e31+f39/fn18enl3dXNxb21ramloaGlrbG5wcnR3eXt9fn5/f359fHt5d3VzcG5samloZ2hqbG5wd3l7fX5/f39+fXx7eXd1c3Fvbmxramtqa2xtbm9xcnR1d3h5e3t8fHx8fHt6eXh3dnVzc3FwcHBxcXJzdHV2d3h5e3p7e3t7enp5eXh3dnV0c3JycnJyc3R0dXZ3eHl5enp6ent7enp5eXh3dnZ1dHNzc3Nzc3R1dXZ3d3h5eXp6enp5eXl4eHd2dnV1dHR0dHR0dXV2dnd3eHl5eXp6enl5eXh4d3d2dnV1dXV1dXV1dnZ2d3d4eHl5eXl5eXl5eHh4d3d3dnZ2dnZ2dnZ2d3d3d3h4eHh4eXl5eXl5eHh4d3d3d3d2dnZ2dnd3d3d3d3h4eHh4eXl5eXl5eXh4eHh3d3d3d3d3d3d3d3d3d3h4eHh4eHh4eHl5eXl5eXl5eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eA=='

let audioInstance = null

function playNotificationSound() {
    try {
        if (!audioInstance) {
            audioInstance = new Audio(BELL_SOUND_B64)
            audioInstance.volume = 0.6
        }
        audioInstance.currentTime = 0
        audioInstance.play().catch(() => {
            // Navegador bloqueó autoplay — silencioso, no rompe nada
        })
    } catch {
        // Audio API no disponible
    }
}

export default function TransferNotifications() {
    const { selectedBranch } = useAuth()
    const navigate = useNavigate()
    const channelRef = useRef(null)

    // Cargar conteo inicial de solicitudes pendientes
    useEffect(() => {
        if (!selectedBranch) return

        const loadInitialCount = async () => {
            const { data, error } = await supabase
                .from('traslados')
                .select('id, folio, created_at')
                .eq('origen_id', selectedBranch)
                .eq('estado', 'SOLICITADO')

            if (!error && data) {
                useTransferStore.getState().setPendingRequests(data.length)

                // Populate missing notifications in the global store
                const notificationStore = useNotificationStore.getState()
                const existingNotifs = notificationStore.notifications

                data.forEach(req => {
                    const notifId = `transfer_req_${req.id}`
                    const exists = existingNotifs.some(n => n.id === notifId)

                    if (!exists) {
                        notificationStore.addNotification({
                            id: notifId,
                            type: 'TRANSFERENCIA',
                            title: 'Solicitud Pendiente',
                            message: `Folio #${String(req.folio).padStart(4, '0')} — Tienes un traspaso pendiente por revisar.`,
                            link: '/transfers',
                            timestamp: req.created_at || new Date().toISOString(),
                            read: false,
                            silent: true // Evitar bombardeo de toasts al cargar
                        })
                    }
                })
            }
        }

        loadInitialCount()
    }, [selectedBranch])

    // Suscripción Realtime
    useEffect(() => {
        if (!selectedBranch) return

        // Limpiar canal previo si existe
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
        }

        const channel = supabase
            .channel('realtime-traslados')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'traslados',
                    filter: `origen_id=eq.${selectedBranch}`
                },
                (payload) => {
                    const nuevo = payload.new
                    if (nuevo.estado !== 'SOLICITADO') return

                    // 1. Sonido 🔔
                    playNotificationSound()

                    const folioStr = String(nuevo.folio).padStart(4, '0')
                    const notifId = `transfer_req_${nuevo.id}`

                    // 2. Store: Agregar al NotificationCenter (Esto disparará el toast global)
                    useNotificationStore.getState().addNotification({
                        id: notifId,
                        type: 'TRANSFERENCIA',
                        title: 'Nueva Solicitud de Traspaso',
                        message: `Folio #${folioStr} — Te solicitan material desde sucursal origen.`,
                        link: '/transfers',
                        timestamp: nuevo.created_at || new Date().toISOString(),
                        read: false
                    })

                    // 3. Badge
                    useTransferStore.getState().incrementPendingRequests()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'traslados',
                    filter: `origen_id=eq.${selectedBranch}`
                },
                (payload) => {
                    const nuevo = payload.new
                    const viejo = payload.old
                    // Si cambió de SOLICITADO a otro estado, decrementar
                    if (viejo.estado === 'SOLICITADO' && nuevo.estado !== 'SOLICITADO') {
                        useTransferStore.getState().decrementPendingRequests()
                    }
                }
            )
            .subscribe()

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedBranch, navigate])

    return null // Componente invisible
}
