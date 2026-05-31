export default async function healthRoute(fastify, opts) {
  fastify.get('/health', async (req, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
}
