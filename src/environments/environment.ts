export const environment = {
  production: false,
  supabaseUrl: '',        // Supabase → Settings → API → Project URL
  supabaseAnonKey: '',    // Supabase → Settings → API → anon public key
  sentryDsn: '',          // vacío en desarrollo — Sentry solo activo en producción
  turnstileSiteKey: '',   // clave pública de Cloudflare Turnstile — vacío desactiva el captcha
};
