const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

function initWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
        }
      } catch (err) {
        // ignore non-json
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    // Send connection ACK
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WTF LivePulse WebSocket Connected', timestamp: new Date().toISOString() }));
  });

  // Ping interval for connection health check
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

function broadcast(payload) {
  if (!wss) return;
  const messageStr = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function getConnectedClientCount() {
  if (!wss) return 0;
  return wss.clients.size;
}

module.exports = {
  initWebSocketServer,
  broadcast,
  getConnectedClientCount
};
