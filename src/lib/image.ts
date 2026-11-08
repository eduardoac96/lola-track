/**
 * Comprime una foto en el cliente: lado mayor ≤ maxSide, WebP 0.8.
 * Safari (iOS) no codifica WebP en canvas: si toBlob devuelve otro tipo, cae a JPEG 0.82.
 */
export async function compressImage(file: Blob, maxSide = 1280): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const webp = await toBlob(canvas, 'image/webp', 0.8);
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  const jpg = await toBlob(canvas, 'image/jpeg', 0.82);
  if (!jpg) throw new Error('No se pudo comprimir la imagen');
  return { blob: jpg, ext: 'jpg' };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
