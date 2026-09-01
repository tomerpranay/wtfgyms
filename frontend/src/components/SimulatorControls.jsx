import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Zap, Sliders } from 'lucide-react';
import { api } from '../services/apiService';

export default function SimulatorControls({ onSimulatorEvent }) {
  const [status, setStatus] = useState('paused'); // 'running' | 'paused'
  const [speed, setSpeed] = useState(1); // 1 | 5 | 10
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await api.getSimulatorStatus();
      setStatus(data.status);
      setSpeed(data.speed);
    } catch (err) {
      console.error('Failed to fetch simulator status:', err);
    }
  };

  const handleStart = async (selectedSpeed) => {
    try {
      setLoading(true);
      const data = await api.startSimulator(selectedSpeed);
      setStatus(data.status);
      setSpeed(data.speed);
    } catch (err) {
      console.error('Failed to start simulator:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setLoading(true);
      const data = await api.stopSimulator();
      setStatus(data.status);
    } catch (err) {
      console.error('Failed to pause simulator:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      await api.resetSimulator();
      setStatus('paused');
    } catch (err) {
      console.error('Failed to reset simulator:', err);
    } finally {
      setLoading(false);
    }
  };

  const isRunning = status === 'running';

  return (
    <div className="bg-[#1A1A2E] p-6 rounded-xl border border-[#2E2E48] shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
      
      {/* Status Indicator */}
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-cyan-500/10 rounded-lg text-cyan-400">
          <Sliders className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Data Simulation Engine</div>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-400 pulse-green' : 'bg-slate-500'}`}></span>
            <span className="text-lg font-extrabold text-white font-mono uppercase">
              {isRunning ? `● Simulator Running (${speed}x)` : '● Simulator Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Play/Pause Button */}
        {isRunning ? (
          <button
            onClick={handlePause}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Pause className="w-4 h-4 fill-slate-950" />
            <span>Pause Stream</span>
          </button>
        ) : (
          <button
            onClick={() => handleStart(speed)}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Start Live Stream</span>
          </button>
        )}

        {/* Speed Selector */}
        <div className="flex items-center space-x-1 bg-[#0D0D1A] p-1 rounded-xl border border-[#2E2E48]">
          <span className="text-[11px] font-mono font-bold text-slate-400 px-2 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> Speed:
          </span>
          {[1, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => isRunning ? handleStart(s) : setSpeed(s)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                speed === s
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          disabled={loading}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Baseline</span>
        </button>

      </div>

    </div>
  );
}
