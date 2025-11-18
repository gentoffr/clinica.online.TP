import { Component, OnInit, EventEmitter, Output, Input, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnoService } from '../../services/turno.service';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { EstadoTurnoPipe } from '../../shared/pipes/estado-turno.pipe';
import { HoverClassDirective } from '../../shared/directives/hover-class.directive';

export type OrdenTurno = 'fecha_desc' | 'fecha_asc' | 'estado' | 'especialidad' | 'paciente';

@Component({
  selector: 'app-listado-turnos',
  standalone: true,
  imports: [CommonModule, EstadoTurnoPipe, HoverClassDirective],
  templateUrl: './listado-turnos.html',
  styleUrl: './listado-turnos.css'
})

export class ListadoTurnos implements OnInit {
  @Output() ejecutar = new EventEmitter<any>();
  @Output() resenar = new EventEmitter<any>();
  @Output() calificar = new EventEmitter<any>();
  @Output() cancelarMotivo = new EventEmitter<any>();
  @Output() ordenPorChange = new EventEmitter<OrdenTurno>();
  @Input() mostrarControles = true;
  @Input()
  set ordenPor(value: OrdenTurno | null) {
    if (!value || value === this.ordenActual) return;
    this.ordenActual = value;
    this.aplicarFiltrosYOrden();
  }
  turnos: any[] = [];
  private turnosBase: any[] = [];
  cargando = true;
  error = '';
  esEspecialista = false;
  modalAbierto = false;
  seleccionado: any | null = null;
  verResena = false;
  verMotivoCancel = false;
  filtrosAbiertos = false;
  ordenActual: OrdenTurno = 'fecha_desc';
  filtroEspecialidad: string | null = null;
  especialidades: any[] = [];
  especialidadesCargando = false;
  submenuEspecialidadesAbierto = false;
  private readonly etiquetasOrden: Record<OrdenTurno, string> = {
    fecha_desc: 'Fecha más reciente',
    fecha_asc: 'Fecha más antigua',
    estado: 'Estado',
    especialidad: 'Especialidad',
    paciente: 'Paciente',
  };

  constructor(
    private turnoService: TurnoService,
    private usuarioService: UsuarioService,
    private auth: AuthService,
    private toast: ToastService,
    private elRef: ElementRef
  ) {}

  trackById = (_: number, t: any) => t.id;

  async ngOnInit() {
    await this.loadTurnos();
    this.cargarEspecialidades();
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
      this.turnosBase = completos;
      this.aplicarFiltrosYOrden();
    } catch (e: any) {
      this.error = e?.message ?? 'Error al cargar turnos';
    } finally {
      this.cargando = false;
    }
  }

  private async cargarEspecialidades() {
    this.especialidadesCargando = true;
    try {
      this.especialidades = await this.usuarioService.obtenerEspecialidadesDisponibles();
    } catch (e) {
      console.warn('No se pudieron cargar las especialidades', e);
      this.especialidades = [];
    } finally {
      this.especialidadesCargando = false;
    }
  }

  async reload() {
    this.cargando = true;
    await this.loadTurnos();
    this.aplicarFiltrosYOrden();
  }

  abrirModal(t: any) {
    this.seleccionado = t;
    this.verResena = false;
    this.verMotivoCancel = false;
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.seleccionado = null;
    this.verResena = false;
    this.verMotivoCancel = false;
  }

  async actualizarEstadoTurno(id: string, estado: 'confirmado' | 'cancelado' | 'archivado') {
    try {
      let updated: any = null;
      if (estado === 'confirmado') updated = await this.turnoService.confirmarTurno(id);
      else if (estado === 'cancelado') updated = await this.turnoService.cancelarTurno(id);
      else if (estado === 'archivado') updated = await this.turnoService.archivarTurno(id);
      this.turnos = this.turnos.map((t) => (t.id === id ? { ...t, ...updated } : t));
      this.turnosBase = this.turnosBase.map((t) => (t.id === id ? { ...t, ...updated } : t));
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

  toggleMotivoCancelacion() {
    this.verMotivoCancel = !this.verMotivoCancel;
  }

  get motivoCancelacion(): string {
    const raw = this.seleccionado?.mensaje_rechazo ?? this.seleccionado?.motivo_cancelacion ?? '';
    return typeof raw === 'string' ? raw.trim() : '';
  }

  toggleFiltros() {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    if (!this.filtrosAbiertos) {
      this.submenuEspecialidadesAbierto = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.filtrosAbiertos) return;
    const target = event.target as Node | null;
    if (target && this.elRef.nativeElement.contains(target)) return;
    this.filtrosAbiertos = false;
    this.submenuEspecialidadesAbierto = false;
  }

  ordenarPor(tipo: OrdenTurno) {
    if (this.ordenActual === tipo) {
      this.filtrosAbiertos = false;
      return;
    }
    this.ordenActual = tipo;
    this.aplicarFiltrosYOrden();
    this.filtrosAbiertos = false;
    this.submenuEspecialidadesAbierto = false;
    this.ordenPorChange.emit(this.ordenActual);
  }

  private aplicarFiltrosYOrden() {
    let arr = [...this.turnosBase];
    if (this.filtroEspecialidad) {
      const filtro = this.filtroEspecialidad.toLowerCase();
      arr = arr.filter((t) => (t?.especialidad || '').toLowerCase() === filtro);
    }
    this.turnos = this.aplicarOrden(arr);
  }

  private aplicarOrden(source: any[]) {
    const byString = (a: any, b: any, key: string) => String(a?.[key] ?? '').localeCompare(String(b?.[key] ?? ''));
    const byPaciente = (a: any, b: any) => {
      const an = `${a?.paciente?.nombre ?? ''} ${a?.paciente?.apellido ?? ''}`.trim();
      const bn = `${b?.paciente?.nombre ?? ''} ${b?.paciente?.apellido ?? ''}`.trim();
      return an.localeCompare(bn);
    };
    const byFecha = (a: any, b: any) => new Date(a.fecha_turno).getTime() - new Date(b.fecha_turno).getTime();

    const arr = [...source];
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
    return arr;
  }

  get etiquetaOrdenActual() {
    return this.etiquetasOrden[this.ordenActual];
  }

  get etiquetaFiltroEspecialidad() {
    if (!this.filtroEspecialidad) return 'Todas las especialidades';
    const match = this.especialidades.find(
      (e: any) => this.obtenerValorEspecialidad(e).toLowerCase() === this.filtroEspecialidad?.toLowerCase()
    );
    return match ? this.obtenerEtiquetaEspecialidad(match) : this.filtroEspecialidad;
  }

  toggleSubmenuEspecialidades(event: MouseEvent) {
    event.stopPropagation();
    this.submenuEspecialidadesAbierto = !this.submenuEspecialidadesAbierto;
  }

  seleccionarEspecialidadFiltro(valor: string | null) {
    this.filtroEspecialidad = valor;
    this.filtrosAbiertos = false;
    this.submenuEspecialidadesAbierto = false;
    this.aplicarFiltrosYOrden();
  }

  obtenerEtiquetaEspecialidad(item: any) {
    return item?.nombre || item?.especialidad || 'Sin nombre';
  }

  obtenerValorEspecialidad(item: any) {
    return item?.especialidad || item?.nombre || '';
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
