import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Toast, ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('clinica.onliine');
  toasts$!: Observable<Toast[]>;

  constructor(private toast: ToastService) {
    this.toasts$ = this.toast.toasts$;
  }

  removeToast(id: number) {
    this.toast.remove(id);
  }
}
