import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

export interface TurnoInsert {
  id_paciente: string;
  id_especialista: string;
  fecha_turno: Date | string; // timestamp with time zone
  estado?: string | null;
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
      estado: input.estado ?? null,
    };

    const { data, error } = await supabase
      .from('turnos')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear turno:', error);
      return null;
    }

    return data;
  }
}

