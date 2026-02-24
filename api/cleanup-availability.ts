import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from './_auth.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { prefixed, redisRaw } from './_redisClient.js';
import { validateNumber } from './_validation.js';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { maxAgeSeconds: rawMaxAge } = req.body || {};
    const maxAgeSeconds = rawMaxAge !== undefined ? validateNumber(rawMaxAge, 'maxAgeSeconds', 1, 86400 * 7) : 5400;

    const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;

    // Ottieni gli IDs scaduti
    const expiredIds = (await redisRaw.zremrangebyscore(prefixed('availability_ts'), '-inf', String(cutoff))) as string[] | null;

    if (!expiredIds || expiredIds.length === 0) {
      return res.status(200).json({ removed: 0 });
    }

    // Rimuovi dagli hash e dall'index
    await redisRaw.hdel(prefixed('availability'), ...expiredIds);
    await redisRaw.zrem(prefixed('availability_ts'), ...expiredIds);

    return res.status(200).json({ removed: expiredIds.length });
  } catch (err) {
    console.error('Errore cleanup availability:', err);
    return res.status(500).json({ error: 'Errore durante cleanup' });
  }
}

export default withAuth(handler, 'cron');
