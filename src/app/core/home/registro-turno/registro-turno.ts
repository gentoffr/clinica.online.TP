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

type DiaListado = { iso: string; date: Date; etiqueta: string; corto: string };

@Component({
  selector: 'app-registro-turno',
  templateUrl: './registro-turno.html',
  styleUrls: ['./registro-turno.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
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

  // Días/slots (15 días)
  dias: DiaListado[] = [];
  idxActivo = 0;
  slotsActivos: string[] = [];
  readonly diasVentana = 15;
  readonly slotStepMin = 30;
  readonly horario = { inicio: 9, fin: 18 };
  hoyISO = this.toISODate(new Date());

  constructor(private fb: FormBuilder, private usuarioService: UsuarioService) {}

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
    this.cargarSlots(0);
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

  seleccionarEspecialista(especialista: any) {
    this.especialistaSeleccionado = especialista;
    this.formPaso1.patchValue({ especialista: especialista.nombre + ' ' + especialista.apellido });
    this.cerrarModalEspecialistas();
  }

  seleccionarDia(i: number) {
    this.idxActivo = i;
    this.cargarSlots(i);
  }

  seleccionarHora(hhmm: string) {
    const dia = this.dias[this.idxActivo];
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

  // Fechas/slots
  private generarDias() {
    this.dias = Array.from({ length: this.diasVentana }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      return {
        date: d,
        iso: this.toISODate(d),
        etiqueta: this.etiquetaLarga(d),
        corto: this.etiquetaCorta(d),
      };
    });
  }

  private cargarSlots(i: number) {
    const d = this.dias[i].date;
    this.slotsActivos = this.generarSlots(d).filter((h) => this.esSlotDisponible(d, h));
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
    return parseInt(hhmm.replace(':', ''), 10) % 100 !== 30;
  }

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
