import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateFishName } from './_fishNames.js';
import { prefixed, redisRaw } from './_redisClient.js';
// import { withAuth } from './_auth.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';

interface Confirmation {
  playerId: number;
  confirmedAt: string;
  subscription?: any;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  try {
    const { time: rawTime } = req.query as { time?: string };

    // Leggi tutto dallo hash `availability` (una singola chiamata)
    const rawMap = await redisRaw.hgetall(prefixed('availability')) as Record<string, string> | null;
    const confirmations = Object.values(rawMap || {}).map((v) => {
      try {
        const data = JSON.parse(v) as Confirmation;
        return {
          ...data,
          fishName: generateFishName(data.playerId)
        };
      } catch (e) {
        console.warn('Impossibile parse availability entry:', v);
        return null;
      }
    }).filter(Boolean) as Array<Confirmation & { fishName: string }>;

    return res.status(200).json({
      count: confirmations.filter(Boolean).length,
      confirmations
    });
  } catch (err) {
    console.error('Errore lettura confirmations:', err);
    return res.status(500).json({ error: 'Errore lettura conferme' });
  }
}

// export default withAuth(handler, 'admin');
