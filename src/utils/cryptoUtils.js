// cryptoUtils.js
// Utilidad para crear Hashes SHA-256 de contraseñas de forma local (Offline Vault)

export async function hashPassword(password) {
    try {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
            console.warn("⚠️ crypto.subtle no está disponible. Usando fallback básico de hash.");
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16).padStart(64, '0');
        }
    } catch (e) {
        console.error("Error catastrofico en hashPassword:", e);
        // Retornar un hash estático temporal como último recurso para evitar crashes mudos
        return "fallback_hash_" + password.length;
    }
}
