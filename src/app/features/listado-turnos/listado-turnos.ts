import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnoService } from '../../services/turno.service';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
@Component({
  selector: 'app-listado-turnos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listado-turnos.html',
  styleUrl: './listado-turnos.css'
})
export class ListadoTurnos implements OnInit {
  @Output() ejecutar = new EventEmitter<any>();
  @Output() resenar = new EventEmitter<any>();
  @Output() calificar = new EventEmitter<any>();
  @Output() cancelarMotivo = new EventEmitter<any>();
  turnos: any[] = [];
  cargando = true;
  error = '';
  esEspecialista = false;
  modalAbierto = false;
  seleccionado: any | null = null;
  verResena = false;
  filtrosAbiertos = false;
  ordenActual: 'fecha_desc' | 'fecha_asc' | 'estado' | 'especialidad' | 'paciente' = 'fecha_desc';

  constructor(
    private turnoService: TurnoService,
    private usuarioService: UsuarioService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  trackById = (_: number, t: any) => t.id;

  async ngOnInit() {
    await this.loadTurnos();
  }

  private async loadTurnos() {
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

  async reload() {
    this.cargando = true;
    await this.loadTurnos();
    this.aplicarOrden();
  }

  abrirModal(t: any) {
    this.seleccionado = t;
    this.verResena = false;
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.seleccionado = null;
    this.verResena = false;
  }

  async actualizarEstadoTurno(id: string, estado: 'confirmado' | 'cancelado' | 'archivado') {
    try {
      let updated: any = null;
      if (estado === 'confirmado') updated = await this.turnoService.confirmarTurno(id);
      else if (estado === 'cancelado') updated = await this.turnoService.cancelarTurno(id);
      else if (estado === 'archivado') updated = await this.turnoService.archivarTurno(id);
      this.turnos = this.turnos.map((t) => (t.id === id ? { ...t, ...updated } : t));
      const msg = estado === 'confirmado' ? 'Turno confirmado' : estado === 'cancelado' ? 'Turno cancelado' : 'Turno archivado';
      this.toast.success(msg);
      this.cerrarModal();
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo actualizar el turno');
    }
  }

  confirmarTurno() {
    if (!this.seleccionado?.id) return;
    if (this.seleccionado?.estado === 'confirmado') {
      this.ejecutar.emit(this.seleccionado);
      this.cerrarModal();
      return;
    }
    this.actualizarEstadoTurno(this.seleccionado.id, 'confirmado');
  }

  cancelarTurno() {
    if (!this.seleccionado?.id) return;
    this.solicitarCancelacion();
  }

  archivarTurno() {
    if (!this.seleccionado?.id) return;
    this.actualizarEstadoTurno(this.seleccionado.id, 'archivado');
  }

  cargarResena() {
    if (!this.seleccionado) return;
    this.resenar.emit(this.seleccionado);
    this.cerrarModal();
  }

  toggleVerResena() {
    this.verResena = !this.verResena;
  }

  toggleFiltros() {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  ordenarPor(tipo: 'fecha_desc' | 'fecha_asc' | 'estado' | 'especialidad' | 'paciente') {
    this.ordenActual = tipo;
    this.aplicarOrden();
    this.filtrosAbiertos = false;
  }

  private aplicarOrden() {
    const byString = (a: any, b: any, key: string) => String(a?.[key] ?? '').localeCompare(String(b?.[key] ?? ''));
    const byPaciente = (a: any, b: any) => {
      const an = `${a?.paciente?.nombre ?? ''} ${a?.paciente?.apellido ?? ''}`.trim();
      const bn = `${b?.paciente?.nombre ?? ''} ${b?.paciente?.apellido ?? ''}`.trim();
      return an.localeCompare(bn);
    };
    const byFecha = (a: any, b: any) => new Date(a.fecha_turno).getTime() - new Date(b.fecha_turno).getTime();

    const arr = [...this.turnos];
    switch (this.ordenActual) {
      case 'fecha_asc':
        arr.sort(byFecha);
        break;
      case 'fecha_desc':
        arr.sort((a, b) => byFecha(b, a));
        break;
      case 'estado':
        arr.sort((a, b) => byString(a, b, 'estado'));
        break;
      case 'especialidad':
        arr.sort((a, b) => byString(a, b, 'especialidad'));
        break;
      case 'paciente':
        arr.sort(byPaciente);
        break;
    }
    this.turnos = arr;
  }

  calificarAtencion() {
    if (!this.seleccionado) return;
    this.calificar.emit(this.seleccionado);
    this.cerrarModal();
  }

  solicitarCancelacion() {
    if (!this.seleccionado) return;
    this.cancelarMotivo.emit(this.seleccionado);
    this.cerrarModal();
  }
}
