import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
// Custom validators
function onlyLetters(): ValidatorFn {
  const regex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const v: unknown = control.value;
    if (v == null || v === '') return null;
    return typeof v === 'string' && regex.test(v) ? null : { onlyLetters: true };
  };
}

function ageRange(min = 0, max = 120): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v == null || v === '') return null;
    const num = Number(v);
    if (!Number.isFinite(num)) return { ageRange: true };
    return num >= min && num <= max ? null : { ageRange: { min, max } };
  };
}

function dniPattern(): ValidatorFn {
  const regex = /^\d{7,9}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v == null || v === '') return null;
    return regex.test(String(v)) ? null : { dniPattern: true };
  };
}

function strongPass(): ValidatorFn {
  // At least 8 chars, with letters and numbers
  const regex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v == null || v === '') return null;
    return typeof v === 'string' && regex.test(v) ? null : { strongPass: true };
  };
}
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register{
  @Output() volver = new EventEmitter<void>();
  @Output() ingresar = new EventEmitter<void>();
  tipo: 'paciente'|'especialista' = 'paciente';
  especialidades = ['Clínica Médica','Cardiología','Dermatología','Pediatría'];
  nuevaEspecialidad = '';
  loading = false;
  form: FormGroup;
  constructor(private fb: FormBuilder, private authService: AuthService, private toastService: ToastService){
    this.form = this.fb.group({
      tipo: ['paciente'],
      nombre: ['', [Validators.required, onlyLetters()]],
      apellido: ['', [Validators.required, onlyLetters()]],
      edad: [null, [Validators.required, Validators.pattern(/^\d+$/), ageRange()]],
      dni: ['', [Validators.required, dniPattern()]],
      obraSocial: [''],
      especialidad: ['Clínica Médica'],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPass()]],
      foto1: [null],
      foto2: [null],
      foto: [null]
    });
    this.syncTipo('paciente');
  }

  setTipo(t: 'paciente'|'especialista'){ this.tipo = t; this.form.get('tipo')!.setValue(t); this.syncTipo(t); }

  private syncTipo(t: 'paciente'|'especialista'){
    const cFoto1 = this.form.get('foto1')!;
    const cFoto2 = this.form.get('foto2')!;
    const cFoto = this.form.get('foto')!;
    const cEsp = this.form.get('especialidad')!;

    // Reset validators for all involved controls first
    [cFoto1, cFoto2, cFoto, cEsp].forEach(c => c.clearValidators());

    // Apply role-specific validators
    if(t==='paciente'){
      cFoto1.setValidators([Validators.required]);
      cFoto2.setValidators([Validators.required]);
      // Clean up unused fields for this role
      cFoto.setValue(null);
      cEsp.setValidators([]); // ensure optional
    } else {
      cEsp.setValidators([Validators.required]);
      cFoto.setValidators([Validators.required]);
      // Clean up unused fields for this role
      cFoto1.setValue(null);
      cFoto2.setValue(null);
    }

    // Recalculate validity of touched controls explicitly
    [cFoto1, cFoto2, cFoto, cEsp].forEach(c => c.updateValueAndValidity({ emitEvent: false }));
    // Finally update the form group state
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  agregarEspecialidad(){
    const v = (this.nuevaEspecialidad || '').trim();
    if(!v) return;
    if(!this.especialidades.includes(v)) this.especialidades = [...this.especialidades, v];
    this.form.get('especialidad')!.setValue(v);
    this.nuevaEspecialidad = '';
  }

  setFile(evt: Event, control: 'foto'|'foto1'|'foto2'){
    const file = (evt.target as HTMLInputElement).files?.[0] || null;
    this.form.get(control)?.setValue(file);
    this.form.get(control)?.markAsDirty();
    this.form.get(control)?.updateValueAndValidity();
  }

  invalid(c: string){ const ctrl = this.form.get(c); return !!(ctrl && ctrl.touched && ctrl.invalid); }

  private invalidControlsSummary(){
    const acc: Record<string, unknown> = {};
    Object.keys(this.form.controls).forEach(key => {
      const c = this.form.get(key);
      if (c && c.invalid) acc[key] = c.errors || true;
    });
    return acc;
  }

  private fileInfo(f: File|null){
    return f ? { name: f.name, size: f.size, type: f.type } : null;
  }

  async enviar(){
    if (this.loading) { console.log('[Register] enviar() ignored: still loading'); return; }
    console.log('[Register] enviar() start', { tipo: this.tipo });
    this.form.markAllAsTouched();
    if(this.form.invalid){
      console.warn('[Register] Form invalid', this.invalidControlsSummary());
      return;
    }
    this.loading = true;
    const raw = this.form.getRawValue();
    console.log('[Register] Form raw value', raw);
    const payload: any = {
      tipo: this.tipo,
      nombre: raw.nombre,
      apellido: raw.apellido,
      edad: Number(raw.edad),
      dni: String(raw.dni),
      email: raw.email,
      password: raw.password,
    };
    if(this.tipo==='paciente'){
      if(raw.obraSocial === null|| raw.obraSocial.trim() === ''){
        raw.obraSocial = 'No tiene';
      }
      payload.obra_social = raw.obraSocial || "No tiene";
      payload.fotos = [raw.foto1, raw.foto2];
    } else {
      payload.especialidad = raw.especialidad;
      payload.fotos = raw.foto ? [raw.foto] : [];
    }
    console.log('[Register] Payload (raw)', payload);
    const safePayload = {
      ...payload,
      password: '***',
      fotos: Array.isArray(payload.fotos) ? payload.fotos.map((f: File|null)=> this.fileInfo(f)) : undefined,
      foto: payload.foto ? this.fileInfo(payload.foto) : undefined,
    };
    console.log('[Register] Payload (safe)', safePayload);
    try{
      console.log('[Register] Calling authService.register');
      const res = await this.authService.register(payload);
      console.log('[Register] Register success');
      this.toastService.success('Registro exitoso. Por favor, confirma tu email.');
    }
    catch(err){
      console.error('[Register] Register error', err);
      this.toastService.error('Error en registro. Por favor, intenta nuevamente.');
    }
    finally{
      console.log('[Register] enviar() end');
      this.loading = false;
    }
  }
}
