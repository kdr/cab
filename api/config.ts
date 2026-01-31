import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    cabinetName: process.env.CABINET_NAME || 'CAB',
    escapeSequence: {
      key: 'Escape',
      holdDuration: 1500,
      rapidPressCount: 3,
    },
  });
}
