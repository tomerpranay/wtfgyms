import React from 'react';
import { Calendar, Info } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export default function PeakHoursHeatmap({ heatmapData }) {
  // Create a fast lookup map: `dow-hour` -> checkin_count
  const countMap = {};
  let maxCount = 1;

  (heatmapData || []).forEach((row) => {
    const key = `${row.day_of_week}-${row.hour_of_day}`;
    const count = parseInt(row.checkin_count, 10) || 0;
    countMap[key] = count;
    if (count > maxCount) maxCount = count;
  });

  const getHeatmapColor = (count) => {
    if (!count || count === 0) return 'bg-[#0D0D1A] text-slate-600 border-[#2E2E48]/40';
    const ratio = count / maxCount;
    if (ratio < 0.25) return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40';
    if (ratio < 0.50) return 'bg-cyan-700/60 text-cyan-100 border-cyan-600/50';
    if (ratio < 0.75) return 'bg-emerald-600/80 text-white font-bold border-emerald-500/60';
    return 'bg-rose-600 text-white font-black border-rose-500 shadow-md shadow-rose-600/30 animate-pulse';
  };

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#2E2E48] mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">7-Day Peak-Hours Heatmap</h3>
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span>Density:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-[#0D0D1A] border border-[#2E2E48]"></span>
            <span>Low</span>
            <span className="w-3 h-3 rounded bg-cyan-700"></span>
            <span>Med</span>
            <span className="w-3 h-3 rounded bg-emerald-600"></span>
            <span>High</span>
            <span className="w-3 h-3 rounded bg-rose-600"></span>
            <span>Peak</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-400 font-semibold w-16">Day</th>
              {HOURS.map((h) => (
                <th key={h} className="p-1.5 text-center text-slate-400 font-mono text-[11px]">
                  {h < 10 ? `0${h}` : h}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((dayName, dowIndex) => (
              <tr key={dayName} className="border-t border-[#2E2E48]/50">
                <td className="p-2 font-bold text-slate-300 font-mono uppercase">{dayName}</td>
                {HOURS.map((hour) => {
                  const count = countMap[`${dowIndex}-${hour}`] || 0;
                  const colorClass = getHeatmapColor(count);
                  return (
                    <td key={hour} className="p-1 text-center">
                      <div
                        title={`${dayName} at ${hour}:00 — ${count} check-ins`}
                        className={`py-2 px-1 rounded border transition-all text-[11px] font-mono cursor-pointer ${colorClass}`}
                      >
                        {count > 0 ? count : '•'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5 text-cyan-400" />
        <span>Powered by PostgreSQL materialized view <code>gym_hourly_stats</code></span>
      </div>
    </div>
  );
}
