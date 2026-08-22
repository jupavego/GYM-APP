# Plantilla base de aplicativo

Base reutilizable para materializar ideas de aplicativos orientados a servicios: registro de usuarios, roles, panel de control con sidebar y navegación con widget de usuario, ya resueltos. Extraída y generalizada a partir de un aplicativo en producción (directorio de negocios), podando lo específico de ese dominio.

## Stack

- **Frontend:** Angular 19 (standalone components, signals, control flow `@if`/`@for`), desplegado en Vercel
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Captcha:** Cloudflare Turnstile (opcional — vacío lo desactiva)
- **Correo transaccional:** Resend (Edge Functions)
- **Monitoreo de errores:** Sentry (opcional — vacío lo desactiva)

## Qué trae resuelto

- **Auth completo**: registro, login, login con Google, recuperar/resetear contraseña, confirmación de email — `core/services/auth.service.ts` + `session.service.ts`.
- **3 roles** (`client` / `business` / `admin`) con guards por rol, cada uno con su propio flujo de redirección — `core/guards/`, `core/models/profile.model.ts`.
- **Patrón cuenta 1:1**: un usuario `business` administra una `account` propia (negocio, organización, proyecto...) con flujo de aprobación por admin — `core/models/account.model.ts`, `supabase/migrations/`.
- **Panel de control con sidebar** (`DashboardLayoutComponent` en `layouts/dashboard-layout/`), compartido entre el panel de `business` y el de `admin`, con navegación por rol.
- **Widget de usuario** (avatar, dropdown, cerrar sesión) — `shared/components/user-widget/`.
- **Modal de auth inline** ("necesitas cuenta para continuar" sin salir de la página) — `core/services/auth-gate.service.ts` + `shared/components/auth-gate/`.
- **Subida de imágenes** a Supabase Storage con compresión a WebP client-side — `core/services/storage.service.ts`.
- Páginas genéricas listas: 404, privacidad, aviso de seguridad, callback de confirmación de email.

## Primeros pasos al clonar esta plantilla para una idea nueva

1. **Rebrandear**: edita [`src/app/data/site.data.ts`](src/app/data/site.data.ts) (nombre, tagline, contacto, redes) — se propaga a footer, home y auth.
2. **Recolorear**: edita [`src/styles/_tokens.scss`](src/styles/_tokens.scss) — paleta demo violet/orange, cámbiala por la del proyecto nuevo.
3. **Ajustar roles** si tu idea necesita otros nombres de rol (ej. `operator` en vez de `business`): actualiza `UserRole` en `core/models/profile.model.ts`, el enum `user_role` en `supabase/migrations/001_schema.sql`, y `ROLE_ROUTES` en `core/services/auth.service.ts`.
4. **Configurar Supabase**: crea un proyecto nuevo, copia las migraciones de `supabase/migrations/` en orden al SQL Editor (ver sección abajo), y completa `supabaseUrl`/`supabaseAnonKey` en `src/environments/`.
5. **Personalizar el panel** (`layouts/dashboard-layout/dashboard-layout.component.ts`): edita `NAV_BY_ROLE` para los ítems del sidebar de cada rol.
6. Construye las features propias de la idea dentro de `features/`, siguiendo el mismo patrón de `features/business/` o `features/admin/` (página + servicio + `*.styles.scss`).

## Requisitos previos

- Node.js 20+
- Una cuenta de Supabase con un proyecto nuevo para este aplicativo

## Setup local

```bash
npm install
```

Completa `src/environments/environment.ts` con tus credenciales de Supabase. `sentryDsn` y `turnstileSiteKey` pueden quedar vacíos — el código los trata como "desactivado", no rompe nada.

```bash
npm start
```

Abre `http://localhost:4200`.

## Variables de entorno

Viven en `src/environments/environment.ts` (desarrollo) y `environment.prod.ts` (producción) — **no en un `.env`**, es la convención estándar de Angular.

| Variable | Dónde se obtiene | Vacía en dev está bien? |
|---|---|---|
| `supabaseUrl` / `supabaseAnonKey` | Supabase → Settings → API | No |
| `turnstileSiteKey` | Cloudflare → Turnstile | Sí |
| `sentryDsn` | Sentry.io → Settings del proyecto → Client Keys (DSN) | Sí — Sentry no se inicializa si está vacío |

## Estructura del proyecto

```
src/app/
  core/       servicios transversales (auth, sesión, storage, guards)
  data/       site.data.ts — datos editoriales, punto único de rebrandeo
  features/   admin, auth, business, client — una carpeta por área funcional
  layouts/    layouts de auth y del panel de control (dashboard-layout)
  shared/     componentes, páginas y estilos reutilizables entre features
supabase/
  migrations/ SQL versionado — schema, triggers, RLS, storage, stats
  functions/  Edge Functions (Deno) — verify-turnstile y helpers compartidos
```

## Base de datos — migraciones

Las migraciones en `supabase/migrations/` **no se aplican con `supabase db push`** — se manejan copiando y pegando cada archivo en el **SQL Editor de Supabase**, en orden numérico:

1. `001_schema.sql` — extensiones, enums, tablas `profiles`/`accounts`, función `get_my_role()`
2. `002_auth_triggers.sql` — perfil automático al registrarse, sincronización de rol al JWT
3. `003_rls_policies.sql` — Row Level Security de `profiles`/`accounts`
4. `004_storage.sql` — buckets `avatars`/`accounts` y sus políticas
5. `005_stats_function.sql` — función SQL para las métricas del panel admin

## Edge Functions

En `supabase/functions/`:

- `verify-turnstile` — valida el captcha en el servidor durante el registro
- `_shared/` — helpers compartidos (cliente admin de Supabase, envío de correo vía Resend) — no se despliega como función propia

Desplegar una función:

```bash
supabase functions deploy <nombre-de-la-funcion>
```

Secrets que necesita `verify-turnstile` (`supabase secrets set NOMBRE=valor`, no van en el repo): revisa el código de la función para la lista exacta.

## Desarrollo

```bash
npm start                # servidor de desarrollo, http://localhost:4200
npm run build             # build de producción en dist/
npm run watch              # build en modo watch (desarrollo)
npm test                   # tests unitarios (Karma/Jasmine)
```

## Seguridad

`vercel.json` define headers de seguridad (CSP, HSTS, etc.) para todo el sitio. Si agregas un servicio externo nuevo (otro SDK, otra API de terceros), probablemente necesites sumar su dominio al `Content-Security-Policy` ahí — si no, el navegador lo bloquea en producción aunque funcione perfecto en local. Si activas Sentry, agrega el dominio de ingest de tu proyecto (`https://TU-ID.ingest.TU-REGION.sentry.io`) a `connect-src`.

Hay un pipeline de CI en `.github/workflows/security.yml` (npm audit, SAST con Semgrep, detección de secrets con Gitleaks) que corre en cada push a `main`.

## Deploy

Vercel despliega automáticamente cada push a `main`. No hay ambiente de staging separado — los cambios van directo a producción al hacer push.
