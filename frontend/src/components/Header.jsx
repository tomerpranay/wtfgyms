import React from 'react';
import { Activity, AlertTriangle, DollarSign, Users, Radio } from 'lucide-react';

export default function Header({ isConnected, totalOccupancy, totalRevenue, activeAnomalyCount }) {
  return (
    <header className="bg-[#1A1A2E] border-b border-[#2E2E48] px-6 py-4 sticky top-0 z-40 shadow-xl">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Connection Status */}
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 p-2.5 rounded-xl shadow-lg shadow-cyan-500/20">
            <Activity className="w-7 h-7 text-slate-950 font-extrabold" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black tracking-tight text-white font-sans">
                WTF <span className="text-cyan-400">LivePulse</span>
              </h1>
              <div className="flex items-center space-x-1.5 bg-[#0D0D1A] px-3 py-1 rounded-full border border-[#2E2E48]">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 pulse-green' : 'bg-red-500 pulse-red'}`}></span>
                <span className="text-xs font-mono font-medium text-slate-300">
                  {isConnected ? 'LIVE WS' : 'DISCONNECTED'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Real-Time Multi-Gym Intelligence Engine</p>
          </div>
        </div>

        {/* Global Summary Strip */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 bg-[#0D0D1A] px-5 py-2.5 rounded-xl border border-[#2E2E48]">
          
          {/* Total Occupancy */}
          <div className="flex items-center space-x-3 pr-4 border-r border-[#2E2E48]">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Live Occupancy</div>
              <div className="text-lg font-bold text-white font-mono">{totalOccupancy.toLocaleString()} members</div>
            </div>
          </div>

          {/* Today Revenue */}
          <div className="flex items-center space-x-3 px-4 border-r border-[#2E2E48]">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Today Revenue</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">₹{totalRevenue.toLocaleString()}</div>
            </div>
          </div>

          {/* Active Anomalies */}
          <div className="flex items-center space-x-3 pl-4">
            <div className={`p-2 rounded-lg ${activeAnomalyCount > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Anomalies</div>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold font-mono ${activeAnomalyCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {activeAnomalyCount}
                </span>
                {activeAnomalyCount > 0 && (
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-semibold">ACTION NEEDED</span>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
