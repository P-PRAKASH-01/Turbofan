# Frontend API & Streaming Services

Network clients and data services:
- `apiClient.ts`: Axios/Fetch client for REST endpoints (`/api/v1/scenarios`, `/api/v1/engines`)
- `websocketClient.ts`: WebSocket client for live telemetry streaming with auto-reconnect
- `telemetryBuffer.ts`: Ring buffer for high-frequency chart rendering and FPS throttling
