import { Injectable, inject, signal } from '@angular/core';
import { SessionService } from './session.service';

// Agrega valores aquí si necesitas textos distintos en el modal
// según qué acción disparó el gate (ver auth-gate.component.html).
export type AuthGateContext = 'default';

@Injectable({ providedIn: 'root' })
export class AuthGateService {
  private session = inject(SessionService);

  /** Controla la visibilidad del modal de autenticación */
  readonly showGate = signal(false);

  /** Contexto que disparó el gate — ajusta el texto del modal */
  readonly context = signal<AuthGateContext>('default');

  private _pending: (() => void) | null = null;

  /**
   * Punto de entrada centralizado.
   * Si el usuario está autenticado ejecuta la acción inmediatamente;
   * si no, abre el modal y guarda la acción como pendiente.
   */
  requireAuth(action: () => void, context: AuthGateContext = 'default'): void {
    if (this.session.isLoggedIn()) {
      action();
    } else {
      this._pending = action;
      this.context.set(context);
      this.showGate.set(true);
    }
  }

  /** Llamar cuando el login/registro es exitoso — cierra el modal y ejecuta la acción pendiente */
  onAuthenticated(): void {
    this.showGate.set(false);
    const fn = this._pending;
    this._pending = null;
    if (fn) fn();
  }

  /** Cierra el modal sin ejecutar la acción pendiente */
  close(): void {
    this.showGate.set(false);
    this._pending = null;
  }
}
