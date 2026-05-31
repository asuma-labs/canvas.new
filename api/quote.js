import { v4 as uuidv4 } from 'uuid';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { supabase } from '../lib/supabase.js';

const FONT_URL = 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/CrimsonText-Regular.ttf';
const BG_URL = 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Image/_20260425155846190.jpeg';

const PADDING_RATIO = 0.15;
const FOOTER_RATIO = 0.12;
const QUOTE_COLOR = '#1a1a1a';
const FONT_SIZE_MAX = 60;
const FONT_SIZE_MIN = 20;

let fontLoaded = false;
let cachedBgBuffer = null;

function calcFontSize(ctx, text, maxWidth, maxHeight, fontName) {
  const words = text.split(' ');

  for (let size = FONT_SIZE_MAX; size >= FONT_SIZE_MIN; size -= 1) {
    ctx.font = `${size}px ${fontName}`;
    const lineHeight = size * 1.35;

    let lines = 0;
    let currentLine = [];

    words.forEach(word => {
      const testLine = [...currentLine, word].join(' ').replace(/[\[\]]/g, '');
      if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
        lines++;
        currentLine = [word];
      } else {
        currentLine.push(word);
      }
    });
    lines++;

    if (lines * lineHeight <= maxHeight) return size;
  }

  return FONT_SIZE_MIN;
}

function drawTextJustified(ctx, text, centerX, centerY, maxWidth, fontSize) {
  const lineHeight = fontSize * 1.35;
  const words = text.split(' ');
  let lines = [];
  let currentLine = [];

  words.forEach(word => {
    const testLine = [...currentLine, word].join(' ').replace(/[\[\]]/g, '');
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [word];
    } else {
      currentLine.push(word);
    }
  });
  lines.push(currentLine);

  let startY = centerY - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    const isLastLine = index === lines.length - 1;

    const lineParts = line.map(word => {
      const match = word.match(/^\[(.+?)\]([^\w]*)$/);
      if (match) {
        const highlighted = match[1];
        const trailing = match[2];
        const hlWidth = ctx.measureText(highlighted).width;
        const trailWidth = ctx.measureText(trailing).width;
        return { content: highlighted, trailing, isHighlight: true, width: hlWidth + trailWidth, hlWidth };
      }
      return { content: word, trailing: '', isHighlight: false, width: ctx.measureText(word).width, hlWidth: 0 };
    });

    const totalWordsWidth = lineParts.reduce((sum, p) => sum + p.width, 0);
    let currentX, spaceWidth;

    if (!isLastLine && line.length > 1) {
      spaceWidth = (maxWidth - totalWordsWidth) / (line.length - 1);
      currentX = centerX - maxWidth / 2;
    } else {
      const standardSpace = ctx.measureText(' ').width;
      spaceWidth = standardSpace;
      currentX = centerX - (totalWordsWidth + standardSpace * (line.length - 1)) / 2;
    }

    lineParts.forEach(part => {
      if (part.isHighlight) {
        ctx.fillStyle = 'rgba(212, 225, 87, 0.85)';
        ctx.fillRect(currentX, startY - fontSize * 0.45, part.hlWidth, fontSize * 0.95);
      }
      ctx.fillStyle = QUOTE_COLOR;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(part.content, currentX, startY);
      if (part.trailing) {
        ctx.fillText(part.trailing, currentX + part.hlWidth, startY);
      }
      currentX += part.width + spaceWidth;
    });

    startY += lineHeight;
  });
}

async function loadAssets() {
  if (fontLoaded && cachedBgBuffer) return cachedBgBuffer;

  const [fontBuffer, bgBuffer] = await Promise.all([
    fetch(FONT_URL).then(r => r.arrayBuffer()),
    fetch(BG_URL).then(r => r.arrayBuffer()),
  ]);

  GlobalFonts.register(Buffer.from(fontBuffer), 'CrimsonText');
  fontLoaded = true;
  cachedBgBuffer = Buffer.from(bgBuffer);
  return cachedBgBuffer;
}

async function generateQuoteCanvas(quoteText, author = 'Someone') {
  const bgBuffer = await loadAssets();
  const bg = await loadImage(bgBuffer);

  const canvas = createCanvas(bg.width, bg.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bg, 0, 0);

  const padding = canvas.width * PADDING_RATIO;
  const footerHeight = canvas.height * FOOTER_RATIO;
  const centerX = canvas.width / 2;
  const maxWidth = canvas.width - padding * 2;
  const quoteAreaTop = padding;
  const quoteAreaHeight = canvas.height - footerHeight - quoteAreaTop;
  const quoteAreaCenterY = quoteAreaTop + quoteAreaHeight / 2;

  const fontSize = calcFontSize(ctx, quoteText, maxWidth, quoteAreaHeight, 'CrimsonText');
  ctx.font = `${fontSize}px CrimsonText`;

  drawTextJustified(ctx, quoteText, centerX, quoteAreaCenterY, maxWidth, fontSize);

  ctx.font = '26px CrimsonText';
  ctx.fillStyle = QUOTE_COLOR;
  ctx.textAlign = 'center';
  ctx.fillText(author, centerX, canvas.height - footerHeight / 2);

  return canvas.encode('jpeg');
}

export default async function quoteRoute(fastify, opts) {
  fastify.post('/quote', {
    schema: {
      description: 'Generate quote image with justified text and highlight',
      tags: ['canvas'],
      body: {
        type: 'object',
        required: ['quote'],
        properties: {
          quote: { type: 'string', minLength: 1, maxLength: 500 },
          author: { type: 'string', maxLength: 100, default: 'Someone' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                filename: { type: 'string' },
                url: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { quote, author = 'Someone' } = req.body;

      if (!quote || quote.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Quote is required'
        });
      }

      const buffer = await generateQuoteCanvas(quote, author);
      const filename = `quote-${Date.now()}-${uuidv4()}.jpg`;

      const storagePath = `public/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('canvas-output')
        .upload(storagePath, buffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('canvas-output')
        .getPublicUrl(storagePath);

      const { data: meta, error: dbError } = await supabase
        .from('canvas_metadata')
        .insert({
          filename: filename,
          storage_path: storagePath,
          public_url: publicUrlData.publicUrl,
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB error:', dbError);
        throw new Error(`Failed to save metadata: ${dbError.message}`);
      }

      return reply.status(200).send({
        success: true,
        message: 'Quote image generated successfully',
        data: {
          id: meta.id,
          filename: meta.filename,
          url: meta.public_url,
        }
      });

    } catch (error) {
      console.error('Quote generation error:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  });
}
