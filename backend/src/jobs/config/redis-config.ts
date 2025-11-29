/**
 * Redis connection configuration for workers
 */
export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
}

export function getRedisConfig(): RedisConnectionConfig {
  const config: RedisConnectionConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  if (process.env.REDIS_PASSWORD) {
    config.password = process.env.REDIS_PASSWORD;
  }

  return config;
}

