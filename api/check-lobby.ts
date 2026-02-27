import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { redis } from './_redisClient.js';
// Lobby is global; no matchTime required

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  try {
    // Global lobby key
    const lobbyKey = `lobby`;

    const lobbyData = await redis.get(lobbyKey);
    const exists = lobbyData !== null;

    // Se esiste, calcola il tempo rimanente (TTL)
    let ttl = 0;
    if (exists) {
      ttl = await redis.ttl(lobbyKey);
    }

    // Estrai match data (se presente nella lobby registry)
    const parsed = lobbyData as Record<string, unknown> | null;
    const match = (parsed && typeof parsed === 'object' && 'match' in parsed)
      ? parsed.match
      : null;

    return res.status(200).json({
      exists,
      ttl, // Secondi rimanenti
      data: lobbyData,
      match // Team data per il frontend
    });
  } catch (err) {
    console.error('❌ Errore check lobby:', err);
    return res.status(500).json({
      error: 'Errore verifica lobby',
      exists: false
    });
  }
}
