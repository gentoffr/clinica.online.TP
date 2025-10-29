import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

export interface UploadResult {
  path: string; // ruta interna en el bucket (p.ej. "userId/perfil-1714078123-a1b2c3.jpg")
  url: string; // URL pública (si el bucket es público). Para bucket privado, generá una firmada.
}

type ListOrder = 'asc' | 'desc';
type ListColumn = 'name' | 'updated_at' | 'created_at' | 'last_accessed_at';

@Injectable({ providedIn: 'root' })
export class StorageService {
  /** Cambiá sólo este nombre si renombrás el bucket */
  private readonly bucket = 'fotos_perfil';

  /**
   * Sube una imagen a `${userId}/${prefix}-${timestamp}-${rand}.${ext}`
   * Devuelve path interno y URL pública (si el bucket es público).
   * Si el bucket es privado, usá `createSignedUrl(path)` para mostrarla.
   */
  async uploadProfileImage(
    file: File | Blob,
    userId: string,
    prefix = 'perfil',
    upsert = true
  ): Promise<UploadResult> {
    if (!file) throw new Error('file requerido');
    if (!userId) throw new Error('userId requerido');

    // Si es imagen, la re-escalamos a cuadrado tipo perfil (sin upscaling)
    let toUpload: File | Blob = file;
    const contentType = this.getContentType(file);
    const isImage = !!contentType && contentType.startsWith('image/');
    let forcedExt: string | undefined;
    if (isImage) {
      try {
        // Redimensiona con recorte central a un cuadrado, hasta 512px
        toUpload = await this.resizeImageToProfileSquare(file, 512, 'image/jpeg', 0.88);
        forcedExt = 'jpg';
      } catch (e) {
        console.warn('[StorageService] resizeImageToProfileSquare fallo, subiendo original', e);
      }
    }

    const ext = forcedExt ?? this.getExt(toUpload) ?? 'jpg';
    const filename = `${this.sanitize(prefix)}-${Date.now()}-${this.rand(6)}.${ext}`;
    const path = `${this.sanitize(userId)}/${filename}`;

    const { data, error } = await supabase.storage.from(this.bucket).upload(path, toUpload, {
      upsert,
      cacheControl: '3600',
      contentType: forcedExt ? 'image/jpeg' : (this.getContentType(toUpload) ?? 'application/octet-stream'),
    });

    if (error) throw error;

    const url = this.getPublicUrl(data?.path ?? path);
    console.log('[StorageService] uploadProfileImage uploaded', { path: data?.path ?? path, url });
    return { path: data?.path ?? path, url };
  }

  /** Devuelve URL pública; funciona solo si el bucket es público. */
  getPublicUrl(path: string): string {
    return supabase.storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }

  /** Devuelve URL firmada válida `expiresIn` segundos (para buckets privados). */
  async createSignedUrl(path: string, expiresIn = 60 * 60): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }

  /** Elimina uno o más objetos por path. */
  async remove(paths: string | string[]) {
    const arr = Array.isArray(paths) ? paths : [paths];
    const { data, error } = await supabase.storage.from(this.bucket).remove(arr);
    if (error) throw error;
    return data;
  }

  /** Lista objetos bajo un prefijo (carpeta). */
  async list(
    prefix = '',
    opts?: { limit?: number; offset?: number; sortBy?: { column: ListColumn; order: ListOrder } }
  ) {
    const { data, error } = await supabase.storage.from(this.bucket).list(prefix, {
      limit: opts?.limit ?? 100,
      offset: opts?.offset ?? 0,
      sortBy: opts?.sortBy ?? { column: 'created_at', order: 'desc' },
    });
    if (error) throw error;
    return data;
  }

  /** Mueve/renombra un objeto. */

  async move(fromPath: string, toPath: string) {
    const { data, error } = await supabase.storage.from(this.bucket).move(fromPath, toPath);
    if (error) throw error;
    return data;
  }

  /** Verifica existencia (listando el padre y buscando el nombre). */
  async exists(path: string): Promise<boolean> {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const name = path.slice(path.lastIndexOf('/') + 1);
    const items = await this.list(dir);
    return items.some((i) => i.name === name);
  }

  /** Convierte una public URL -> path interno del bucket (si corresponde a este bucket). */
  pathFromPublicUrl(url: string): string | null {
    try {
      const u = new URL(url);
      // Busca el segmento /object/public/<bucket>/
      const i = u.pathname.indexOf(`/object/public/${this.bucket}/`);
      if (i === -1) return null;
      return decodeURIComponent(u.pathname.slice(i + `/object/public/${this.bucket}/`.length));
    } catch {
      return null;
    }
  }

  // ----------------- helpers privados -----------------

  private getExt(file: File | Blob): string | undefined {
    if (this.isFile(file) && file.name) {
      const dot = file.name.lastIndexOf('.');
      if (dot >= 0) return file.name.slice(dot + 1).toLowerCase();
    }
    const type = this.getContentType(file);
    if (!type) return undefined;
    const m = /^([a-z0-9.+-]+)\/([a-z0-9.+-]+)$/i.exec(type);
    const ext = m?.[2]?.toLowerCase();
    return ext === 'jpeg' ? 'jpg' : ext;
  }

  private getContentType(file: File | Blob): string | undefined {
    return (file as any)?.type || undefined;
  }

  private isFile(x: any): x is File {
    return typeof File !== 'undefined' && x instanceof File;
    // En SSR/Edge puede no existir File; el instanceof fallará, por eso el guard.
  }

  private sanitize(x: string): string {
    return String(x)
      .trim()
      .replace(/[^a-zA-Z0-9/_.-]/g, '_');
  }

  private rand(n: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < n; i++) out += chars[(Math.random() * chars.length) | 0];
    return out;
  }

  /**
   * Reescala una imagen a formato cuadrado de perfil con recorte centrado.
   * - Mantiene proporciones (no distorsiona)
   * - Evita upscaling: si la imagen original es más chica que `maxSize`, exporta al tamaño máximo posible sin agrandar.
   * - Exporta como JPEG con `quality` especificada.
   */
  private async resizeImageToProfileSquare(
    file: File | Blob,
    maxSize = 512,
    mime: 'image/jpeg' | 'image/png' = 'image/jpeg',
    quality = 0.9
  ): Promise<Blob> {
    const img = await this.loadImageFromFile(file);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('Imagen inválida');

    // Recorte central a cuadrado
    const side = Math.min(w, h);
    const sx = Math.floor((w - side) / 2);
    const sy = Math.floor((h - side) / 2);

    // Evitar upscaling: si el lado recortado es menor que maxSize, usamos ese lado
    const target = Math.min(maxSize, side);
    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no soportado');

    // Dibujar con suavizado
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob falló'))), mime, quality);
    });
    return blob;
  }

  private loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }
}
