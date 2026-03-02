import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from './_auth.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { prefixed, redisRaw } from './_redisClient.js';

/**
 * API per cancellare messaggi chat e conferme della lobby (admin only)
 *
 * POST /api/admin-cleanup
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Pipeline 1: read what we need (1 HTTP request)
    const readPipeline = redisRaw.pipeline();
    readPipeline.lrange(prefixed('messages'), 0, -1);
    readPipeline.hlen(prefixed('availability'));
    const [messageIds, confirmCount] = await readPipeline.exec() as [string[], number];

    // Pipeline 2: delete everything in a single batch (1 HTTP request)
    const delPipeline = redisRaw.pipeline();
    delPipeline.del(prefixed('messages'));
    delPipeline.del(prefixed('availability'));
    delPipeline.del(prefixed('availability_ts'));
    if (messageIds && messageIds.length > 0) {
      for (const id of messageIds) delPipeline.del(prefixed(`message:${id}`));
    }
    await delPipeline.exec();

    const msgCount = messageIds?.length ?? 0;
    console.log(`Cleanup: ${msgCount} messaggi, ${confirmCount} conferme cancellate`);

    return res.status(200).json({
      ok: true,
      deletedMessages: msgCount,
      deletedConfirmations: confirmCount
    });
  } catch (error) {
    console.error('Errore admin-cleanup:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler, 'admin');
