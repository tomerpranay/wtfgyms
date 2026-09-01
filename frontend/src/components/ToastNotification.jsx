import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ToastNotification({ toast, onClose }) {
  if (!toast) return null;

  const isCritical = toast.severity === 'critical';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-[#1A1A2E] border border-rose-500/40 rounded-xl p-4 shadow-2xl shadow-rose-500/20 animate-bounce flex items-start space-x-3">
      <div className={`p-2.5 rounded-lg ${isCritical ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-amber-500/20 text-amber-400'}`}>
        <AlertTriangle className="w-6 h-6" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded ${isCritical ? 'bg-rose-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}>
            {toast.severity || 'WARNING'} ANOMALY
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h4 className="text-sm font-bold text-white mt-1">{toast.gym_name || 'Gym Location'}</h4>
        <p className="text-xs text-slate-300 mt-1">{toast.message}</p>
      </div>
    </div>
  );
}
