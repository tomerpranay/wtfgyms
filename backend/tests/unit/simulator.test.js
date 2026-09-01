const simulatorService = require('../../src/services/simulatorService');

describe('Simulator Service Unit Tests', () => {

  afterEach(() => {
    simulatorService.stopSimulation();
  });

  test('Simulator initializes in paused state', () => {
    const status = simulatorService.getSimulationStatus();
    expect(status.status).toBe('paused');
  });

  test('Simulator starts at specified speed (1x, 5x, 10x)', () => {
    const status1 = simulatorService.startSimulation(1);
    expect(status1.status).toBe('running');
    expect(status1.speed).toBe(1);

    const status5 = simulatorService.startSimulation(5);
    expect(status5.status).toBe('running');
    expect(status5.speed).toBe(5);

    const status10 = simulatorService.startSimulation(10);
    expect(status10.status).toBe('running');
    expect(status10.speed).toBe(10);
  });

  test('Simulator stops and reverts to paused state', () => {
    simulatorService.startSimulation(5);
    const status = simulatorService.stopSimulation();
    expect(status.status).toBe('paused');
  });

});
