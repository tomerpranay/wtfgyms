import React from 'react';
import { LogIn, LogOut, CreditCard, Clock, Activity } from 'lucide-react';

export default function ActivityFeed({ events }) {
  const latestEvents = (events || []).slice(0, 20);

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col h-[480px]">
      <div className="flex items-center justify-between pb-4 border-b border-[#2E2E48] mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Live Activity Feed</h3>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono">
          {latestEvents.length} Events
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
        {latestEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Clock className="w-10 h-10 mb-2 opacity-40 text-slate-500" />
            <p className="text-sm font-medium">No recent events recorded</p>
            <p className="text-xs text-slate-500">Start the simulator to stream live check-ins</p>
          </div>
        ) : (
          latestEvents.map((evt, idx) => {
            const isCheckin = evt.type === 'CHECKIN_EVENT' || evt.type === 'checkin';
            const isCheckout = evt.type === 'CHECKOUT_EVENT' || evt.type === 'checkout';
            const isPayment = evt.type === 'PAYMENT_EVENT' || evt.type === 'payment';

            const date = evt.timestamp ? new Date(evt.timestamp) : new Date();
            const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div
                key={evt.id || idx}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0D0D1A] border border-[#2E2E48]/80 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center space-x-3">
                  {isCheckin && (
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <LogIn className="w-4 h-4" />
                    </div>
                  )}
                  {isCheckout && (
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <LogOut className="w-4 h-4" />
                    </div>
                  )}
                  {isPayment && (
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  )}

                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>{evt.member_name || 'Anonymous Member'}</span>
                      <span className="text-xs font-normal text-slate-400">• {evt.gym_name || 'Gym Location'}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {isCheckin && `Checked In (Occupancy: ${evt.current_occupancy || 0})`}
                      {isCheckout && `Checked Out (Occupancy: ${evt.current_occupancy || 0})`}
                      {isPayment && `Paid ₹${(evt.amount || 0).toLocaleString()} (${evt.plan_type || 'plan'})`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400 block">{timeStr}</span>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    isCheckin ? 'bg-emerald-500/20 text-emerald-400' : 
                    isCheckout ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {isCheckin ? 'CHECKIN' : isCheckout ? 'CHECKOUT' : 'PAYMENT'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
