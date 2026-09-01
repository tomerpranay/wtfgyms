import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import GymSelector from './components/GymSelector';
import OccupancyCard from './components/OccupancyCard';
import RevenueCard from './components/RevenueCard';
import ActivityFeed from './components/ActivityFeed';
import PeakHoursHeatmap from './components/PeakHoursHeatmap';
import RevenuePlanChart from './components/RevenuePlanChart';
import ChurnRiskTable from './components/ChurnRiskTable';
import NewRenewalChart from './components/NewRenewalChart';
import CrossGymRevenueChart from './components/CrossGymRevenueChart';
import AnomalyLog from './components/AnomalyLog';
import SimulatorControls from './components/SimulatorControls';
import ToastNotification from './components/ToastNotification';
import { useWebSocket } from './hooks/useWebSocket';
import { api } from './services/apiService';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [gyms, setGyms] = useState([]);
  const [selectedGymId, setSelectedGymId] = useState('');
  const [gymLive, setGymLive] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState('30d');
  const [crossGymData, setCrossGymData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [activityEvents, setActivityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Global summary metrics
  const [totalOccupancy, setTotalOccupancy] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Fetch initial gym list
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allGyms = await api.getGyms();
      setGyms(allGyms);

      if (allGyms.length > 0) {
        const defaultGym = allGyms[0];
        setSelectedGymId(defaultGym.id);

        const liveData = await api.getGymLive(defaultGym.id);
        setGymLive(liveData);

        const analyticsData = await api.getGymAnalytics(defaultGym.id, dateRange);
        setAnalytics(analyticsData);
      }

      const crossData = await api.getCrossGymRevenue();
      setCrossGymData(crossData);

      const activeAnomalies = await api.getAnomalies();
      setAnomalies(activeAnomalies);

      // Compute global summary totals
      const totalOcc = allGyms.reduce((sum, g) => sum + (parseInt(g.current_occupancy, 10) || 0), 0);
      const totalRev = allGyms.reduce((sum, g) => sum + (parseFloat(g.today_revenue) || 0), 0);
      setTotalOccupancy(totalOcc);
      setTotalRevenue(totalRev);
    } catch (err) {
      console.error('Error initializing dashboard data:', err);
      setError('Failed to connect to backend server. Make sure Node.js backend is running.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Gym switching
  const handleGymChange = async (gymId) => {
    setSelectedGymId(gymId);
    try {
      const liveData = await api.getGymLive(gymId);
      setGymLive(liveData);

      const analyticsData = await api.getGymAnalytics(gymId, dateRange);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error(`Failed to load data for gym ${gymId}:`, err);
    }
  };

  // Handle Date range filter change
  const handleDateRangeChange = async (range) => {
    setDateRange(range);
    if (selectedGymId) {
      try {
        const analyticsData = await api.getGymAnalytics(selectedGymId, range);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Failed to update date range analytics:', err);
      }
    }
  };

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((evt) => {
    if (!evt || !evt.type) return;

    if (evt.type === 'CHECKIN_EVENT' || evt.type === 'CHECKOUT_EVENT' || evt.type === 'PAYMENT_EVENT') {
      // Add event to live activity feed
      setActivityEvents((prev) => [evt, ...prev.slice(0, 29)]);

      // If matching selected gym, update live snapshot
      if (evt.gym_id === selectedGymId) {
        setGymLive((prev) => {
          if (!prev) return prev;
          if (evt.type === 'CHECKIN_EVENT' || evt.type === 'CHECKOUT_EVENT') {
            return {
              ...prev,
              current_occupancy: evt.current_occupancy,
              capacity_pct: evt.capacity_pct
            };
          } else if (evt.type === 'PAYMENT_EVENT') {
            return {
              ...prev,
              today_revenue: evt.today_total
            };
          }
          return prev;
        });
      }

      // Update global summary counts
      if (evt.type === 'CHECKIN_EVENT') setTotalOccupancy((prev) => prev + 1);
      else if (evt.type === 'CHECKOUT_EVENT') setTotalOccupancy((prev) => Math.max(0, prev - 1));
      else if (evt.type === 'PAYMENT_EVENT') setTotalRevenue((prev) => prev + (evt.amount || 0));

    } else if (evt.type === 'ANOMALY_DETECTED') {
      const newAnomaly = {
        id: evt.anomaly_id,
        gym_id: evt.gym_id,
        gym_name: evt.gym_name,
        type: evt.anomaly_type,
        severity: evt.severity,
        message: evt.message,
        detected_at: evt.detected_at,
        resolved: false,
        dismissed: false
      };
      setAnomalies((prev) => [newAnomaly, ...prev.filter((a) => a.id !== evt.anomaly_id)]);
      setToast({ severity: evt.severity, gym_name: evt.gym_name, message: evt.message });
    } else if (evt.type === 'ANOMALY_RESOLVED') {
      setAnomalies((prev) => prev.map((a) => a.id === evt.anomaly_id ? { ...a, resolved: true } : a));
    }
  }, [selectedGymId]);

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  const activeAnomalies = anomalies.filter((a) => !a.resolved);

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-slate-100 flex flex-col font-sans">
      
      {/* Header Bar */}
      <Header
        isConnected={isConnected}
        totalOccupancy={totalOccupancy}
        totalRevenue={totalRevenue}
        activeAnomalyCount={activeAnomalies.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadInitialData}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
            </button>
          </div>
        )}

        {/* Module 4: Simulator Controls */}
        <SimulatorControls />

        {/* Gym Selector Bar */}
        <GymSelector
          gyms={gyms}
          selectedGymId={selectedGymId}
          onSelectGym={handleGymChange}
        />

        {/* Module 1: Live Dashboard Widgets */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <OccupancyCard
            occupancy={gymLive ? gymLive.current_occupancy : 0}
            capacity={gymLive && gymLive.gym ? gymLive.gym.capacity : 100}
          />
          <RevenueCard
            revenue={gymLive ? gymLive.today_revenue : 0}
          />
          <ActivityFeed
            events={activityEvents}
          />
        </section>

        {/* Module 3: Live Anomaly Engine Log */}
        <section>
          <AnomalyLog
            anomalies={anomalies}
            onAnomalyDismissed={(id) => setAnomalies((prev) => prev.filter((a) => a.id !== id))}
          />
        </section>

        {/* Module 2: Analytics Engine */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#2E2E48]">
            <h2 className="text-xl font-extrabold text-white tracking-tight">Analytics & Intelligence Engine</h2>
            <span className="text-xs text-slate-400 font-mono">7d / 30d / 90d Historical Intelligence</span>
          </div>

          {/* 7-Day Peak-Hours Heatmap */}
          <PeakHoursHeatmap
            heatmapData={analytics ? analytics.peak_hours_heatmap : []}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenuePlanChart
              planData={analytics ? analytics.revenue_by_plan : []}
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
            <NewRenewalChart
              ratioData={analytics ? analytics.member_ratio : []}
            />
          </div>

          {/* Bottom Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChurnRiskTable
              churnMembers={analytics ? analytics.churn_risk_members : []}
            />
            <CrossGymRevenueChart
              crossGymData={crossGymData}
            />
          </div>
        </section>

      </main>

      {/* Real-Time Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />

      {/* Footer */}
      <footer className="bg-[#1A1A2E] border-t border-[#2E2E48] py-4 px-6 text-center text-xs text-slate-500 font-mono mt-12">
        WTF Gyms Engineering Division • LivePulse Production Engine v1.0 • Node.js + PostgreSQL 15 + React 18
      </footer>

    </div>
  );
}
