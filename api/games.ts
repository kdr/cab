import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GameConfig {
  name: string;
  displayName?: string;
  url: string;
  instructions?: string;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const gamesConfig = process.env.GAMES_CONFIG;

  if (!gamesConfig) {
    return res.status(500).json({ error: 'GAMES_CONFIG not configured' });
  }

  try {
    const games: GameConfig[] = JSON.parse(gamesConfig);
    return res.json({ games });
  } catch (error) {
    return res.status(500).json({ error: 'Invalid GAMES_CONFIG format' });
  }
}
