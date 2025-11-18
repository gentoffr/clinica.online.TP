// src/app/registro-turno/registro-turno.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, Output, EventEmitter, signal, Input } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UsuarioService } from '../../../services/usuario.service';
import { TurnoService } from '../../../services/turno.service';
import { CapitalizarPipe } from '../../../shared/pipes/capitalizar.pipe';

type DiaListado = { iso: string; date: Date; etiqueta: string; corto: string; pasado: boolean };

@Component({
  selector: 'app-registro-turno',
  templateUrl: './registro-turno.html',
  styleUrls: ['./registro-turno.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, CapitalizarPipe],
})
export class RegistroTurno implements OnInit {
  // Wizard
  private _abierto = signal(false);
  abierto = () => this._abierto();
  @Output() openedChange = new EventEmitter<boolean>();
  @Output() submitTurno = new EventEmitter<any>();
  @Input() requiereEmailPaciente = false;
  @Input() loading = false;
  toggle() {
    const next = !this._abierto();
    this._abierto.set(next);
    this.openedChange.emit(next);
  }
  close() {
    if (this._abierto()) {
      this._abierto.set(false);
      this.openedChange.emit(false);
    }
    this._paso.set(1);
  }

  private _paso = signal(1);
  paso = () => this._paso();
  siguiente() {
    this._paso.set(Math.min(3, this._paso() + 1));
  }
  atras() {
    this._paso.set(Math.max(1, this._paso() - 1));
  }
  listaEspecialista: any[] = [];
  // Formularios
  formPaso1!: FormGroup;
  formPaso2!: FormGroup;
  especialistaSeleccionado: any = null;
  // Catálogos
  especialidades: any[] = [];

  especialistas: any[] = [];
  especialistasFiltrados: any[] = [];

  // Modales
  modalTurnosAbierto = false;
  modalEspAbierto = false; // especialidades
  modalMedAbierto = false; // especialistas

  // Días/slots (ventana mensual)
  dias: DiaListado[] = [];
  idxActivo = 0;
  slotsActivos: string[] = [];
  readonly slotStepMin = 30;
  readonly horario = { inicio: 9, fin: 18 };
  hoyISO = this.toISODate(new Date());
  mesActualEtiqueta = '';
  private turnosBloqueados = new Set<string>();
  private mesBase = this.inicioDelMes(new Date());
  private swipeStartX: number | null = null;
  private readonly swipeThresholdPx = 60;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private turnoService: TurnoService
  ) {}

  async ngOnInit() {
    this.especialistas = await this.usuarioService.obtenerTodosLosEspecialistas();
    this.especialidades = await this.usuarioService.obtenerEspecialidadesDisponibles();
    console.log('[RegistroTurno] Especialistas desde servicio:', this.especialistas);
    this.formPaso1 = this.fb.group({
      especialidad: ['', Validators.required],
      especialista: ['', Validators.required],
    });

    this.formPaso2 = this.fb.group({
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      // Email paciente se muestra/valida solo para admin
      emailPaciente: [
        '',
        this.requiereEmailPaciente ? [Validators.required, Validators.email] : [],
      ],
    });

    this.generarDias();
  }

  // Open/close modales
  abrirModalEspecialidades() {
    this.modalEspAbierto = true;
  }
  cerrarModalEspecialidades() {
    this.modalEspAbierto = false;
  }

  abrirModalEspecialistas() {
    if (!this.formPaso1.value.especialidad) return;
    this.modalMedAbierto = true;
  }
  cerrarModalEspecialistas() {
    this.modalMedAbierto = false;
  }

  abrirModalTurnos() {
    this.modalTurnosAbierto = true;
    console.log()
  }
  cerrarModalTurnos() {
    this.modalTurnosAbierto = false;
  }

  // Selecciones
  seleccionarEspecialidad(especialidad: string) {
    console.log('Especialidad seleccionada:', especialidad);
    this.formPaso1.patchValue({ especialidad: especialidad, especialista: '' });
    this.especialistasFiltrados = this.especialistas.filter((e) => e.especialidad === especialidad);
    this.cerrarModalEspecialidades();
  }

  async seleccionarEspecialista(especialista: any) {
    this.especialistaSeleccionado = especialista;
    this.formPaso1.patchValue({ especialista: especialista.nombre + ' ' + especialista.apellido });
    this.formPaso2.patchValue({ fecha: '', hora: '' });
    this.cerrarModalEspecialistas();
    await this.cargarTurnosEspecialista(especialista?.id);
    console.log("", especialista);
  }

  private async cargarTurnosEspecialista(id: string | undefined) {
    this.turnosBloqueados = new Set<string>();
    if (!id) {
      this.cargarSlots(this.idxActivo);
      return;
    }
    try {
      const turnos = await this.turnoService.obtenerTurnoPorEspecialista(id);
      console.log(turnos)
      const bloqueados = new Set<string>();

      (turnos ?? []).forEach((turno: any) => {
        if (!turno?.fecha_turno) return;
        const fechaTurno = new Date(turno.fecha_turno);
        if (isNaN(fechaTurno.getTime())) return;
        bloqueados.add(this.claveDesdeFecha(fechaTurno));
        const sumaUnaHora = new Date(fechaTurno.getTime() + 60 * 60 * 1000);
        bloqueados.add(this.claveDesdeFecha(sumaUnaHora));
        console.log("bloqueados",bloqueados)
      });

      this.turnosBloqueados = bloqueados;
    } catch (error) {
      console.error('No se pudieron cargar los turnos del especialista', error);
      this.turnosBloqueados = new Set<string>();
    } finally {
      this.cargarSlots(this.idxActivo);
    }
  }

  seleccionarDia(i: number) {
    if (!this.dias[i] || this.dias[i].pasado) return;
    this.idxActivo = i;
    this.cargarSlots(i);
  }

  seleccionarHora(hhmm: string) {
    const dia = this.dias[this.idxActivo];
    if (!dia) return;
    this.formPaso2.patchValue({ fecha: dia.iso, hora: hhmm });
    this.cerrarModalTurnos();
  }

  enviar() {
    const payload: any = {
      especialidad: this.formPaso1.value.especialidad,
      especialista: this.formPaso1.value.especialista,
      especialistaId: this.especialistaSeleccionado?.id ?? null,
      fecha: this.formPaso2.value.fecha,
      hora: this.formPaso2.value.hora,
    };
    if (this.requiereEmailPaciente) {
      payload.emailPaciente = this.formPaso2.value.emailPaciente;
    }
    
    this.submitTurno.emit(payload);
  }

  especialidadNombre(especialidad: string) {
    return this.especialidades.find((e) => e.especialidad === especialidad)?.nombre;
  }
  especialistaNombre(especialista: string) {
    return (
      this.especialistas.find((m) => m.especialista === especialista) ||
      this.especialistasFiltrados.find((m) => m.especialista === especialista)
    )?.nombre;
  }

  cambiarMes(delta: number) {
    if (!delta) return;
    const siguiente = new Date(this.mesBase);
    siguiente.setMonth(siguiente.getMonth() + delta);
    const hoyMes = this.inicioDelMes(this.obtenerHoy());
    if (siguiente.getTime() < hoyMes.getTime()) return;
    this.mesBase = this.inicioDelMes(siguiente);
    this.generarDias(this.mesBase);
  }

  puedeIrMesAnterior() {
    const hoyMes = this.inicioDelMes(this.obtenerHoy());
    return this.mesBase.getTime() > hoyMes.getTime();
  }

  onCalendarioPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse') return;
    this.swipeStartX = event.clientX;
  }

  onCalendarioPointerUp(event: PointerEvent) {
    if (event.pointerType === 'mouse') return;
    if (this.swipeStartX === null) return;
    const delta = event.clientX - this.swipeStartX;
    this.evaluarSwipe(delta);
    this.swipeStartX = null;
  }

  onCalendarioPointerLeave() {
    this.swipeStartX = null;
  }

  private evaluarSwipe(delta: number) {
    if (Math.abs(delta) < this.swipeThresholdPx) return;
    this.cambiarMes(delta < 0 ? 1 : -1);
  }

  // Fechas/slots
  private generarDias(base: Date = this.mesBase) {
    const inicioMes = this.inicioDelMes(base);
    this.mesBase = inicioMes;
    const hoy = this.obtenerHoy();
    const totalDiasMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0).getDate();

    this.dias = Array.from({ length: totalDiasMes }, (_, i) => {
      const d = new Date(inicioMes);
      d.setDate(i + 1);
      const pasado = d.getTime() < hoy.getTime();
      return {
        date: d,
        iso: this.toISODate(d),
        etiqueta: this.etiquetaLarga(d),
        corto: this.etiquetaCorta(d),
        pasado,
      };
    });

    const idxDisponible = this.dias.findIndex((dia) => !dia.pasado);
    this.idxActivo = idxDisponible >= 0 ? idxDisponible : 0;

    this.mesActualEtiqueta = new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
    })
      .format(inicioMes)
      .replace('.', '');

    if (!this.dias.length || this.dias[this.idxActivo]?.pasado) {
      this.slotsActivos = [];
      return;
    }

    this.cargarSlots(this.idxActivo);
  }

  private cargarSlots(i: number) {
    const dia = this.dias[i];
    if (!dia || dia.pasado) {
      this.slotsActivos = [];
      return;
    }
    const d = dia.date;
    this.slotsActivos = this.generarSlots(d).filter((h) => this.esSlotDisponible(d, h));
    console.log(this.slotsActivos)
    console.log(this.turnosBloqueados)
  }

  private generarSlots(_: Date): string[] {
    const slots: string[] = [];
    for (let h = this.horario.inicio; h < this.horario.fin; h++) {
      for (let m = 0; m < 60; m += this.slotStepMin) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  }

  private esSlotDisponible(d: Date, hhmm: string): boolean {
    const esDomingo = d.getDay() === 0;
    if (esDomingo) return false;
    const clave = this.claveSlot(d, hhmm);
    if (this.turnosBloqueados.has(clave)) return false;
    return parseInt(hhmm.replace(':', ''), 10) % 100 !== 30;
  }

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toHHmm(d: Date): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private claveSlot(d: Date, hhmm: string): string {
    return `${this.toISODate(d)}|${hhmm}`;
  }

  private claveDesdeFecha(fecha: Date): string {
    return `${this.toISODate(fecha)}|${this.toHHmm(fecha)}`;
  }

  private inicioDelMes(d: Date) {
    const base = new Date(d);
    base.setDate(1);
    base.setHours(0, 0, 0, 0);
    return base;
  }

  private obtenerHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  }

  private etiquetaLarga(d: Date): string {
    const fmt = new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    return fmt.format(d).replace('.', '');
  }

  private etiquetaCorta(d: Date): string {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1);
    if (d.getTime() === hoy.getTime()) return 'Hoy';
    if (d.getTime() === mañana.getTime()) return 'Mañana';

    return this.capitalize(
      new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(d).replace('.', '')
    );
  }
  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
