import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { redis } from './_redisClient.js';
import { validateMatchTime } from './_validation.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  try {
    const { time: rawTime } = req.query as { time?: string };

    if (!rawTime) {
      return res.status(400).json({ error: 'Missing time parameter', exists: false });
    }

    const time = validateMatchTime(rawTime);
    const lobbyKey = `lobby:${time}`;

    const lobbyData = await redis.get(lobbyKey);
    const exists = lobbyData !== null;

    // Se esiste, calcola il tempo rimanente (TTL)
    let ttl = 0;
    if (exists) {
      ttl = await redis.ttl(lobbyKey);
    }

    return res.status(200).json({
      exists,
      matchTime: time,
      ttl, // Secondi rimanenti
      data: lobbyData
    });
  } catch (err) {
    console.error('❌ Errore check lobby:', err);
    return res.status(500).json({
      error: 'Errore verifica lobby',
      exists: false
    });
  }
}
