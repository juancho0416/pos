// supabaseClient.js
// ★ CRITICAL FIX: Supabase v2 usa navigator.locks por defecto.
// Chrome corrompe el Web Lock Manager, causando timeout de 10s.
// Solución: usar processLock (lock en memoria, sin navigator.locks)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ★ No-op lock: bypasea por completo el Navigator LockManager de Chrome
// Firma requerida: async (name: string, acquireTimeout: number, fn: () => Promise) => Promise
const noOpLock = async (_name, _acquireTimeout, fn) => {
    return await fn()
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // ★★★ BYPASS del Navigator LockManager de Chrome ★★★
        lock: noOpLock,
        storageKey: 'sb-auth-token',
        storage: window.localStorage,
    }
})