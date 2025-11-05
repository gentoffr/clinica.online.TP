import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnoService } from '../../../../services/turno.service';
import { UsuarioService } from '../../../../services/usuario.service';
import { AuthService } from '../../../../services/auth.service';
import { ToastService } from '../../../../services/toast.service';
import { supabase } from '../../../../services/supabase.client';
@Component({
  selector: 'app-listado-turnos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listado-turnos.html',
  styleUrl: './listado-turnos.css'
})
export class ListadoTurnos implements OnInit {
  turnos: any[] = [];
  cargando = true;
  error = '';
  esEspecialista = false;
  modalAbierto = false;
  seleccionado: any | null = null;

  constructor(
    private turnoService: TurnoService,
    private usuarioService: UsuarioService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  trackById = (_: number, t: any) => t.id;

  async ngOnInit() {
    try {
      const me = this.auth.user ?? (await this.auth.currentUser());
      this.esEspecialista = !!me?.especialidad;
      let raws: any[] = [];
      if (this.esEspecialista && me?.id) {
        raws = await this.turnoService.obtenerTurnoPorEspecialista(me.id as string);
      } else {
        raws = await this.turnoService.obtenerTodosLosTurnos();
      }
      // Enriquecer cada turno con datos del especialista y del paciente
      const completos = [] as any[];
      for (const t of raws ?? []) {
        let especialista = null;
        let paciente = null;
        try {
          especialista = t.especialista || (t.id_especialista ? await this.usuarioService.obtenerUsuarioPorId(t.id_especialista) : null);
        } catch {}
        try {
          paciente = t.paciente || (t.id_paciente ? await this.usuarioService.obtenerUsuarioPorId(t.id_paciente) : null);
        } catch {}
        completos.push({ ...t, especialista, paciente });
      }
      this.turnos = completos;
    } catch (e: any) {
      this.error = e?.message ?? 'Error al cargar turnos';
    } finally {
      this.cargando = false;
    }
  }

  abrirModal(t: any) {
    if (!this.esEspecialista) return;
    this.seleccionado = t;
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.seleccionado = null;
  }

  async actualizarEstadoTurno(id: string, estado: 'confirmado' | 'cancelado') {
    try {
      const { data, error } = await supabase
        .from('turnos')
        .update({ estado })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      this.turnos = this.turnos.map((t) => (t.id === id ? { ...t, ...data } : t));
      this.toast.success(estado === 'confirmado' ? 'Turno confirmado' : 'Turno cancelado');
      this.cerrarModal();
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo actualizar el turno');
    }
  }

  confirmarTurno() {
    if (!this.seleccionado?.id) return;
    this.actualizarEstadoTurno(this.seleccionado.id, 'confirmado');
  }

  cancelarTurno() {
    if (!this.seleccionado?.id) return;
    this.actualizarEstadoTurno(this.seleccionado.id, 'cancelado');
  }
}

