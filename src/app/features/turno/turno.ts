import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { supabase } from '../../services/supabase.client';

@Component({
  selector: 'app-turno',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './turno.html',
  styleUrl: './turno.scss'
})
export class TurnoComponent {
  @Input() turno: any | null = null; // se usa para mostrar datos del paciente
  @Output() cancelar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<{
    altura: number;
    peso: number;
    temperatura: number;
    presion: string;
    diagnostico: string;
  }>();
  loading = false;
  form: FormGroup;
  slideIndex = 0;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      altura: [null, [Validators.required, Validators.min(30), Validators.max(250)]],
      peso: [null, [Validators.required, Validators.min(2), Validators.max(400)]],
      temperatura: [null, [Validators.required, Validators.min(30), Validators.max(45)]],
      presion: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?:9\d|1\d\d|2\d\d)\/(?:[5-9]\d|1[0-2]\d)$/) // 90-299 / 50-129
        ]
      ],
      diagnostico: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  invalid(c: string) {
    const ctrl = this.form.get(c);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  private controlsForSlide(i: number): string[] {
    if (i === 0) return ['altura', 'peso'];
    if (i === 1) return ['temperatura', 'presion'];
    return ['diagnostico'];
  }

  canAdvance(): boolean {
    const keys = this.controlsForSlide(this.slideIndex);
    keys.forEach((k) => this.form.get(k)?.markAsTouched());
    return keys.every((k) => this.form.get(k)?.valid);
  }

  next() {
    if (!this.canAdvance()) return;
    this.slideIndex = Math.min(2, this.slideIndex + 1);
  }

  prev() {
    this.slideIndex = Math.max(0, this.slideIndex - 1);
  }

  enviar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading = true;
    const value = this.form.value as any;
    setTimeout(() => {
      this.guardar.emit({
        altura: Number(value.altura),
        peso: Number(value.peso),
        temperatura: Number(value.temperatura),
        presion: String(value.presion),
        diagnostico: String(value.diagnostico)
      });
      this.loading = false;
    }, 0);
  }
  get pacienteNombre(): string {
    const p = this.turno?.paciente;
    const nombre = p?.nombre || '';
    const apellido = p?.apellido || '';
    return `${nombre} ${apellido}`.trim() || 'Paciente';
  }
  get pacienteEmail(): string {
    return this.turno?.paciente?.email || '';
  }
  get pacienteAvatar(): string | null {
    const arr = this.turno?.paciente?.imagen_perfil as string[] | undefined | null;
    return Array.isArray(arr) ? arr[0] || null : null;
  }
  
}
