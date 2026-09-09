// site.data.ts
// Datos editoriales del sitio — única fuente de verdad para textos, links y contacto.
// ═══════════════════════════════════════════════════════════════════════════
// EDITAR PRIMERO AL CLONAR ESTA PLANTILLA — completa estos valores con los
// del nuevo proyecto. Modificar aquí propaga el cambio a footer, home,
// meta-tags y cualquier otro consumidor.
// ═══════════════════════════════════════════════════════════════════════════

export const SITE = {
  name:        'FULL BODY',
  tagline:     'Todo tu cuerpo. Todo tu potencial.',
  description: 'Un entrenamiento completo para desarrollar tu cuerpo, potenciar tu rendimiento y superar tus límites.',
  location:    '',

  contact: {
    whatsapp: '',   // con código de país, sin '+' ni espacios — ej: '573001234567'
    email:    '',   // ej: 'hola@tuapp.com'
  },

  social: {
    facebook:  '',  // URL completa o '' para ocultar
    instagram: '',
    tiktok:    '',
  },

  legal: {
    developer:    'Tu Estudio',
    developerUrl: '#',
  },
} as const;
