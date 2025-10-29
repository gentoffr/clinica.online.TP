import { Injectable, DestroyRef, inject } from '@angular/core';
import { BehaviorSubject, from, of } from 'rxjs';
import { catchError, map, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { supabase } from './supabase.client';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

/** Estructura real de public.profiles (incluye email persistido) */
export type Profile = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  edad: number | null;
  dni: string | null;
  obra_social?: string | null;
  especialidad?: string | null;
  imagen_perfil?: string[] | null;
  admin?: boolean | null;
};

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
  private _profile$ = new BehaviorSubject<Profile | null>(null);
  readonly user$ = this._profile$.asObservable();

  get user(): Profile | null { return this._profile$.value; }

  private profilesChannel: ReturnType<typeof supabase.channel> | null = null;

  constructor(
    private storage: StorageService,
    private toast: ToastService
  ) {
    const destroyRef = inject(DestroyRef);

    from(supabase.auth.getSession())
      .pipe(
        map(({ data }) => data.session?.user?.id ?? null),
        switchMap((uid) => (uid ? this.fetchProfile(uid) : of(null))),
        catchError(() => of(null))
      )
      .subscribe(p => this._profile$.next(p));

    supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (!uid) {
        this._profile$.next(null);
        this.teardownProfilesChannel();
        return;
      }
      this.fetchProfile(uid).subscribe(p => {
        this._profile$.next(p);
        this.setupProfilesChannel(uid);
      });
    });
  }

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const uid = data.user?.id;
    if (uid) this.fetchProfile(uid).subscribe(p => this._profile$.next(p));
    const retorno = this._selectProfile(uid!);
    return retorno;
  }

  async logout() {
    await supabase.auth.signOut();
    this.teardownProfilesChannel();
    this._profile$.next(null);
  }

  async currentUser() {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) return null;
    const p = await this._selectProfile(uid);
    return p ?? null;
  }

  async register(input: RegisterInput) {
    const { email, password } = input;

    const { data: sign, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'https://clinica-f94d0.web.app/inicio' },
    });
    if (signErr) {
      this.toast.error(signErr.message || 'No se pudo crear el usuario');
      throw signErr;
    }

    const uid = sign.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
    if (!uid) {
      const err = new Error('Usuario no disponible tras el registro');
      this.toast.error(err.message);
      throw err;
    }

    const imagenes_perfil_paths: string[] = [];
    try {
      const fotosIn = (input.fotos ?? []).filter(Boolean) as File[];
      const legacy: (File | null | undefined)[] =
        input.tipo === 'paciente'
          ? [(input as any).foto1, (input as any).foto2]
          : [(input as any).foto];
      const toUpload = [...fotosIn, ...(legacy.filter(Boolean) as File[])].slice(0, 2);

      for (let i = 0; i < toUpload.length; i++) {
        const up = await this.storage.uploadProfileImage(toUpload[i], uid, `perfil${i + 1}`);
        imagenes_perfil_paths.push(up.url);
      }
    } catch (e: any) {
      this.toast.error(e?.message || 'No se pudo subir la imagen');
    }

    // Insert directo en profiles incluyendo email persistido
    const base: Profile & { id: string } = {
      id: uid,
      email: input.email, // ahora persistido en public.profiles
      nombre: input.nombre ?? null,
      apellido: input.apellido ?? null,
      edad: input.edad ?? null,
      dni: input.dni ?? null,
      imagen_perfil: imagenes_perfil_paths,
      obra_social: input.tipo === 'paciente' ? (input.obra_social ?? null) : undefined,
      especialidad: input.tipo === 'especialista' ? input.especialidad : undefined,
    };

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .insert([base])
      .select('id, email, nombre, apellido, edad, dni, obra_social, especialidad, imagen_perfil')
      .single();

    if (profErr) {
      this.toast.error(profErr.message || 'No se pudo crear el perfil');
      throw profErr;
    }

    const {data, error} = await supabase.from('especialidades')
    .insert({ especialidad: input.tipo === 'especialista' ? input.especialidad : null });
    if (error) {
      console.error('Error al insertar especialidad:', error);
    }

    this._profile$.next(prof as Profile);
    this.setupProfilesChannel(uid);

    this.toast.success('Registro completado');
    return prof as Profile;
  }

  private fetchProfile(uid: string) {
    return from(this._selectProfile(uid)).pipe(
      catchError(() => of(null)),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );
  }

  private async _selectProfile(uid: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nombre, apellido, edad, dni, obra_social, especialidad, imagen_perfil, admin')
      .eq('id', uid)
      .single();
    console.log('[AuthService] _selectProfile', { uid, data, error });
    if (error) return null;
    return data as Profile;
  }

  private setupProfilesChannel(uid: string) {
    this.teardownProfilesChannel();
    this.profilesChannel = supabase
      .channel(`profiles-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        (payload: any) => {
          const next = (payload.new ?? payload.old) as Profile | undefined;
          if (!next) return;
          const curr = this._profile$.value;
          if (JSON.stringify(curr) !== JSON.stringify(next)) this._profile$.next(next);
        }
      )
      .subscribe();
  }

  private teardownProfilesChannel() {
    if (this.profilesChannel) {
      supabase.removeChannel(this.profilesChannel);
      this.profilesChannel = null;
    }
  }
}
