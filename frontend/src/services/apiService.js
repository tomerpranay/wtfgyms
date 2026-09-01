const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJson(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    const error = new Error(data.error || `HTTP error ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data.data;
}

export const api = {
  getGyms: () => fetchJson('/api/gyms'),
  getGymLive: (id) => fetchJson(`/api/gyms/${id}/live`),
  getGymAnalytics: (id, dateRange = '30d') => fetchJson(`/api/gyms/${id}/analytics?dateRange=${dateRange}`),
  getCrossGymRevenue: () => fetchJson('/api/analytics/cross-gym'),
  getAnomalies: (gymId = '', severity = '') => {
    const params = new URLSearchParams();
    if (gymId) params.append('gym_id', gymId);
    if (severity) params.append('severity', severity);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson(`/api/anomalies${query}`);
  },
  dismissAnomaly: (id) => fetchJson(`/api/anomalies/${id}/dismiss`, { method: 'PATCH' }),
  startSimulator: (speed = 1) => fetchJson('/api/simulator/start', { method: 'POST', body: JSON.stringify({ speed }) }),
  stopSimulator: () => fetchJson('/api/simulator/stop', { method: 'POST' }),
  resetSimulator: () => fetchJson('/api/simulator/reset', { method: 'POST' }),
  getSimulatorStatus: () => fetchJson('/api/simulator/status'),
};
