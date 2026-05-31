import { v4 as uuidv4 } from 'uuid';
import { generateWelcomeCanvas } from '../lib/canvas.js';
import { uploadCanvasToSupabase } from '../lib/upload.js';

export default async function generateRoute(fastify, opts) {
  fastify.post('/generate', async (req, reply) => {
    try {
      const { name = 'User' } = req.body || {};
      const buffer = await generateWelcomeCanvas(name);
      const filename = `canvas-${Date.now()}-${uuidv4()}.png`;
      const result = await uploadCanvasToSupabase(buffer, filename);
      return reply.send({
        success: true,
        message: 'Canvas generated successfully',
        data: {
          id: result.id,
          filename: result.filename,
          url: result.url,
        }
      });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });
}
