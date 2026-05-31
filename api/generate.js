import fastify from 'fastify';
import { generateWelcomeCanvas } from '../lib/canvas.js';
import { uploadCanvasToSupabase } from '../lib/upload.js';

const app = fastify({ logger: false });

app.post('/api/generate', async (req, reply) => {
  try {
    const { name = 'User' } = req.body || {};
    const buffer = await generateWelcomeCanvas(name);
    const filename = `canvas-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const result = await uploadCanvasToSupabase(buffer, filename);
    return reply.status(200).send({
      success: true,
      message: 'Canvas generated successfully',
      data: {
        id: result.id,
        filename: result.filename,
        url: result.url,
      },
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

export default async function handler(req, res) {
  await app.ready();
  app.server.emit('request', req, res);
}
