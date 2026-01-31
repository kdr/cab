import { Router } from 'express';
import { GameManager } from '../game-manager.js';
import { CabinetConfig } from '../config-loader.js';

export function createApiRouter(gameManager: GameManager, config: CabinetConfig): Router {
  const router = Router();

  // Get list of available games
  router.get('/games', async (_req, res) => {
    try {
      const games = await gameManager.listGames();
      res.json({ games });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list games' });
    }
  });

  // Get current game status
  router.get('/games/current', (_req, res) => {
    const current = gameManager.getCurrentGame();
    if (current) {
      res.json({ name: current.name, port: current.port });
    } else {
      res.json({ name: null, port: null });
    }
  });

  // Start a game
  router.post('/games/:name/start', async (req, res) => {
    try {
      const { name } = req.params;
      const { port } = await gameManager.startGame(name);
      res.json({ success: true, port });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      res.status(500).json({ error: message });
    }
  });

  // Stop current game
  router.post('/games/stop', async (_req, res) => {
    try {
      await gameManager.stopGame();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop game' });
    }
  });

  // Get cabinet config (for client)
  router.get('/config', (_req, res) => {
    res.json({
      cabinetName: config.cabinetName,
      escapeSequence: config.escapeSequence,
    });
  });

  return router;
}
