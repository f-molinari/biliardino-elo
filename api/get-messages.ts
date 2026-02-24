import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { IMessage, IMessagesResponse } from '../src/models/message.interface.js';
import { handleCorsPreFlight, setCorsHeaders } from './_cors.js';
import { redis } from './_redisClient.js';

/**
 * API per ottenere i messaggi chat di una partita
 *
 * GET /api/get-messages?time=11:00&since=1234567890
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  setCorsHeaders(res);
  if (handleCorsPreFlight(req, res)) return res;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Global messages for lobby
    const messagesKey = `messages`;

    // Recupera gli ID dei messaggi
    const messageIds = await redis.lrange(messagesKey, 0, -1);

    const messages: IMessage[] = [];

    // Recupera ogni messaggio
    for (const messageId of messageIds) {
      const message = await redis.get<IMessage>(`message:${messageId}`);
      if (message) {
        messages.push(message);
      }
    }

    const response: IMessagesResponse = {
      messages,
      count: messages.length
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Errore get-messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default handler;
