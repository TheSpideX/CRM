const Redis = require('ioredis');
const logger = require('../utils/logger');

const createRedisClient = (db = 0) => {
    const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            logger.info(`Retrying Redis connection in ${delay}ms...`);
            return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        reconnectOnError: (err) => {
            logger.error('Redis reconnect on error:', err);
            return true;
        }
    };

    const client = new Redis(config);

    client.on('error', (error) => {
        logger.error('Redis connection error:', error);
    });

    client.on('connect', () => {
        logger.info(`Redis connected to ${config.host}:${config.port} DB:${db}`);
    });

    return client;
};

const redisClient = createRedisClient(0);
const redisPublisher = createRedisClient(0);
const redisSubscriber = createRedisClient(0);

module.exports = {
    redisClient,
    redisPublisher,
    redisSubscriber
};
