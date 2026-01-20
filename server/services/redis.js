import { createClient } from 'redis';

let client;

export const getRedis = () => {
  if (client) {
    return client;
  }

  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  client = createClient({ url });

  client.on('error', (err) => {
    console.error('Redis client error', err);
  });

  client.connect().catch((err) => {
    console.error('Redis connection failed', err);
  });

  return client;
};
