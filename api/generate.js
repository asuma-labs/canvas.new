import fastify from 'fastify';
import { createCanvas } from '@napi-rs/canvas';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const app = fastify({ logger: false });

app.post('/api/generate', async (req, reply) => {
  try {
    const { name = 'User' } = req.body || {};
    
    // Generate canvas
    const width = 800, height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#4F46E5');
    gradient.addColorStop(1, '#7C3AED');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText(`Halo ${name}!`, width/2, height/2);
    ctx.font = '24px "Segoe UI"';
    ctx.fillStyle = '#E0E7FF';
    ctx.fillText('Canvas with napi-rs', width/2, height-80);
    const buffer = await canvas.encode('png');
    
    // Upload ke Supabase
    const filename = `canvas-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const storagePath = `public/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from('canvas-output')
      .upload(storagePath, buffer, { contentType: 'image/png', cacheControl: '3600' });
    if (uploadError) throw uploadError;
    
    const { data: publicUrlData } = supabase.storage.from('canvas-output').getPublicUrl(storagePath);
    const { data: meta, error: dbError } = await supabase
      .from('canvas_metadata')
      .insert({ filename, storage_path: storagePath, public_url: publicUrlData.publicUrl })
      .select()
      .single();
    if (dbError) throw dbError;
    
    return reply.send({
      success: true,
      message: 'Canvas generated successfully',
      data: { id: meta.id, filename: meta.filename, url: meta.public_url }
    });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ success: false, message: err.message });
  }
});

export default async function handler(req, res) {
  await app.ready();
  app.server.emit('request', req, res);
}
