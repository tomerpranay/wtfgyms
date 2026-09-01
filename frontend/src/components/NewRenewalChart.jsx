import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#00F2FE', '#00E676'];

export default function NewRenewalChart({ ratioData }) {
  const data = (ratioData || []).map((row) => ({
    name: row.member_type ? row.member_type.toUpperCase() : 'OTHER',
    value: parseInt(row.count, 10) || 0
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col justify-between h-[400px]">
      <div className="flex items-center space-x-2 pb-4 border-b border-[#2E2E48] mb-2">
        <PieIcon className="w-5 h-5 text-cyan-400" />
        <h3 className="text-base font-bold text-white uppercase tracking-wider">New vs Renewal Ratio</h3>
      </div>

      <div className="h-64 w-full relative">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            No member distribution data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#1A1A2E" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0D0D1A', borderColor: '#2E2E48', borderRadius: '8px', color: '#fff' }}
                formatter={(val) => [`${val} members (${total > 0 ? Math.round((val/total)*100) : 0}%)`, 'Count']}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pt-3 border-t border-[#2E2E48] flex justify-between text-xs text-slate-400 font-mono">
        <span>Total Base: <strong className="text-white font-bold">{total}</strong> members</span>
        <span>Ratio: {data[0] && total > 0 ? Math.round((data[0].value/total)*100) : 0}% New</span>
      </div>
    </div>
  );
}
