/** @type {import('tailwindcss').Config} */

// PALETA SEMANTICA. Seis familias, un nombre por color.
//
// Se REEMPLAZA `theme.colors`, no se extiende. Eso hace que `bg-blue-500`,
// `bg-gray-100` y compania dejen de existir: Tailwind ya no las genera.
// Esa es la diferencia entre un token y una sugerencia.
//
// Los valores son los de la paleta por defecto de Tailwind, asi que el
// renombrado no cambia ni un pixel. Lo unico que cambia es que ahora hay
// un solo nombre para cada color.
const palette = {
  // Accion principal. Antes: blue, primary, cyan (variante info del boton).
  primary: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
  },
  // Superficies, texto y bordes. Antes: gray.
  neutral: {
    50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af',
    500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712',
  },
  // Tarea completada, puntos ganados. Antes: green.
  success: {
    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
    500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16',
  },
  // Borrar, error, accion destructiva. Antes: red.
  danger: {
    50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
    500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
  },
  // Aviso, pendiente. Antes: yellow, orange y amber, que eran tres nombres
  // para la misma idea. Se consolidan en los valores de amber.
  warning: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03',
  },
  // Privilegios y recompensas. Antes: purple, indigo (el viejo `secondary`) y pink.
  accent: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc',
    500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764',
  },
};

// ROLES. La capa semantica, enganchada a los tokens de src/styles/tokens.css.
//
// Esto es lo que hace que el modo oscuro funcione sin una sola clase `dark:`:
// `bg-surface` resuelve a var(--tps-bg-surface), y esa variable vale una cosa
// en :root y otra en :root.dark. La clase es la misma, el valor cambia solo.
//
// Convive con `palette`: `bg-primary-500` sigue existiendo. Se migra pantalla a
// pantalla, y cuando no quede ninguna referencia cruda se borra `palette`.
const roles = {
  surface: {
    DEFAULT: 'var(--tps-bg-surface)',
    page: 'var(--tps-bg-page)',
    sunken: 'var(--tps-bg-sunken)',
    overlay: 'var(--tps-bg-overlay)',
  },
  content: {
    DEFAULT: 'var(--tps-text)',
    muted: 'var(--tps-text-muted)',
    inverse: 'var(--tps-text-inverse)',
  },
  line: {
    DEFAULT: 'var(--tps-border)',
    strong: 'var(--tps-border-strong)',
  },
  // Accion RELLENA: fondo de boton solido. `bg-action` con `text-action-fg`.
  action: {
    DEFAULT: 'var(--tps-action)',
    hover: 'var(--tps-action-hover)',
    fg: 'var(--tps-action-fg)',
  },
  // Accion como TEXTO: enlaces y pestanas. `text-link`, `hover:text-link-hover`.
  // Es otro token y no `action` porque las dos necesidades son opuestas: el
  // relleno se mide contra su texto, el enlace contra la superficie.
  link: {
    DEFAULT: 'var(--tps-link)',
    hover: 'var(--tps-link-hover)',
  },
  // Cada estado con sus tres papeles. `fg` es el texto SOBRE el relleno y
  // `text` el texto sobre el fondo suave. Verde y ambar llevan texto oscuro:
  // con blanco se quedan en 3,30:1 y 3,19:1.
  positive: {
    DEFAULT: 'var(--tps-positive)',
    fg: 'var(--tps-positive-fg)',
    text: 'var(--tps-positive-text)',
    bg: 'var(--tps-positive-bg)',
  },
  caution: {
    DEFAULT: 'var(--tps-caution)',
    fg: 'var(--tps-caution-fg)',
    text: 'var(--tps-caution-text)',
    bg: 'var(--tps-caution-bg)',
  },
  negative: {
    DEFAULT: 'var(--tps-negative)',
    fg: 'var(--tps-negative-fg)',
    text: 'var(--tps-negative-text)',
    bg: 'var(--tps-negative-bg)',
  },
  disabled: { DEFAULT: 'var(--tps-disabled-bg)', fg: 'var(--tps-disabled-fg)' },
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    // REEMPLAZO, no extend: fuera los nombres crudos de Tailwind.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#ffffff',
      black: '#000000',
      ...palette,
      ...roles,
    },
    extend: {
      // El hueco entre el elemento y el anillo pasa a seguir la superficie. En
      // claro vale lo mismo que antes (#ffffff), asi que no cambia nada; en
      // oscuro deja de dibujar un halo blanco sobre fondo oscuro.
      ringOffsetColor: { DEFAULT: 'var(--tps-bg-surface)' },

      // OJO, aqui NO va `ringColor: { DEFAULT: 'var(--tps-focus-ring)' }`.
      //
      // Tailwind construye el anillo por defecto con
      // withAlphaValue(ringColor.DEFAULT, ringOpacity.DEFAULT) y NO sabe
      // aplicar una opacidad del 50% a un var(): se rinde y cae a su valor de
      // emergencia, rgb(147 197 253 / 0.5), que es mas CLARO que el actual.
      // O sea: tokenizar el anillo asi empeora la visibilidad del foco.
      //
      // El anillo se tokeniza al endurecer los componentes, con una clase
      // explicita (ring-action) en vez de tocando el valor por defecto.
    },
  },
  plugins: [],
};
