import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

type CommonFields = {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
};

export type RegisterPacienteInput = CommonFields & {
  tipo: 'paciente';
  obra_social?: string | null;
  fotos?: Array<File | null> | null;
};

export type RegisterEspecialistaInput = CommonFields & {
  tipo: 'especialista';
  especialidad: string;
  fotos?: Array<File | null> | null;
};

export type RegisterInput = RegisterPacienteInput | RegisterEspecialistaInput;

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private storage: StorageService, private toast: ToastService) {}

  // Iniciar sesión con email y password
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      this.toast.error(error.message || 'Error al iniciar sesión');
      throw error;
    }
    this.toast.success('Sesión iniciada');
    return data;
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async currentUser() {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }

  private fileInfo(f: File | null) {
    return f ? { name: f.name, size: f.size, type: f.type } : null;
  }

  // Registro discriminado por tipo
  async register(input: RegisterInput) {
    console.log('[AuthService.register] start', { tipo: input.tipo, email: input.email });
    const { email, password } = input;
    console.log("Payload ", input);
    // 1) Crear usuario de auth
    console.log('[AuthService.register] signing up user');
    const { data: sign, error: signErr } = await supabase.auth.signUp({ email, password });
    if (signErr) {
      console.error('[AuthService.register] signUp error', signErr);
      this.toast.error(signErr.message || 'No se pudo crear el usuario');
      throw signErr;
    }
    console.log('[AuthService.register] signUp ok', { hasUser: !!sign.user, userId: sign.user?.id });

    const userId = sign.user?.id;
    if (!userId) {
      // Puede ocurrir si hay confirmación por email; intentamos recuperar el usuario actual.
      console.log('[AuthService.register] userId missing after signUp, fetching current user');
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        const err = new Error('Usuario no disponible tras el registro');
        console.error('[AuthService.register] getUser returned null user');
        this.toast.error(err.message);
        throw err;
      }

      // eslint-disable-next-line prefer-const
      // @ts-ignore - maintain for clarity
      userId;
    }

    const id = userId || (await supabase.auth.getUser()).data.user!.id;
    console.log('[AuthService.register] resolved user id', { id });

    // 2) Subir imágenes (hasta 2) y guardar paths
    const imagenes_perfil_paths: string[] = [];
    try {
      const fotosIn = (input.fotos ?? []).filter(f => !!f) as File[];
      const legacy: (File | null | undefined)[] =
        input.tipo === 'paciente'
          ? [(input as any).foto1, (input as any).foto2]
          : [(input as any).foto];
      const all = [...fotosIn, ...legacy.filter(Boolean) as File[]];
      const toUpload = all.slice(0, 2);
      console.log('[AuthService.register] uploading images', {
        count: toUpload.length,
        files: toUpload.map(f => this.fileInfo(f)),
      });
      for (let i = 0; i < toUpload.length; i++) {
        const f = toUpload[i];
        const up = await this.storage.uploadProfileImage(f, id, `perfil${i + 1}`);
        console.log('[AuthService.register] upload ok', { index: i, path: up.path });
        imagenes_perfil_paths.push(up.path);
      }
    } catch (e: any) {
      console.error('[AuthService.register] image upload error', e);
      this.toast.error(e?.message || 'No se pudo subir la imagen');
      // Continuamos: el perfil puede crearse sin imagen
    }

    // 3) Insertar perfil en tabla `profiles`
    const base = {
      id,
      nombre: input.nombre,
      apellido: input.apellido,
      edad: input.edad,
      dni: input.dni,
      imagen_perfil: imagenes_perfil_paths,
    } as any;

    if (input.tipo === 'paciente') {
      base.obra_social = input.obra_social ?? null;
    } else {
      base.especialidad = input.especialidad;
    }

    console.log('[AuthService.register] inserting profile', { id, nombre: input.nombre, apellido: input.apellido, edad: input.edad, dni: '***', imagenes_perfil: imagenes_perfil_paths, tipo: input.tipo, obra_social: (input as any).obra_social, especialidad: (input as any).especialidad });
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .insert([base])
      .select('*')
      .single();

    if (profErr) {
      console.error('[AuthService.register] profile insert error', profErr);
      this.toast.error(profErr.message || 'No se pudo crear el perfil');
      throw profErr;
    }

    console.log('[AuthService.register] profile insert ok', { profileId: prof?.id, userId: id });
    this.toast.success('Registro completado');
    console.log('[AuthService.register] end');
    return prof;
  }
}
