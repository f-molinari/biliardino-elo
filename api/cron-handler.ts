import type { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * CRON Orchestrator
 *
 * Schedule:
 * - 10:58, 15:58 → Broadcast notifiche
 * - 11:03, 16:03 → Matchmaking automatico (5min dopo)
 */
import { withAuth } from './_auth.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { validateHost } from './_validation.js';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  try {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    console.log(`🕐 CRON eseguito alle ${hour}:${minute}`);

    // Broadcast alle 10:58 o 15:58
    if (minute === 58 && (hour === 10 || hour === 15)) {
      const matchTime = hour === 10 ? '11:00' : '16:00';
      console.log(`📢 Eseguo broadcast per match ${matchTime}`);

      // Valida host per prevenire Host Header Injection
      const host = validateHost(req.headers.host as string);
      const broadcastUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${host}/api/send-broadcast`;
      const response = await fetch(broadcastUrl);
      const data = await response.json();

      console.log(`✅ Broadcast completato:`, data);
      return res.status(200).json({
        action: 'broadcast',
        matchTime,
        result: data
      });
    }

    // Matchmaking alle 11:03 o 16:03 (5min dopo broadcast)
    if (minute === 3 && (hour === 11 || hour === 16)) {
      const matchTime = hour === 11 ? '11:00' : '16:00';
      console.log(`🎮 Eseguo matchmaking per match ${matchTime}`);

      // Valida host per prevenire Host Header Injection
      const host = validateHost(req.headers.host as string);
      const matchmakingUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${host}/api/run-matchmaking?time=${matchTime}`;
      const response = await fetch(matchmakingUrl);
      const data = await response.json();

      console.log(`✅ Matchmaking completato:`, data);
      return res.status(200).json({
        action: 'matchmaking',
        matchTime,
        result: data
      });
    }

    // Orario non previsto
    console.warn(`⚠️ CRON eseguito in orario non previsto: ${hour}:${minute}`);
    return res.status(200).json({
      action: 'none',
      message: 'Orario non previsto',
      time: `${hour}:${minute}`
    });
  } catch (err) {
    console.error('Errore CRON handler:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
export default withAuth(handler, 'cron');
