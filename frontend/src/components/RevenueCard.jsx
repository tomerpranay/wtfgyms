import React from 'react';
import { IndianRupee, TrendingUp, CreditCard } from 'lucide-react';

export default function RevenueCard({ revenue }) {
  const formattedRevenue = (revenue || 0).toLocaleString('en-IN');

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col justify-between relative overflow-hidden">
      
      {/* Background Accent */}
      <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full opacity-10 blur-2xl bg-cyan-400"></div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Today's Total Revenue</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Live Ticker
          </span>
        </div>

        <div className="flex items-baseline space-x-1 my-2">
          <span className="text-3xl font-extrabold text-emerald-400 font-mono">₹</span>
          <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tight transition-all duration-300">
            {formattedRevenue}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#2E2E48]/60 flex items-center justify-between text-xs text-slate-400">
        <span>Updates in real time via payments</span>
        <span className="font-mono font-semibold text-cyan-400">INR (₹)</span>
      </div>

    </div>
  );
}
