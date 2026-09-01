import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(onMessageCallback) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const callbackRef = useRef(onMessageCallback);

  useEffect(() => {
    callbackRef.current = onMessageCallback;
  }, [onMessageCallback]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.hostname}:5000`;
    const wsUrl = `${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (callbackRef.current) {
            callbackRef.current(data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 3 seconds
        setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (err) {
      setIsConnected(false);
      setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
}
