// Punto de personalización por proyecto: renombra los roles aquí si tu
// idea necesita otros nombres (ej. 'operator' en vez de 'business') —
// también hay que actualizar el enum user_role en supabase/migrations/001_schema.sql
// y ROLE_ROUTES en core/services/auth.service.ts.
export type UserRole = 'client' | 'business' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}