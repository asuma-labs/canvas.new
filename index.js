import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import generateRoute from './api/generate.js';

const server = Fastify({ logger: false });

await server.register(rateLimit, {
  max: 10,
  timeWindow: '1 minute',
});

server.get('/', async (req, reply) => {
  return reply.status(200).send({
    status: 'ok',
    message: 'Canvas API is running',
    endpoints: {
      post: '/api/generate',
      example: { name: 'string' }
    }
  });
});

await server.register(generateRoute);

export default async (req, res) => {
  await server.ready();
  server.server.emit('request', req, res);
};
