import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ShieldAlert, Bell, Info } from 'lucide-react';
import { api } from '../services/apiService';

export default function AnomalyLog({ anomalies, onAnomalyDismissed }) {
  const [errorMsg, setErrorMsg] = useState('');
  const [dismissingId, setDismissingId] = useState(null);

  const handleDismiss = async (anomaly) => {
    setErrorMsg('');
    if (anomaly.severity === 'critical') {
      setErrorMsg('Critical anomalies cannot be manually dismissed. They will auto-resolve when conditions clear.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      setDismissingId(anomaly.id);
      await api.dismissAnomaly(anomaly.id);
      if (onAnomalyDismissed) onAnomalyDismissed(anomaly.id);
    } catch (err) {
      if (err.status === 403) {
        setErrorMsg('HTTP 403: Critical anomalies cannot be manually dismissed');
      } else {
        setErrorMsg(err.message || 'Failed to dismiss anomaly');
      }
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setDismissingId(null);
    }
  };

  const activeAnomalies = (anomalies || []).filter((a) => !a.resolved);

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col h-[480px]">
      <div className="flex items-center justify-between pb-4 border-b border-[#2E2E48] mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Live Anomaly Engine</h3>
            <p className="text-xs text-slate-400">Automated background detector running every 30s</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            {activeAnomalies.length} Active Anomalies
          </span>
        </div>
      </div>

      {/* Error / 403 Toast Banner */}
      {errorMsg && (
        <div className="mb-3 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        {activeAnomalies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <CheckCircle className="w-10 h-10 text-emerald-400 opacity-50 mb-2" />
            <span className="font-semibold text-slate-300">All Gym Systems Normal</span>
            <span className="text-slate-500 text-[11px] mt-1">No unresolved capacity breaches, revenue drops, or zero check-in alerts</span>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-[#1A1A2E] border-b border-[#2E2E48]">
              <tr>
                <th className="py-2.5 px-3 text-slate-400 font-semibold">Gym Location</th>
                <th className="py-2.5 px-3 text-slate-400 font-semibold">Anomaly Type</th>
                <th className="py-2.5 px-3 text-slate-400 font-semibold">Severity</th>
                <th className="py-2.5 px-3 text-slate-400 font-semibold">Detected At</th>
                <th className="py-2.5 px-3 text-slate-400 font-semibold">Details</th>
                <th className="py-2.5 px-3 text-slate-400 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E48]/60">
              {activeAnomalies.map((a) => {
                const isCritical = a.severity === 'critical';
                const timeStr = a.detected_at
                  ? new Date(a.detected_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Just now';

                return (
                  <tr key={a.id} className="hover:bg-[#0D0D1A] transition">
                    <td className="py-3 px-3 font-bold text-white">{a.gym_name || 'Gym'}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-cyan-300 uppercase text-[11px]">{a.type}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{timeStr}</td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={a.message}>
                      {a.message}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDismiss(a)}
                        disabled={dismissingId === a.id || a.dismissed}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          isCritical
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                        }`}
                        title={isCritical ? 'Critical anomalies cannot be manually dismissed (403 Forbidden)' : 'Dismiss Warning'}
                      >
                        {a.dismissed ? 'Dismissed' : isCritical ? 'Locked' : 'Dismiss'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="pt-3 border-t border-[#2E2E48] text-[11px] text-slate-400 font-mono flex justify-between">
        <span>Warning anomalies can be manually dismissed • Critical anomalies auto-resolve on condition clearance</span>
        <span>24h Retention Log</span>
      </div>
    </div>
  );
}
