import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { resolve } from 'path';
import { loadConfig } from './config-loader.js';
import { PortManager } from './port-manager.js';
import { GameManager } from './game-manager.js';
import { createApiRouter } from './routes/api.js';

const config = loadConfig();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize managers
const portManager = new PortManager(config.portRange.start, config.portRange.end);
const gameManager = new GameManager(config.gamesDirectory, portManager);

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', createApiRouter(gameManager, config));

// Serve static files
const clientPath = resolve(process.cwd(), 'src/client');
app.use(express.static(clientPath));

// WebSocket for escape sequence signals
const clients: Set<WebSocket> = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString());
    if (data.type === 'escape') {
      // Broadcast escape signal to all clients
      broadcast({ type: 'escape-triggered' });
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected');
  });
});

function broadcast(message: object) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\nShutting down cabinet...');
  await gameManager.stopAllGames();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gameManager.stopAllGames();
  process.exit(0);
});

// Start server and all games
async function start() {
  // Start all games first
  console.log('Starting game servers...');
  await gameManager.startAllGames();

  server.listen(config.cabinetPort, () => {
    console.log(`
╔════════════════════════════════════════╗
║   ${config.cabinetName} - Video Game Cabinet        ║
║   http://localhost:${config.cabinetPort}               ║
╚════════════════════════════════════════╝
    `);
  });
}

start().catch((error) => {
  console.error('Failed to start cabinet:', error);
  process.exit(1);
});
