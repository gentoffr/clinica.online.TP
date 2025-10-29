import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  async obtenerUsuarioPorEmail(email: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error al obtener usuario por email:', error);
      return null;
    }

    return data;
  }
  async obtenerUsuarioPorId(id: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();

    if (error) {
      console.error('Error al obtener usuario por ID:', error);
      return null;
    }

    return data;
  }
  async obtenerTodosLosUsuarios() {
    const { data, error } = await supabase.from('profiles').select('*');

    if (error) {
      console.error('Error al obtener todos los usuarios:', error);
      return [];
    }

    return data;
  }
  async obtenerTodosLosEspecialistas() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('especialidad', 'is', null);

    if (error) {
      console.error('Error al obtener todos los especialistas:', error);
      return [];
    }

    return data;
  }
  async obtenerUsuariosPorEspecialidad(especialidad: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('especialidad', especialidad);
    if (error) throw error;
    return data;
  }
  async obtenerEspecialidadesDisponibles() {
    const { data, error } = await supabase
      .from('especialidades')
      .select('*');
    if (error) throw error;
    return data;
  }
  
}
