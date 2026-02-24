import { Redis } from '@upstash/redis';
console.log('🔌 Inizializzazione Redis Client...');
console.log('URL:', process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
console.log(
  'Token configured:',
  !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
);

export const redis = Redis.fromEnv();
