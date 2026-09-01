import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, TrendingUp } from 'lucide-react';

export default function CrossGymRevenueChart({ crossGymData }) {
  const data = (crossGymData || []).map((row) => ({
    id: row.gym_id,
    name: row.gym_name ? row.gym_name.replace('WTF Gyms — ', '') : 'Gym',
    revenue: parseFloat(row.total_revenue) || 0,
    rank: parseInt(row.rank, 10) || 0,
    city: row.city
  }));

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-[#2E2E48] mb-4">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Cross-Gym 30-Day Revenue Ranking</h3>
        </div>
        <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-mono font-semibold flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          All 10 Locations
        </span>
      </div>

      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            Loading cross-gym revenue benchmarks...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <XAxis type="number" stroke="#64748B" fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" stroke="#E2E8F0" fontSize={11} tickLine={false} width={110} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0D0D1A', borderColor: '#2E2E48', borderRadius: '8px', color: '#fff' }}
                formatter={(val, name, item) => [`₹${Number(val).toLocaleString()}`, `Rank #${item.payload.rank} (${item.payload.city})`]}
              />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#00E676' : index < 3 ? '#00F2FE' : '#3B82F6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pt-3 border-t border-[#2E2E48] text-xs text-slate-400 font-mono flex justify-between">
        <span>#1 Top Performer: <strong className="text-emerald-400">{data[0]?.name || 'N/A'}</strong> (₹{data[0]?.revenue.toLocaleString()})</span>
        <span>Target SQL Query &lt; 2ms</span>
      </div>
    </div>
  );
}
