import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  duration?: number; // ms; if 0 or undefined, uses default; if < 0, persistent
}

export interface Toast extends Required<ToastOptions> {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  // Default duration for auto-dismiss (ms)
  private readonly defaultDuration = 3000;

  private counter = 0;
  private readonly _toasts$ = new BehaviorSubject<Toast[]>([]);

  // Observable list of toasts for a host component to render
  readonly toasts$ = this._toasts$.asObservable();

  /** Generic show */
  show(type: ToastType, message: string, options: ToastOptions = {}): number {
    const id = ++this.counter;
    const toast: Toast = {
      id,
      type,
      message,
      title: options.title ?? '',
      duration: options.duration ?? this.defaultDuration,
    };

    const list = this._toasts$.getValue();
    this._toasts$.next([...list, toast]);

    if (toast.duration >= 0) {
      const timeout = toast.duration || this.defaultDuration;
      window.setTimeout(() => this.remove(id), timeout);
    }

    return id;
  }

  success(message: string, options?: ToastOptions) {
    return this.show('success', message, options);
  }
  error(message: string, options?: ToastOptions) {
    return this.show('error', message, options);
  }
  info(message: string, options?: ToastOptions) {
    return this.show('info', message, options);
  }
  warning(message: string, options?: ToastOptions) {
    return this.show('warning', message, options);
  }

  /** Remove a toast by id */
  remove(id: number) {
    const list = this._toasts$.getValue();
    const next = list.filter(t => t.id !== id);
    if (next.length !== list.length) {
      this._toasts$.next(next);
    }
  }

  /** Clear all toasts */
  clear() {
    this._toasts$.next([]);
  }
}
