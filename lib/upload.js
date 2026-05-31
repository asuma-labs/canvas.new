import { supabase, supabaseAdmin } from './supabase.js';

export async function uploadCanvasToSupabase(buffer, fileName) {
  const storagePath = `public/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('canvas-output')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from('canvas-output')
    .getPublicUrl(storagePath);

  const { data: meta, error: dbError } = await supabaseAdmin
    .from('canvas_metadata')
    .insert({
      filename: fileName,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
    })
    .select()
    .single();
  if (dbError) throw dbError;

  return {
    id: meta.id,
    filename: meta.filename,
    url: meta.public_url,
  };
}
