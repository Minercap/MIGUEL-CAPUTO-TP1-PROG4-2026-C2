import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// Único lugar de la app que crea el cliente de Supabase (clase 5).
// Los demás servicios lo inyectan y usan los getters; los componentes
// nunca importan supabase-js directamente.
@Service()
export class SupabaseService {
  private sup: SupabaseClient;

  constructor() {
    this.sup = createClient(environment.SUPABASE_URL, environment.SUPABASE_KEY);
  }

  // Base de datos y Realtime
  get Sup() {
    return this.sup;
  }

  get Auth() {
    return this.sup.auth;
  }

  get Stg() {
    return this.sup.storage;
  }
}
