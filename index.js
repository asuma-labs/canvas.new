import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

import generateRoute from './api/generate.js';
import quoteRoute from './api/quote.js';

dotenv.config();

const server = Fastify({
  logger: process.env.NODE_ENV !== 'production',
  trustProxy: true,
});

async function buildServer() {
  await server.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] });
  await server.register(helmet);
  await server.register(compress);
  await server.register(rateLimit, { max: 10, timeWindow: '1 minute' });
  await server.register(swagger, { swagger: { info: { title: 'Canvas API', description: 'Generate canvas and upload to Supabase', version: '1.0.0' }, host: process.env.HOST || 'localhost:3000', schemes: ['http', 'https'], consumes: ['application/json'], produces: ['application/json'] } });
  await server.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list', deepLinking: true } });

  server.get('/', async () => ({ status: 'ok', message: 'Canvas API is running 🚀', docs: '/docs', endpoints: { GET: '/api/health', POST: '/api/generate', POST: '/api/quote' } }));

  await server.register(generateRoute, { prefix: '/api' });
  await server.register(quoteRoute, { prefix: '/api' });

  return server;
}

const fastifyPromise = buildServer();

export default async function handler(req, res) {
  const fastify = await fastifyPromise;
  await fastify.ready();
  fastify.server.emit('request', req, res);
}
