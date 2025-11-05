import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

export interface TurnoInsert {
  id_paciente: string;
  id_especialista: string;
  fecha_turno: Date | string; // timestamp with time zone
  estado?: string | null;
  especialidad: string | null;
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
}

