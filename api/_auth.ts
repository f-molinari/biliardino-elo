import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as jose from 'jose';

/**
 * Auth middleware per API Vercel serverless
 * Verifica JWT HS256 firmati con AUTH_JWT_SECRET
 * Supporta ruoli: admin, cron, notify
 */

const SECRET = process.env.AUTH_JWT_SECRET;
const ALGORITHM = 'HS256';

type Role = 'admin' | 'cron' | 'notify';

/**
 * Errori auth standard
 */
class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

/**
 * Estrae e verifica il JWT dal header Authorization
 * @param req - Request object
 * @param requiredRole - Ruolo richiesto (admin|cron|notify)
 * @returns Payload decodificato del JWT
 * @throws AuthError Se token mancante, invalido o ruolo insufficiente
 */
export async function verifyAuth(req: VercelRequest, requiredRole: Role | null = null): Promise<jose.JWTPayload> {
  // Verifica che la secret sia configurata
  if (!SECRET) {
    console.error('AUTH_JWT_SECRET non configurato');
    throw new AuthError('Server misconfigured', 500);
  }

  // Estrai header Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AuthError('Missing Authorization header', 401);
  }

  // Estrai bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AuthError('Invalid Authorization format. Expected: Bearer <token>', 401);
  }

  const token = parts[1];
  if (!token) {
    throw new AuthError('Missing token', 401);
  }

  try {
    // Verifica firma JWT con HS256
    const secret = new TextEncoder().encode(SECRET);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [ALGORITHM]
    });

    // Verifica ruolo se richiesto
    if (requiredRole) {
      const role = payload && typeof payload.role === 'string' ? payload.role : null;
      if (role !== requiredRole) {
        console.warn(`Role mismatch: required ${requiredRole}, got ${role}`);
        throw new AuthError(`Forbidden: required role '${requiredRole}'`, 403);
      }
    }

    return payload;
  } catch (err) {
    if (err instanceof AuthError) {
      throw err;
    }

    // Errori di verifica JWT
    if ((err as any).code === 'ERR_JWT_EXPIRED') {
      throw new AuthError('Token expired', 401);
    }
    if ((err as any).code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new AuthError('Invalid token signature', 401);
    }

    console.error('JWT verification failed:', (err as Error).message);
    throw new AuthError('Invalid token', 401);
  }
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>;

/**
 * Wrapper HOF per proteggere handler API con auth
 * @param handler - Handler originale (req, res)
 * @param requiredRole - Ruolo richiesto (admin|cron|notify)
 * @returns Handler wrappato con verifica auth
 */
export function withAuth(handler: Handler, requiredRole: Role | null = null): Handler {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // Verifica auth
      const payload = await verifyAuth(req, requiredRole);

      // Allega payload alla request per uso downstream
      (req as any).auth = payload;

      // Procedi con handler originale
      return await handler(req, res);
    } catch (err) {
      // Gestisci errori auth
      const statusCode = (err as AuthError).statusCode || 500;
      const message = (err as Error).message || 'Authentication failed';

      console.error(`Auth failed [${statusCode}]:`, message);

      return res.status(statusCode).json({
        error: message,
        code: statusCode
      });
    }
  };
}
