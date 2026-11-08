import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/image';
import { keys } from './cache';

const BUCKET = 'photos';

/** URL firmada (1 h), cacheada 50 min por path. */
export function usePhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: keys.photo(path ?? ''),
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase()
        .storage.from(BUCKET)
        .createSignedUrl(path as string, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/** Sube a photos/{hid}/{itemId}-{ts}.{ext}. El timestamp evita caché vieja al reemplazar. */
export async function uploadItemPhoto(hid: string, itemId: string, file: File): Promise<string> {
  const { blob, ext } = await compressImage(file);
  const path = `${hid}/${itemId}-${Date.now()}.${ext}`;
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return path;
}

export async function removePhoto(path: string): Promise<void> {
  await supabase().storage.from(BUCKET).remove([path]);
}
