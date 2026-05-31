import { createCanvas } from '@napi-rs/canvas';

export async function generateWelcomeCanvas(name) {
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#4F46E5');
  gradient.addColorStop(1, '#7C3AED');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px "Segoe UI", "Arial"';
  ctx.textAlign = 'center';
  ctx.fillText(`Halo ${name}!`, width / 2, height / 2);

  ctx.font = '24px "Segoe UI", "Arial"';
  ctx.fillStyle = '#E0E7FF';
  ctx.fillText('Canvas with napi-rs/canvas', width / 2, height - 80);

  return canvas.encode('png');
}
