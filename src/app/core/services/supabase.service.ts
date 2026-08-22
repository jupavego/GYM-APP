import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    // createClient() lanza síncronamente si la URL/key vienen vacías —
    // eso tumbaría toda la app (incluida la home pública) antes de
    // configurar un proyecto Supabase real. Se usa un placeholder para
    // no romper el render; las llamadas a la API simplemente fallarán
    // hasta que completes src/environments/environment.ts.
    if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
      console.warn(
        '[SupabaseService] supabaseUrl/supabaseAnonKey vacíos — completa src/environments/environment.ts. ' +
        'La app renderiza, pero login/registro y cualquier llamada a datos fallarán hasta configurarlo.'
      );
    }

    this.client = createClient(
      environment.supabaseUrl || 'https://placeholder.supabase.co',
      environment.supabaseAnonKey || 'placeholder-anon-key',
      {
        auth: {
          // Desactiva el lock de navegador que causa el error
          // "lock was released because another request stole it"
          // LockFunc recibe (name, acquireTimeout, fn) => fn()
          lock: (_name, _acquireTimeout, fn) => fn(),
          persistSession:     true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  from(table: string) {
    return this.client.from(table);
  }

  get auth() {
    return this.client.auth;
  }

  get storage() {
    return this.client.storage;
  }

  get functions() {
    return this.client.functions;
  }

  rpc(fn: string, params?: Record<string, unknown>) {
    return this.client.rpc(fn, params);
  }
}