import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

export interface UploadResult {
  path: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly bucket = 'fotos_perfil';

  /**
   * Subir una imagen de perfil al bucket `fotos_perfil`.
   * - Crea una ruta única: `${userId}/${prefix}-${timestamp}.${ext}`
   * - Devuelve la `path` en el bucket y la `url` pública.
   */
  async uploadProfileImage(
    file: File | Blob,
    userId: string,
    prefix = 'perfil',
    upsert = true
  ): Promise<UploadResult> {
    const ext = this.getExt(file) || 'jpg';
    const filename = `${prefix}-${Date.now()}.${ext}`;
    const path = `${userId}/${filename}`;

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert,
        contentType: this.getContentType(file) ?? 'application/octet-stream',
      });

    if (error) throw error;

    const { data: pub } = supabase.storage.from(this.bucket).getPublicUrl(path);
    return { path: data?.path ?? path, url: pub.publicUrl };
  }

  /** Obtener URL pública de un objeto ya subido */
  getPublicUrl(path: string): string {
    return supabase.storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }

  /** Eliminar una imagen por path */
  async remove(path: string) {
    const { data, error } = await supabase.storage.from(this.bucket).remove([path]);
    if (error) throw error;
    return data;
  }

  /** Listar objetos bajo un prefijo (carpeta) */
  async list(prefix: string = '', options?: Parameters<typeof supabase.storage.from>[0]) {
    const { data, error } = await supabase.storage.from(this.bucket).list(prefix, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' as const },
    } as any);
    if (error) throw error;
    return data;
  }

  private getExt(file: File | Blob): string | undefined {
    if (this.isFile(file)) {
      const name = file.name || '';
      const dot = name.lastIndexOf('.');
      return dot >= 0 ? name.slice(dot + 1).toLowerCase() : undefined;
    }
    // Blob sin nombre: infiere por tipo
    const type = this.getContentType(file);
    if (!type) return undefined;
    const m = /^(?:image|application)\/([a-z0-9.+-]+)/i.exec(type);
    return m?.[1]?.toLowerCase();
  }

  private getContentType(file: File | Blob): string | undefined {
    return (file as any)?.type || undefined;
  }

  private isFile(x: any): x is File {
    return typeof File !== 'undefined' && x instanceof File;
  }
}
