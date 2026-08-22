// membership.model.ts
// Membresías/licencias de clientes — el admin activa un plan manualmente
// (ver supabase/migrations/006_memberships.sql). Sin pasarela de pago:
// esta es la fuente única de verdad de quién está al día.

export type PlanId = 'mensual' | 'trimestral' | 'semestral' | 'anual';

export interface MembershipPlanDef {
  id: PlanId;
  label: string;
  price: number;
  period: string;
  months: number;
  billedAs?: string;
  featured?: boolean;
  features: string[];
}

export interface Membership {
  id: string;
  client_id: string;
  plan_id: PlanId;
  activated_at: string;
  expires_at: string;
  activated_by: string | null;
  created_at: string;
}

// Catálogo de planes — fuente única de verdad. Lo consume tanto la landing
// (home.component.ts) como el flujo de activación del admin (users-list),
// que usa `months` para calcular expires_at.
export const MEMBERSHIP_PLANS: MembershipPlanDef[] = [
  {
    id: 'mensual',
    label: 'Mensual',
    price: 89900,
    period: '/ mes',
    months: 1,
    features: ['Acceso completo al gimnasio', 'Clases grupales ilimitadas', 'Seguimiento básico'],
  },
  {
    id: 'trimestral',
    label: 'Trimestral',
    price: 79900,
    period: '/ mes',
    months: 3,
    billedAs: 'Facturado cada 3 meses',
    features: ['Todo lo del plan mensual', 'Evaluación física inicial', '5% de descuento'],
  },
  {
    id: 'semestral',
    label: 'Semestral',
    price: 69900,
    period: '/ mes',
    months: 6,
    billedAs: 'Facturado cada 6 meses',
    featured: true,
    features: ['Todo lo del plan trimestral', 'Plan nutricional básico', 'Acceso a zona funcional', '15% de descuento'],
  },
  {
    id: 'anual',
    label: 'Anual',
    price: 59900,
    period: '/ mes',
    months: 12,
    billedAs: 'Facturado una vez al año',
    features: ['Todo lo del plan semestral', 'Plan nutricional personalizado', '2 sesiones con entrenador personal / mes', '25% de descuento'],
  },
];

export function getPlanDef(id: PlanId): MembershipPlanDef {
  return MEMBERSHIP_PLANS.find(p => p.id === id)!;
}
