import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from './_auth.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { redis } from './_redisClient.js';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear all confirmations for global lobby
    const keys = await redis.keys(`availability:*`);

    if (keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)));
    }

    console.log(`🗑️ Cancellate ${keys.length} conferme`);

    return res.status(200).json({
      ok: true,
      deleted: keys.length
    });
  } catch (err) {
    console.error('Errore cancellazione conferme:', err);
    return res.status(500).json({ error: 'Errore cancellazione conferme' });
  }
}

export default withAuth(handler, 'admin');
