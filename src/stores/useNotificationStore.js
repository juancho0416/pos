// useNotificationStore.js — Estado global para el Centro de Notificaciones (Zustand)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'

export const useNotificationStore = create(
    persist(
        (set, get) => ({
            notifications: [],

            addNotification: (notification) => set((state) => {
                const newNotif = {
                    id: notification.id || (Date.now() + Math.random().toString(36).substring(7)),
                    read: false,
                    timestamp: notification.timestamp || new Date().toISOString(),
                    ...notification
                }

                // Disparar toast por cada notificación nueva (solo si no es silent flag)
                if (!notification.silent) {
                    toast(newNotif.title || 'Nueva Notificación', {
                        description: newNotif.message,
                        duration: 8000,
                        action: newNotif.link ? {
                            label: 'Ver',
                            onClick: () => window.location.href = newNotif.link
                        } : undefined
                    })
                }

                return {
                    notifications: [
                        newNotif,
                        ...state.notifications
                    ].slice(0, 100) // Keep latest 100 max
                }
            }),

            markAsRead: (id) => set((state) => ({
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, read: true } : n
                )
            })),

            markAllAsRead: () => set((state) => ({
                notifications: state.notifications.map(n => ({ ...n, read: true }))
            })),

            clearAll: () => set({ notifications: [] }),

            removeNotification: (id) => set((state) => ({
                notifications: state.notifications.filter(n => n.id !== id)
            }))
        }),
        {
            name: 'pos-notifications-storage', // Save notifications in localStorage
        }
    )
)
