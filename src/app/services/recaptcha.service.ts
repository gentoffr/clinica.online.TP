import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environtment';
interface VerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private endpoint = `${environment.supabaseUrl}/functions/v1/verify-recaptcha`;
  private scriptLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  async verificarToken(token: string) {
    if (!token) {
      throw new Error('Token de captcha faltante');
    }
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      throw new Error('No se pudo verificar el captcha');
    }
    const data = (await res.json()) as VerifyResponse;
    if (!data?.success) {
      throw new Error(data?.error || 'Captcha inválido');
    }
    return data;
  }

  cargarScript() {
    if (this.scriptLoaded) return Promise.resolve();
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = new Promise<void>((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve();
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>('script[src*="recaptcha/api.js"]');
      if (existing) {
        existing.addEventListener('load', () => {
          this.scriptLoaded = true;
          resolve();
        });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('No se pudo cargar reCAPTCHA'));
      document.body.appendChild(script);
    });
    return this.loadingPromise;
  }
}
