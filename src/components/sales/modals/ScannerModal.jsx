import { X } from 'lucide-react'

export default function ScannerModal({ showScanner, setShowScanner }) {
    if (!showScanner) return null

    return (
        <div className="fixed inset-0 bg-black/90 z-[999999] flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-300">
                <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20} /></button>
                <h3 className="font-black uppercase tracking-tighter text-center mb-6 text-xl">Escáner</h3>
                <div id="reader" className="overflow-hidden rounded-2xl border-4 border-slate-100 aspect-square"></div>
                <p className="text-center mt-4 font-bold text-slate-400">Apunta la cámara al código</p>
            </div>
        </div>
    )
}
