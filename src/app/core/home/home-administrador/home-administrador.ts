// home-administrador.component.ts
import { Component, OnInit, ViewChild, AfterViewInit, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { TurnoService } from '../../../services/turno.service';
import { UsuarioService } from '../../../services/usuario.service';
import { ToastService } from '../../../services/toast.service';
import { ListadoUsuarios } from '../../../features/listado-usuarios/listado-usuarios';
import { RegistroTurno } from '../registro-turno/registro-turno';
import { Router } from '@angular/router';
import { PerfilModalComponent } from '../../../features/perfil-modal/perfil-modal';

declare const Highcharts: any;
type AdminUser = {
  nombre: any;
  email: any;
  avatarUrl: any | any[];
};

@Component({
  selector: 'app-home-administrador',
  standalone: true,
  imports: [CommonModule, FormsModule, ListadoUsuarios, RegistroTurno, PerfilModalComponent],
  templateUrl: './home-administrador.html',
  styleUrls: ['./home-administrador.scss'],
})
export class HomeAdministrador implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(RegistroTurno) registroTurno!: RegistroTurno;
  @ViewChild('listadoScroll') listadoScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('chartTurnosDia') chartTurnosDia?: ElementRef<HTMLDivElement>;
  menuCollapsed = false;
  user!: any;
  sacandoTurno = false;
  avatarCargando = true;
  perfilAbierto = false;
  mostrarFlechaArriba = false;
  mostrarFlechaAbajo = false;
  chartCargando = false;
  chartError = '';
  especialidades: any[] = [];
  especialidadesCargando = false;
  filtroEspecialidad: string | null = null;
  entregadosDesde = '';
  entregadosHasta = '';
  turnosEntregados: any[] = [];
  turnosEntregadosCargando = false;
  turnosEntregadosError = '';
  activePanel: 'usuarios' | 'reportes' = 'usuarios';
  private chartData: { fecha: string; total: number }[] = [];
  private chartInstance: any = null;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  constructor(
    public authService: AuthService,
    private router: Router,
    private turnoService: TurnoService,
    private usuarioService: UsuarioService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    this.avatarCargando = true;
    this.entregadosHasta = this.formatearFechaInput(new Date());
    this.entregadosDesde = this.formatearFechaInput(this.sumarDias(new Date(), -7));
    this.user = await this.authService.currentUser();
    console.log('[HomeAdministrador] User data:', this.user);
    this.avatarCargando = false;
    this.cargarEspecialidades();
  }

  ngAfterViewInit() {
    setTimeout(() => this.actualizarEstadoListado(), 0);
    this.iniciarObservadoresScroll();
    this.cargarReporteTurnosDia();
    this.cargarTurnosEntregados();
  }

  ngOnDestroy(): void {
    this.limpiarObservadoresScroll();
    this.chartInstance?.destroy?.();
  }
  abrirPerfil(){ this.perfilAbierto = true; }
  cerrarPerfil(){ this.perfilAbierto = false; }
  toggleMenu(): void {
    console.log(this.authService.user);
    this.menuCollapsed = !this.menuCollapsed;
  }
  iniciarSacarTurno() {
    this.sacandoTurno = true;
  }

  onSacarTurnoOpen(open: boolean) {
    this.sacandoTurno = open;
  }

  get avatarUrl(): string | null {
    const arr = this.user?.imagen_perfil as string[] | undefined | null;
    return Array.isArray(arr) ? arr[0] || null : null;
  }

  get miniUrl(): string | null {
    const arr = this.user?.imagen_perfil as string[] | undefined | null;
    if (!Array.isArray(arr)) return null;
    return arr[1] || arr[0] || null;
  }

  get inicial(): string {
    const base = (this.user?.nombre || this.user?.email || '?') as string;
    return (base?.charAt(0) || '?').toUpperCase();
  }

  // home-administrador.component.ts (o el contenedor)
  async onTurno(payload: any) {
    try {
      // Resolver paciente
      let id_paciente: string | null = null;
      if (payload.emailPaciente) {
        const u = await this.usuarioService.obtenerUsuarioPorEmail(payload.emailPaciente);
        if (!u) {
          this.toast.error('No se encontró paciente con ese email');
          return;
        }
        id_paciente = u.id;
      } else {
        id_paciente = this.authService.user?.id ?? null;
      }

      if (!id_paciente) {
        this.toast.error('Paciente no disponible');
        return;
      }

      // Resolver especialista
      const id_especialista: string | null = payload.especialistaId ?? null;
      if (!id_especialista) {
        this.toast.error('Especialista no disponible');
        return;
      }

      // Construir fecha completa ISO a partir de fecha (YYYY-MM-DD) y hora (HH:mm)
      const fecha_turno = new Date(`${payload.fecha}T${payload.hora}:00`);

      const creado = await this.turnoService.crearTurno({
        id_paciente,
        id_especialista,
        fecha_turno,
        especialidad: payload.especialidad,
      });

      if (!creado) {
        this.toast.error('No se pudo crear el turno');
        return;
      }

      this.toast.success('Turno creado correctamente');
      // Cerrar wizard de registro de turno
      try { this.registroTurno?.close(); } catch {}
      // Podríamos cerrar el panel o refrescar listados aquí
    } catch (e: any) {
      console.error('Error creando turno:', e);
      this.toast.error(e?.message || 'Error creando turno');
    }
  }

  async cerrarSesion() {
    await this.authService.logout();
    this.router.navigate(['/inicio']);
  }

  get chartTieneDatos() {
    return (this.chartData?.length ?? 0) > 0;
  }

  onUsuariosScroll() {
    this.actualizarEstadoListado();
  }

  scrollUsuarios(direction: 1 | -1) {
    const el = this.listadoScroll?.nativeElement;
    if (!el) return;
    const step = 220;
    el.scrollBy({ top: direction * step, behavior: 'smooth' });
  }

  refrescarReporte() {
    this.cargarReporteTurnosDia();
  }

  mostrarPanel(panel: 'usuarios' | 'reportes') {
    if (this.activePanel === panel) return;
    this.activePanel = panel;
    if (panel === 'reportes') {
      this.limpiarObservadoresScroll();
      if (!this.chartCargando && !this.chartTieneDatos) {
        this.cargarReporteTurnosDia();
      } else {
        window.setTimeout(() => this.renderChartTurnosDia(), 0);
      }
      if (!this.turnosEntregadosCargando && !this.turnosEntregados.length) {
        this.cargarTurnosEntregados();
      }
    } else {
      window.setTimeout(() => {
        this.iniciarObservadoresScroll();
        this.actualizarEstadoListado();
      }, 0);
    }
  }

  private actualizarEstadoListado() {
    const el = this.listadoScroll?.nativeElement;
    if (!el) {
      this.mostrarFlechaArriba = false;
      this.mostrarFlechaAbajo = false;
      return;
    }
    const tolerance = 8;
    this.mostrarFlechaArriba = el.scrollTop > tolerance;
    this.mostrarFlechaAbajo = el.scrollTop + el.clientHeight < el.scrollHeight - tolerance;
  }

  private iniciarObservadoresScroll() {
    this.limpiarObservadoresScroll();
    const el = this.listadoScroll?.nativeElement;
    if (!el) return;
    this.resizeObserver = new ResizeObserver(() => this.actualizarEstadoListado());
    this.resizeObserver.observe(el);
    this.mutationObserver = new MutationObserver(() => this.actualizarEstadoListado());
    this.mutationObserver.observe(el, { childList: true, subtree: true });
  }

  private limpiarObservadoresScroll() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
  }

  private async cargarReporteTurnosDia() {
    this.chartCargando = true;
    this.chartError = '';
    try {
      this.chartData =
        (await this.turnoService.contarTurnosPorDia(undefined, undefined, this.filtroEspecialidad)) ?? [];
      setTimeout(() => this.renderChartTurnosDia(), 0);
    } catch (e: any) {
      this.chartError = e?.message ?? 'No se pudo cargar el reporte';
    } finally {
      this.chartCargando = false;
    }
  }

  private renderChartTurnosDia() {
    if (!this.chartTurnosDia?.nativeElement || !this.chartTieneDatos) {
      this.chartInstance?.destroy?.();
      this.chartInstance = null;
      return;
    }
    if (typeof Highcharts === 'undefined') {
      this.chartError = 'Highcharts no se cargó correctamente';
      return;
    }
    const categories = this.chartData.map((row) => row.fecha);
    const data = this.chartData.map((row) => row.total);
    this.chartInstance?.destroy?.();
    this.chartInstance = Highcharts.chart(this.chartTurnosDia.nativeElement, {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
      },
      title: { text: '' },
      xAxis: {
        categories,
        labels: { style: { color: '#d0d5dd' } },
      },
      yAxis: {
        min: 0,
        title: { text: 'Turnos' },
        gridLineColor: 'rgba(255,255,255,0.08)',
        labels: { style: { color: '#d0d5dd' } },
      },
      series: [
        {
          name: 'Turnos',
          type: 'column',
          data,
          color: '#8fd44b',
        },
      ],
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: '#16181b',
        borderColor: '#8fd44b',
        style: { color: '#f2f2f2' },
        formatter(this: any) {
          return `<strong>${this.x}</strong><br/>Turnos: ${this.y}`;
        },
      },
    });
  }

  @HostListener('window:resize')
  onResize() {
    if (this.chartInstance) {
      this.chartInstance.reflow?.();
    }
  }

  trackTurnoEntregado = (_: number, turno: any) => turno.id;

  onFiltroEspecialidadChange(valor: string) {
    const normalizado = valor?.trim() ? valor : null;
    if (normalizado === this.filtroEspecialidad) return;
    this.filtroEspecialidad = normalizado;
    this.cargarReporteTurnosDia();
  }

  async cargarTurnosEntregados() {
    const desde = this.parseFechaFiltro(this.entregadosDesde);
    const hasta = this.parseFechaFiltro(this.entregadosHasta, true);
    if (desde && hasta && desde > hasta) {
      this.turnosEntregadosError = 'El rango seleccionado no es válido';
      this.turnosEntregados = [];
      this.turnosEntregadosCargando = false;
      this.toast.warning('Revisá las fechas seleccionadas');
      return;
    }
    this.turnosEntregadosCargando = true;
    this.turnosEntregadosError = '';
    try {
      const raws = await this.turnoService.obtenerTurnosEntregados(desde, hasta);
      this.turnosEntregados = await this.enriquecerTurnosConPerfiles(raws ?? []);
    } catch (e: any) {
      console.error('Error al cargar turnos entregados', e);
      this.turnosEntregadosError = e?.message ?? 'No se pudo cargar el listado';
      this.turnosEntregados = [];
    } finally {
      this.turnosEntregadosCargando = false;
    }
  }

  private async enriquecerTurnosConPerfiles(turnos: any[]) {
    const ids = Array.from(
      new Set(
        (turnos ?? []).flatMap((t) => [t?.id_paciente, t?.id_especialista]).filter(Boolean) as string[]
      )
    );
    let mapa: Record<string, any> = {};
    if (ids.length) {
      try {
        const perfiles = await this.usuarioService.obtenerUsuariosPorIds(ids);
        mapa = Object.fromEntries((perfiles ?? []).map((p: any) => [p.id, p]));
      } catch (e) {
        console.warn('No se pudieron enriquecer los turnos con perfiles', e);
      }
    }
    return (turnos ?? []).map((t: any) => ({
      ...t,
      paciente: t.paciente ?? mapa[t?.id_paciente as string] ?? null,
      especialista: t.especialista ?? mapa[t?.id_especialista as string] ?? null,
    }));
  }

  private sumarDias(fecha: Date, dias: number) {
    const copia = new Date(fecha);
    copia.setDate(copia.getDate() + dias);
    return copia;
  }

  private formatearFechaInput(fecha: Date) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  obtenerEtiquetaEspecialidad(item: any) {
    return item?.nombre || item?.especialidad || 'Sin nombre';
  }

  obtenerValorEspecialidad(item: any) {
    return item?.especialidad || item?.nombre || '';
  }

  nombreCompleto(usuario: any, fallback = 'Sin datos') {
    if (!usuario) return fallback;
    const nombre = (usuario?.nombre || '').trim();
    const apellido = (usuario?.apellido || '').trim();
    const full = `${nombre} ${apellido}`.trim();
    if (full) return full;
    return (usuario?.email || fallback) as string;
  }

  private parseFechaFiltro(valor: string, finDelDia = false) {
    if (!valor) return null;
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return null;
    if (finDelDia) {
      fecha.setHours(23, 59, 59, 999);
    } else {
      fecha.setHours(0, 0, 0, 0);
    }
    return fecha;
  }
}
