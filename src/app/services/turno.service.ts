import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

export interface TurnoInsert {
  id_paciente: string;
  id_especialista: string;
  fecha_turno: Date | string; // timestamp with time zone
  estado?: string | null;
  especialidad: string | null;
}

export interface HistoriaClinicaInsert {
  id_paciente: string; // uuid
  ids_especialistas: string[]; // uuid[]
  fecha_registro?: Date | string | null;
  altura?: number | null; // cm
  peso?: number | null; // kg
  temperatura?: number | null; // °C
  presion?: number | null; // mmHg (promedio/sistólica)
  diagnostico?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TurnoService {
  /** Inserta un turno básico en la tabla `turnos`. Devuelve el registro creado o null si falla. */
  async crearTurno(input: TurnoInsert) {
    const payload = {
      id_paciente: input.id_paciente,
      id_especialista: input.id_especialista,
      fecha_turno:
        input.fecha_turno instanceof Date
          ? input.fecha_turno.toISOString()
          : input.fecha_turno,
          especialidad: input.especialidad,
    };
    const { data, error } = await supabase
      .from('turnos')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear turno:', error);
      throw error;
    }
    return data;
  }
  async obtenerTurnoPorId(id: string) {
    const { data, error} = await supabase.from("turnos").select("*").eq("id", id);
    if (error) {
      throw error
    }
    return data;
  }

  async obtenerTodosLosTurnos(){
    const { data, error} = await supabase.from("turnos").select("*");
    if (error) {
      throw error
    }
    return data;
  }
  async obtenerTurnoPorEspecialista(id_especialista: string) {
    const {data, error} = await supabase.from("turnos").select("*").eq("id_especialista", id_especialista);
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Devuelve el historial de turnos de un paciente enriquecido con los datos
   * del paciente y del especialista (de la tabla `profiles`).
   * - Fuente principal: `turnos` filtrado por `id_paciente`.
   * - Enriquecimiento: hace un fetch a `profiles` con los ids únicos
   *   de `turnos.id_paciente` y `turnos.id_especialista` y une en memoria.
   */
  async obtenerHistorialDeTurnosPorPaciente(id_paciente: string) {
    // 1) Traer turnos del paciente (más recientes primero)
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('id_paciente', id_paciente)
      .order('fecha_turno', { ascending: false });
    if (error) throw error;

    // 2) Recolectar ids únicos de perfiles (paciente y especialista)
    const idsSet = new Set<string>();
    for (const t of turnos ?? []) {
      if (t?.id_paciente) idsSet.add(String(t.id_paciente));
      if (t?.id_especialista) idsSet.add(String(t.id_especialista));
    }
    const ids = Array.from(idsSet);

    // 3) Cargar perfiles y mapear por id
    let profilesMap: Record<string, any> = {};
    if (ids.length) {
      const { data: perfiles, error: errProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);
      if (errProfiles) throw errProfiles;
      profilesMap = Object.fromEntries((perfiles ?? []).map((p: any) => [p.id, p]));
    }

    // 4) Enriquecer cada turno con objetos paciente y especialista
    const enriquecidos = (turnos ?? []).map((t: any) => ({
      ...t,
      paciente: profilesMap[t?.id_paciente as string] ?? null,
      especialista: profilesMap[t?.id_especialista as string] ?? null,
    }));

    return enriquecidos;
  }

  /** Devuelve los últimos 3 turnos de un paciente, ordenados por fecha más reciente. */
  async getUltimosTresTurnosPaciente(id_paciente: string) {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('id_paciente', id_paciente)
      .order('fecha_turno', { ascending: false })
      .limit(3);
    if (error) throw error;
    return data;
  }

  /** Actualiza el campo `estado` del turno por id. */
  private async actualizarEstado(
    id: string,
    estado: 'confirmado' | 'cancelado' | 'rechazado' | 'completado' | 'archivado'
  ) {
    const { data, error } = await supabase
      .from('turnos')
      .update({ estado })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  /** Marca el turno como confirmado */
  async confirmarTurno(id: string) {
    return this.actualizarEstado(id, 'confirmado');
  }

  /** Marca el turno como cancelado */
  async cancelarTurno(id: string) {
    return this.actualizarEstado(id, 'cancelado');
  }

  /** Cancela el turno con motivo y lo persiste en `motivo_cancelacion`. */
  async cancelarTurnoConMotivo(id: string, motivo: string) {
    const { data, error } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado', mensaje_rechazo: motivo })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  /** Marca el turno como rechazado */
  async rechazarTurno(id: string) {
    return this.actualizarEstado(id, 'rechazado');
  }

  /** Marca el turno como completado */
  async completarTurno(id: string) {
    return this.actualizarEstado(id, 'completado');
  }

  /** Marca el turno como archivado */
  async archivarTurno(id: string) {
    return this.actualizarEstado(id, 'archivado');
  }

  /** Guarda una reseña de un turno en la columna `resena`. */
  async guardarResena(id: string, resenia: string) {
    const { data, error } = await supabase
      .from('turnos')
      .update({ resenia })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  /** Inserta una historia clínica en `historias_clinicas`. */
  async guardarHistoriaClinica(input: HistoriaClinicaInsert) {
    const ids = Array.isArray(input.ids_especialistas)
      ? (input.ids_especialistas as (string | null | undefined)[]).filter(Boolean) as string[]
      : [];
    const idsDistinct = Array.from(new Set(ids));

    const payload: any = {
      id_paciente: input.id_paciente,
      ids_especialistas: idsDistinct,
      fecha_registro:
        input.fecha_registro instanceof Date
          ? input.fecha_registro.toISOString()
          : input.fecha_registro ?? null,
      altura: input.altura ?? null,
      peso: input.peso ?? null,
      temperatura: input.temperatura ?? null,
      presion: input.presion ?? null,
      diagnostico: input.diagnostico ?? null,
    };

    const { data, error } = await supabase
      .from('historias_clinicas')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Devuelve historias clínicas del paciente en las que participó el especialista indicado.
   * Filtra por `id_paciente` y verifica que `ids_especialistas` contenga `id_especialista`.
   */
  async buscarHistoriaPorEspecialista(id_especialista: string) {
    const { data, error } = await supabase
      .from('historias_clinicas')
      .select('*')
      .contains('ids_especialistas', [id_especialista]);
    if (error) throw error;
    return data;
  }


}
