import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isPlayerAdmin } from './_adminList.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { validatePlayerId } from './_validation.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  try {
    const { playerId: rawPlayerId } = req.query as { playerId?: string };

    if (!rawPlayerId) {
      return res.status(400).json({
        error: 'Missing playerId parameter',
        isAdmin: false
      });
    }

    const playerId = validatePlayerId(rawPlayerId);
    const isAdmin = isPlayerAdmin(playerId);

    return res.status(200).json({
      playerId,
      isAdmin
    });
  } catch (err) {
    console.error('❌ Errore check admin:', err);
    return res.status(500).json({
      error: 'Errore verifica admin',
      isAdmin: false
    });
  }
}
