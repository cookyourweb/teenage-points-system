# Familias Estelares - Plataforma Educativa

## ToDo

### Funcionalidades de Administrador
- [ ] Panel de Administración de FAQs en Dashboard
  - Botón de edición de FAQs visible solo para admin
  - CRUD completo de FAQs desde dashboard
  - Vista previa de cambios
  - Sistema de publicación/borrador
  - Historial de modificaciones

- [ ] Gestión de FAQs
  - Nuevo diseño de interfaz de FAQs
  - Mejorar estilos y usabilidad
  - Categorización mejorada
  - Sistema de búsqueda avanzado
  - Estadísticas de uso

### Permisos y Roles de Padres
- [ ] Sistema de Gestión de Tareas
  - Panel de edición de tareas
  - Crear nuevas tareas personalizadas
  - Modificar tareas existentes
  - Eliminar tareas no deseadas
  - Historial de cambios

- [ ] Sistema de Gestión de Privilegios
  - Panel de administración de privilegios
  - Crear nuevos privilegios
  - Editar privilegios existentes
  - Eliminar privilegios
  - Control de requisitos y puntos

### Sistema de Histórico
- [ ] Histórico de Privilegios
  - Registro detallado de privilegios disfrutados
  - Fecha y hora de uso
  - Puntos gastados
  - Tareas completadas asociadas
  - Estadísticas de uso

- [ ] Dashboard de Histórico
  - Vista general de actividad
  - Filtros por fecha
  - Exportación de datos
  - Gráficos y estadísticas
  - Recomendaciones basadas en uso

### Mejoras de UI/UX
- [ ] Limpieza y Optimización de Estilos
  - Eliminar estilos CSS personalizados innecesarios
  - Migrar a clases base de Tailwind
  - Remover duplicados y conflictos
  - Optimizar especificidad de selectores
  - Implementar sistema de diseño consistente

- [ ] Sistema de Tema Oscuro/Claro
  - Implementar modo oscuro usando Tailwind
  - Ajustar colores de texto para mejor legibilidad
  - Asegurar contraste adecuado
  - Persistencia de preferencia de tema
  - Transiciones suaves entre temas

### Testing con Vitest
- [ ] Pruebas Unitarias y de Integración
  - Componentes
  - Servicios
  - Hooks
  - Sistema de autenticación
  - Flujos de usuario

## Configuración de Tailwind CSS

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          // ... otros tonos
        },
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply antialiased;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600;
  }
}

@layer utilities {
  .text-shadow {
    text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
  }
}
```

## Instalación y Uso

```bash
# Crear proyecto con Vite + TypeScript + React
npm create vite@latest familias-estelares -- --template react-ts

# Navegar al directorio
cd familias-estelares

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Ejecutar tests
npm run test

# Construir para producción
npm run build
npm run preview
```

## Estructura del Proyecto

```
src/
├── components/
│   ├── auth/         # Autenticación y roles
│   ├── courses/      # Gestión de cursos
│   ├── dashboard/    # Paneles principales
│   ├── live/         # Clases en directo
│   └── ui/          # Componentes reutilizables
├── hooks/           # Hooks personalizados
├── services/        # Servicios de Firebase
├── types/          # Definiciones de tipos
└── utils/          # Utilidades generales
```

## Tecnologías
- Vite + React + TypeScript
- Firebase (Auth + Firestore)
- TailwindCSS
- React Router
- React Toastify
- FontAwesome
- Vitest + Testing Library
