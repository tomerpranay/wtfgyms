import React from 'react';
import { Users, AlertCircle, CheckCircle, Flame } from 'lucide-react';

export default function OccupancyCard({ occupancy, capacity }) {
  const cap = capacity || 100;
  const pct = Math.min(100, Math.round((occupancy / cap) * 100));

  let colorClass = 'text-emerald-400';
  let bgGradient = 'from-emerald-500 to-teal-400';
  let badgeText = 'Normal Traffic';
  let badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

  if (pct >= 85) {
    colorClass = 'text-rose-500';
    bgGradient = 'from-rose-500 to-red-600';
    badgeText = 'Capacity Breach Risk (>85%)';
    badgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse';
  } else if (pct >= 60) {
    colorClass = 'text-amber-400';
    bgGradient = 'from-amber-400 to-orange-500';
    badgeText = 'High Traffic (60-85%)';
    badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col justify-between relative overflow-hidden">
      
      {/* Background Accent Blur */}
      <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br ${bgGradient}`}></div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Live Gym Occupancy</span>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${badgeClass}`}>
            {badgeText}
          </span>
        </div>

        <div className="flex items-baseline space-x-3 my-2">
          <span className={`text-4xl md:text-5xl font-black font-mono tracking-tight ${colorClass}`}>
            {occupancy}
          </span>
          <span className="text-xl text-slate-400 font-medium font-mono">/ {capacity} members</span>
          <span className={`text-2xl font-bold font-mono ml-auto ${colorClass}`}>{pct}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-[#0D0D1A] rounded-full h-3.5 p-0.5 border border-[#2E2E48] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${bgGradient}`}
            style={{ width: `${pct}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-2">
          <span>0</span>
          <span>60% (Moderate)</span>
          <span>85% (Critical)</span>
          <span>{capacity} Max</span>
        </div>
      </div>

    </div>
  );
}
