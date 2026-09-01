import React from 'react';
import { MapPin, Building2 } from 'lucide-react';

export default function GymSelector({ gyms, selectedGymId, onSelectGym }) {
  const selectedGym = gyms.find((g) => g.id === selectedGymId) || gyms[0];

  return (
    <div className="bg-[#1A1A2E] p-4 rounded-xl border border-[#2E2E48] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-cyan-500/10 rounded-lg text-cyan-400">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <label htmlFor="gym-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Selected Gym Location
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-extrabold text-white">{selectedGym?.name || 'Loading gyms...'}</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" />
              {selectedGym?.city}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-80">
        <select
          id="gym-select"
          value={selectedGymId || ''}
          onChange={(e) => onSelectGym(e.target.value)}
          className="w-full bg-[#0D0D1A] text-white border border-[#2E2E48] rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition cursor-pointer"
        >
          {gyms.map((gym) => (
            <option key={gym.id} value={gym.id}>
              {gym.name} ({gym.city}) — Cap: {gym.capacity}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
