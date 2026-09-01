import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CreditCard, Calendar } from 'lucide-react';

const COLORS = {
  monthly: '#00F2FE',
  quarterly: '#00E676',
  annual: '#FFA502'
};

export default function RevenuePlanChart({ planData, dateRange, onDateRangeChange }) {
  const chartData = (planData || []).map((row) => ({
    name: row.plan_type ? row.plan_type.toUpperCase() : 'UNKNOWN',
    typeKey: row.plan_type,
    revenue: parseFloat(row.total_revenue) || 0,
    count: parseInt(row.payment_count, 10) || 0
  }));

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-[#2E2E48] mb-4">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Revenue by Plan</h3>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center space-x-1 bg-[#0D0D1A] p-1 rounded-lg border border-[#2E2E48]">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => onDateRangeChange(range)}
              className={`px-2.5 py-1 text-xs font-semibold rounded font-mono transition-all ${
                dateRange === range
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            No revenue recorded for selected date range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0D0D1A', borderColor: '#2E2E48', borderRadius: '8px', color: '#fff' }}
                formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.typeKey] || '#00F2FE'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pt-3 border-t border-[#2E2E48] flex justify-between text-xs text-slate-400 font-mono">
        <span>Total: <strong className="text-white font-bold">₹{totalRevenue.toLocaleString()}</strong></span>
        <span>{chartData.reduce((acc, c) => acc + c.count, 0)} Payments</span>
      </div>
    </div>
  );
}
