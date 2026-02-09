import { list, put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { combineMiddlewares, withRateLimiting, withSecurityMiddleware } from './_middleware.js';
import { sanitizeLogOutput, validatePlayerId, validateString } from './_validation.js';

interface PushSubscription {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  [key: string]: any;
}

interface SubscriptionData {
  subscription: PushSubscription;
  playerId: number;
  playerName: string;
  createdAt: string;
}

function generateId(playerId: number, subscription: PushSubscription): string {
  const deviceHash = subscription.endpoint.slice(-20).replace(/[^a-zA-Z0-9]/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${playerId}-subs/${deviceHash}-${randomSuffix}.json`;
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  if (req.method === 'POST') {
    try {
      const { subscription, playerId: rawPlayerId, playerName: rawPlayerName } = req.body as {
        subscription?: PushSubscription;
        playerId?: string | number;
        playerName?: string;
      };

      // Validazione input
      if (!subscription || !rawPlayerId || !rawPlayerName) {
        return res.status(400).json({ error: 'Missing subscription, playerId or playerName' });
      }

      // Valida e sanitizza input
      const playerIdNum = validatePlayerId(rawPlayerId);
      const playerName = validateString(rawPlayerName, 'playerName', 100);

      const key = generateId(playerIdNum, subscription);
      const data: SubscriptionData = {
        subscription,
        playerId: playerIdNum, // Salva come numero
        playerName,
        createdAt: new Date().toISOString()
      };

      const blob = await put(key, JSON.stringify(data), {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: 'application/json'
      });

      console.log('✅ Subscription salvata:', sanitizeLogOutput(playerName), '(ID:', playerIdNum, ')');
      return res.status(201).json({ ok: true, url: blob.url, playerId: playerIdNum });
    } catch (err) {
      console.error('Errore salvataggio subscription:', err);
      return res.status(500).json({ error: 'Write error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { playerId: rawPlayerId } = req.query as { playerId?: string };

      if (!rawPlayerId) {
        return res.status(400).json({ error: 'Missing playerId parameter' });
      }

      // Valida playerId
      const playerIdNum = validatePlayerId(rawPlayerId);

      const { blobs } = await list({
        prefix: `${playerIdNum}-subs/`,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      const subscriptions = await Promise.all(
        blobs.map(async (b) => {
          const response = await fetch(b.url);
          return await response.json() as SubscriptionData;
        })
      );

      return res.status(200).json({ subscriptions });
    } catch (err) {
      console.error('Errore lettura subscriptions:', err);
      return res.status(500).json({ error: 'Read error' });
    }
  }

  return res.status(405).end();
}

// Applica security middleware + rate limiting
export default combineMiddlewares(
  handler,
  withSecurityMiddleware,
  (h) => withRateLimiting(h, { maxRequests: 10, windowMs: 60000 })
);
