import { Router } from 'express';
import { GameManager } from '../game-manager.js';
import { CabinetConfig } from '../config-loader.js';

export function createApiRouter(gameManager: GameManager, config: CabinetConfig): Router {
  const router = Router();

  // Get list of available games (with URLs)
  router.get('/games', (_req, res) => {
    try {
      const games = gameManager.getGamesWithUrls();
      res.json({ games });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list games' });
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
