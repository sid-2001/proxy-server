const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// ----- Configuration -----
const APP_PORT = +(process.env.PORT || 3000);
const BACKEND_HOST = process.env.BACKEND_HOST || '64.227.139.142';
const BACKEND_PORT = +(process.env.BACKEND_PORT || 8000);

// ----- Express App Setup -----
const app = express();
app.use(express.json());

// Example HTTP endpoint
app.get('/', (req, res) => {
  res.send('Hello from Express over HTTP!');
});

// ----- HTTP Server -----
const httpServer = http.createServer(app);

// ----- WebSocket Proxy -----
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (clientSocket, req) => {
  console.log(`Incoming WS connection: ${req.url}`);

  // Build backend target URL (plain WS)
  const targetUrl = `ws://${BACKEND_HOST}:${BACKEND_PORT}${req.url}`;
  console.log(`Proxying WebSocket to: ${targetUrl}`);

  const targetSocket = new WebSocket(targetUrl);

  targetSocket.on('open', () => {
    // client -> backend
    clientSocket.on('message', (msg) => {
      targetSocket.send(msg);
    });

    // backend -> client
    targetSocket.on('message', (msg) => {
      clientSocket.send(msg);
    });
  });

  // Error & close handling
  const cleanup = () => {
    if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close();
    if (targetSocket.readyState === WebSocket.OPEN) targetSocket.close();
  };

  clientSocket.on('error', (err) => {
    console.error('Client error:', err.message);
    cleanup();
  });
  targetSocket.on('error', (err) => {
    console.error('Upstream error:', err.message);
    cleanup();
  });
  clientSocket.on('close', cleanup);
  targetSocket.on('close', cleanup);
});

// ----- Start Server -----
httpServer.listen(APP_PORT, () => {
  console.log(`HTTP Express server listening on port ${APP_PORT}`);
});
