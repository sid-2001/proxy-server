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

  const targetUrl = `ws://${BACKEND_HOST}:${BACKEND_PORT}${req.url}`;
  console.log(`Proxying WebSocket to: ${targetUrl}`);

  const targetSocket = new WebSocket(targetUrl);

  targetSocket.on('open', () => {
    console.log(`Connected to backend WS: ${targetUrl}`);

    // client -> backend
    clientSocket.on('message', (msg) => {
      console.log(`[Client -> Backend] ${msg}`);
      targetSocket.send(msg);
    });

    // backend -> client
    targetSocket.on('message', (msg) => {
      console.log(`[Backend -> Client] ${msg}`);
      clientSocket.send(msg);
    });
  });

  // Error handling while navigating to backend
  targetSocket.on('error', (err) => {
    console.error(`Error connecting to backend WS: ${err.message}`);
    cleanup();
  });

  clientSocket.on('error', (err) => {
    console.error(`Client socket error: ${err.message}`);
    cleanup();
  });

  clientSocket.on('close', (code, reason) => {
    console.log(`Client socket closed: Code=${code}, Reason=${reason}`);
    cleanup();
  });

  targetSocket.on('close', (code, reason) => {
    console.log(`Backend socket closed: Code=${code}, Reason=${reason}`);
    cleanup();
  });

  const cleanup = () => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
    if (targetSocket.readyState === WebSocket.OPEN) {
      targetSocket.close();
    }
  };
});

// ----- Start Server -----
httpServer.listen(APP_PORT, () => {
  console.log(`HTTP Express server listening on port ${APP_PORT}`);
});
