import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { withSecurityMiddleware } from './_middleware.js';
import { prefixed, redisRaw } from './_redisClient.js';
import { sanitizeLogOutput, validatePlayerId } from './_validation.js';

interface SubscriptionData {
  subscription?: {
    endpoint: string;
    [key: string]: any;
  };
  playerId?: number;
  [key: string]: any;
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);

  if (handleCorsPreFlight(req, res)) return res;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId: rawPlayerId, subscription } = req.body as {
      playerId?: string | number;
      subscription?: any;
    };

    if (!rawPlayerId) {
      return res.status(400).json({ error: 'Missing playerId' });
    }

    // Valida e sanitizza input per prevenire injection
    const playerIdNum = validatePlayerId(rawPlayerId);

    let parsedSubscription = subscription;
    if (typeof subscription === 'string') {
      try {
        parsedSubscription = JSON.parse(subscription);
      } catch {
        parsedSubscription = null;
      }
    }



    const availabilityKey = 'availability';
    const field = String(playerIdNum);
    const confirmedAt = new Date().toISOString();
    const valueObj = {
      playerId: playerIdNum,
      confirmedAt,
      subscription: parsedSubscription
    };

    // Salva nello hash globale (una singola chiave) per ridurre richieste
    await redisRaw.hset(prefixed(availabilityKey), field, JSON.stringify(valueObj));

    // Aggiungi index temporale per cleanup TTL (score = epoch seconds)
    try {
      const ts = Math.floor(Date.now() / 1000);
      await redisRaw.zadd(prefixed('availability_ts'), ts, field);
    } catch (e) {
      console.warn('ZADD availability_ts fallito:', (e as Error).message || e);
    }

    // Pubblica evento per aggiornamenti realtime sui client connessi
    try {
      // Publish on a stable topic name (no env prefix) so clients can subscribe
      await redisRaw.publish('availability_events', JSON.stringify({ playerId: playerIdNum, confirmedAt }));
    } catch (e) {
      // Non bloccare l'operazione se publish fallisce
      console.warn('Publish availability event fallito:', (e as Error).message || e);
    }

    // Conta le conferme con HLEN (una chiamata)
    const rawCount = await redisRaw.hlen(prefixed(availabilityKey));
    const count = Number(rawCount || 0);

    console.log(`✅ Conferma da ${sanitizeLogOutput(String(playerIdNum))} (totale: ${count})`);

    return res.status(200).json({ ok: true, count });
  } catch (err) {
    console.error('Errore conferma availability:', err);
    return res.status(500).json({ error: 'Errore salvataggio conferma' });
  }
}

// Applica security middleware per protezione Node.js
export default withSecurityMiddleware(handler, {
  maxPayloadSize: 10 * 1024, // 10KB
  timeout: 10000 // 10s
});

// export default withAuth(handler, 'admin');
