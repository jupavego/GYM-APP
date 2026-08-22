# Supabase — Plan de ejecución

Documentación de infraestructura de base de datos y storage de la plantilla base.

## Orden de ejecución

Ejecutar los archivos de `migrations/` en el SQL Editor de Supabase, en este orden exacto:

```
001_schema.sql          → tablas (profiles, accounts), tipos e índices
002_auth_triggers.sql   → perfil automático, sincronización de rol al JWT
003_rls_policies.sql    → políticas de seguridad por fila (RLS)
004_storage.sql         → buckets (avatars, accounts) e imágenes
005_stats_function.sql  → función SQL para las métricas del panel admin
006_memberships.sql     → tabla de membresías/licencias de clientes (activación manual por admin)
007_fitness_engine.sql  → motor de recomendación de rutinas (perfil, ejercicios, templates, planes, check-in)
seed.sql                → solo en proyecto nuevo (opcional)
seed-exercises.sql      → 1,324 ejercicios (solo texto, ver nota de licencia dentro del archivo)
seed-templates.sql      → 5 plantillas base de rutina (full body, upper/lower, PPL, fuerza)
```

`003_rls_policies.sql` usa la función `get_my_role()` definida en `001_schema.sql`, y el trigger de sincronización de `002_auth_triggers.sql` — respeta el orden.

## Configuración requerida en Supabase Dashboard

### Authentication → URL Configuration
| Campo | Valor desarrollo | Valor producción |
|---|---|---|
| Site URL | `http://localhost:4200` | `https://tudominio.com` |
| Redirect URLs | `http://localhost:4200/auth/reset-password` | `https://tudominio.com/auth/reset-password` |
| Redirect URLs | `http://localhost:4200/auth/confirm` | `https://tudominio.com/auth/confirm` |

### Authentication → Email Templates
Los HTML en `email-templates/` (`confirm-signup.html`, `reset-password.html`) están listos para pegar en:
- **Confirm signup** → apunta a `/auth/confirm`
- **Reset Password** → apunta a `/auth/reset-password`

Antes de usarlos: reemplaza el ícono `email-icons/*.svg` (hoy apunta a un placeholder `tudominio.com`) por uno hosteado en tu dominio real, y ajusta el nombre de marca donde diga "TU APP".

## Estructura de tablas

```
auth.users          (Supabase interno)
    │
    └── profiles    (1:1 — creado por trigger)
            │
            └── accounts    (1:1 — una cuenta por usuario 'business')
```

## Estructura de Storage

```
avatars/
  {userId}/
    avatar.jpg

accounts/
  {userId}/
    logo.jpg
    cover.jpg
```

## Roles y permisos

| Rol | profiles | accounts | storage |
|---|---|---|---|
| anónimo | ✗ | solo aprobados | solo lectura |
| client | propio | solo aprobados | propio avatar |
| business | propio | propio + aprobados | propios |
| admin* | todos | todos | todos |

*El admin usa `service_role` key desde el dashboard de Supabase — bypasea RLS.

## Ciclo de vida de una Account

```
[setup] → pending → [admin aprueba] → approved
                  → [admin rechaza] → rejected
                  → [admin suspende] → suspended
```

El trigger `on_account_status_change` sincroniza `active = (status = 'approved')` automáticamente en cada cambio de status.

## Verificación post-ejecución

Después de correr las migraciones, ejecutar esta query para confirmar que las policies quedaron bien:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'accounts')
ORDER BY tablename, cmd;
```

Debería mostrar exactamente estas policies:
- profiles: 3 (SELECT, INSERT, UPDATE)
- accounts: 4 (SELECT, INSERT, UPDATE, DELETE)

## Tests de RLS

`tests/rls_policies.sql` es una suite de tests manuales (ejecutar en SQL Editor con `service_role`) que verifica el comportamiento de `handle_new_user` y las políticas de `profiles`/`accounts`. Cada bloque imprime `PASS` o `FAIL` — correrla después de aplicar las migraciones y cada vez que se modifiquen las policies.

## Variables de entorno requeridas

Completar en `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://XXXXXXXXXXXXXXXX.supabase.co',
  supabaseAnonKey: 'eyJ...',
  sentryDsn: '',
  turnstileSiteKey: '',
};
```

Los valores se encuentran en Supabase Dashboard → Settings → API.
