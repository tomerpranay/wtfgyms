import React from 'react';
import { UserX, AlertCircle, ShieldAlert } from 'lucide-react';

export default function ChurnRiskTable({ churnMembers }) {
  const members = (churnMembers || []).slice(0, 10);

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col h-[400px]">
      <div className="flex items-center justify-between pb-4 border-b border-[#2E2E48] mb-4">
        <div className="flex items-center space-x-2">
          <UserX className="w-5 h-5 text-rose-400" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Churn Risk Radar</h3>
        </div>
        <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-full font-mono font-semibold">
          {churnMembers ? churnMembers.length : 0} At Risk
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {members.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <ShieldAlert className="w-8 h-8 text-emerald-400 opacity-60 mb-2" />
            <span>No members currently at churn risk for this gym location</span>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-[#1A1A2E] border-b border-[#2E2E48]">
              <tr>
                <th className="py-2 px-3 text-slate-400 font-semibold">Member</th>
                <th className="py-2 px-3 text-slate-400 font-semibold">Plan</th>
                <th className="py-2 px-3 text-slate-400 font-semibold">Last Check-in</th>
                <th className="py-2 px-3 text-slate-400 font-semibold text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E48]/60">
              {members.map((m) => {
                const isCritical = m.risk_level === 'CRITICAL';
                const days = m.days_since_last_checkin || 0;
                const lastDate = m.last_checkin_at ? new Date(m.last_checkin_at).toLocaleDateString() : 'N/A';

                return (
                  <tr key={m.id} className="hover:bg-[#0D0D1A] transition">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      <div>{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.email}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 uppercase font-mono">{m.plan_type}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {lastDate} ({days}d ago)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        }`}
                      >
                        <AlertCircle className="w-3 h-3" />
                        {m.risk_level} ({days}d)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="pt-3 border-t border-[#2E2E48] text-[11px] text-slate-400 font-mono">
        <span>High: 45–60 days inactive • Critical: 60+ days inactive</span>
      </div>
    </div>
  );
}
