import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from './_redisClient.js';
// import { withAuth } from './_auth.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { validateMatchTime } from './_validation.js';

interface Confirmation {
  playerId: number;
  matchTime: string;
  confirmedAt: string;
  subscription?: any;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  try {
    const { time: rawTime } = req.query as { time?: string };

    if (!rawTime) {
      return res.status(400).json({ error: 'Missing time parameter' });
    }

    // Valida e sanitizza time per prevenire injection
    const time = validateMatchTime(rawTime);

    const keys = await redis.keys(`availability:${time}:*`);
    const confirmations = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get(key) as Confirmation | null;
        return data;
      })
    );

    return res.status(200).json({
      count: confirmations.length,
      confirmations: confirmations.filter(Boolean)
    });
  } catch (err) {
    console.error('Errore lettura confirmations:', err);
    return res.status(500).json({ error: 'Errore lettura conferme' });
  }
}

// export default withAuth(handler, 'admin');
