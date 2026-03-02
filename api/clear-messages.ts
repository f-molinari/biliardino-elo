import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from './_auth.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { redis } from './_redisClient.js';
import { validateString } from './_validation.js';

interface ClearMessagesBody {
  matchTime: string;
}

/**
 * API per cancellare i messaggi chat di una partita (admin only)
 *
 * POST /api/clear-messages
 * Body: { matchTime: string }
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { matchTime } = req.body as ClearMessagesBody;

    if (!validateString(matchTime, 1, 20)) {
      return res.status(400).json({ error: 'Invalid matchTime' });
    }

    const messagesKey = `messages:${matchTime}`;

    // Recupera gli ID dei messaggi da cancellare
    const messageIds = await redis.lrange(messagesKey, 0, -1);

    // Cancella ogni messaggio singolo
    for (const messageId of messageIds) {
      await redis.del(`message:${messageId}`);
    }

    // Cancella la lista e il counter
    await redis.del(messagesKey);
    await redis.del(`message-count:${matchTime}`);

    return res.status(200).json({ ok: true, deletedCount: messageIds.length });
  } catch (error) {
    console.error('❌ Errore clear-messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler, 'admin');
