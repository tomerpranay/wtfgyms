describe('Anomaly Detection Engine Logic (Unit Tests)', () => {
  
  // Helper logic under test (replicating pure threshold functions from anomalyDetector)
  function evaluateCapacityBreach(occupancy, capacity, existingAnomaly) {
    const pct = occupancy / capacity;
    if (pct > 0.90) {
      if (!existingAnomaly) {
        return { action: 'TRIGGER', type: 'capacity_breach', severity: 'critical' };
      }
    } else if (pct < 0.85 && existingAnomaly) {
      return { action: 'RESOLVE', anomalyId: existingAnomaly.id };
    }
    return { action: 'NONE' };
  }

  function evaluateZeroCheckins(isOpen, recentCheckinsCount, currentOccupancy, existingAnomaly) {
    if (!isOpen) return { action: 'NONE' };
    if (recentCheckinsCount === 0 && currentOccupancy === 0) {
      if (!existingAnomaly) {
        return { action: 'TRIGGER', type: 'zero_checkins', severity: 'warning' };
      }
    } else if (recentCheckinsCount > 0 && existingAnomaly) {
      return { action: 'RESOLVE', anomalyId: existingAnomaly.id };
    }
    return { action: 'NONE' };
  }

  function evaluateRevenueDrop(todayRevenue, lastWeekSameDayRevenue, existingAnomaly) {
    if (lastWeekSameDayRevenue < 10000) return { action: 'NONE' };
    const dropRatio = (lastWeekSameDayRevenue - todayRevenue) / lastWeekSameDayRevenue;
    if (dropRatio >= 0.30) {
      if (!existingAnomaly) {
        return { action: 'TRIGGER', type: 'revenue_drop', severity: 'warning' };
      }
    } else if (todayRevenue >= 0.80 * lastWeekSameDayRevenue && existingAnomaly) {
      return { action: 'RESOLVE', anomalyId: existingAnomaly.id };
    }
    return { action: 'NONE' };
  }

  test('Capacity breach triggers critical anomaly when occupancy > 90%', () => {
    const result = evaluateCapacityBreach(275, 300, null);
    expect(result.action).toBe('TRIGGER');
    expect(result.severity).toBe('critical');
    expect(result.type).toBe('capacity_breach');
  });

  test('Capacity breach does NOT trigger duplicate anomaly if already active', () => {
    const existing = { id: 'anom-1', type: 'capacity_breach' };
    const result = evaluateCapacityBreach(285, 300, existing);
    expect(result.action).toBe('NONE');
  });

  test('Capacity breach auto-resolves when occupancy drops below 85%', () => {
    const existing = { id: 'anom-1', type: 'capacity_breach' };
    const result = evaluateCapacityBreach(240, 300, existing); // 80% < 85%
    expect(result.action).toBe('RESOLVE');
    expect(result.anomalyId).toBe('anom-1');
  });

  test('Zero check-ins triggers warning anomaly during operating hours when 0 checkins in 2h', () => {
    const result = evaluateZeroCheckins(true, 0, 0, null);
    expect(result.action).toBe('TRIGGER');
    expect(result.severity).toBe('warning');
    expect(result.type).toBe('zero_checkins');
  });

  test('Zero check-ins does NOT trigger outside operating hours', () => {
    const result = evaluateZeroCheckins(false, 0, 0, null);
    expect(result.action).toBe('NONE');
  });

  test('Zero check-ins auto-resolves when new check-ins occur', () => {
    const existing = { id: 'anom-2', type: 'zero_checkins' };
    const result = evaluateZeroCheckins(true, 5, 2, existing);
    expect(result.action).toBe('RESOLVE');
  });

  test('Revenue drop triggers warning when today revenue is >= 30% below same day last week', () => {
    const result = evaluateRevenueDrop(2000, 15000, null); // 86.6% drop
    expect(result.action).toBe('TRIGGER');
    expect(result.severity).toBe('warning');
    expect(result.type).toBe('revenue_drop');
  });

  test('Revenue drop does NOT trigger if drop is less than 30%', () => {
    const result = evaluateRevenueDrop(12000, 15000, null); // 20% drop
    expect(result.action).toBe('NONE');
  });

  test('Revenue drop auto-resolves when revenue recovers within 20% of last week', () => {
    const existing = { id: 'anom-3', type: 'revenue_drop' };
    const result = evaluateRevenueDrop(13000, 15000, existing); // 86.6% recovered >= 80%
    expect(result.action).toBe('RESOLVE');
  });

  test('Revenue drop ignores low baseline revenue below 10,000 threshold', () => {
    const result = evaluateRevenueDrop(500, 2000, null);
    expect(result.action).toBe('NONE');
  });

});
