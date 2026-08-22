// account.model.ts
// Cuenta/organización asociada a un usuario de rol 'business'.
// Patrón genérico 1:1 perfil → cuenta (ver supabase/migrations/001_schema.sql).

export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Account {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  slogan: string | null;
  history: string | null;
  address: string | null;
  zone: string | null;
  phone: string | null;
  schedule: string | null;
  category: string | null;
  logo_url: string | null;
  cover_url: string | null;
  facebook: string | null;
  instagram: string | null;
  whatsapp: string | null;
  active: boolean;
  status: AccountStatus;
  created_at: string;
}

// DTO para crear o editar una cuenta
export interface AccountFormData {
  name: string;
  description: string;
  slogan: string;
  history: string;
  address: string;
  zone: string;
  phone: string;
  schedule: string;
  category: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
}
