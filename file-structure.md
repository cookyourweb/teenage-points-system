# Estructura del Proyecto - Teenage Points System

```
teenage-points-system/
├── public/                      # Archivos públicos estáticos
│   └── vite.svg
├── src/                        # Código fuente principal
│   ├── assets/                 # Recursos estáticos
│   │   └── react.svg
│   ├── components/             # Componentes React
│   │   ├── auth/              # Componentes de autenticación
│   │   │   ├── AuthPage.tsx   # Página principal de autenticación
│   │   │   ├── Signin.tsx     # Componente de inicio de sesión
│   │   │   └── Signup.tsx     # Componente de registro
│   │   ├── dashboard/         # Componentes del panel principal
│   │   │   ├── AddEditChild.tsx      # Agregar/Editar información del adolescente
│   │   │   ├── AddFaq.tsx            # Agregar preguntas frecuentes
│   │   │   ├── AdolescenteType.tsx   # Tipos de adolescentes
│   │   │   ├── CompleteProfile.tsx   # Completar perfil
│   │   │   ├── Dashboard.tsx         # Panel principal
│   │   │   ├── FaqAdmin.tsx          # Administración de FAQs
│   │   │   ├── Faqs.tsx             # Lista de FAQs
│   │   │   ├── InviteMember.tsx     # Invitar miembros
│   │   │   ├── PrivilegeCard.tsx    # Tarjeta de privilegios
│   │   │   ├── RewardTracker.tsx    # Seguimiento de recompensas
│   │   │   └── TaskCard.tsx         # Tarjeta de tareas
│   │   └── ui/                # Componentes de interfaz reutilizables
│   │       ├── Button.tsx     # Botón personalizado
│   │       ├── Card.tsx       # Tarjeta personalizada
│   │       ├── Input.tsx      # Campo de entrada personalizado
│   │       ├── Modal.tsx      # Ventana modal
│   │       └── PrivilegeRedemptionModal.tsx  # Modal de canje de privilegios
│   ├── hooks/                 # Hooks personalizados
│   │   ├── useAuth.ts        # Hook de autenticación
│   │   ├── useChildManagement.ts  # Hook de gestión de adolescentes
│   │   └── useUserRole.ts    # Hook de roles de usuario
│   ├── services/             # Servicios para API/Backend
│   │   ├── familyService.ts  # Servicios para gestión familiar
│   │   ├── faqsService.ts    # Servicios para FAQs
│   │   ├── privilegesService.ts  # Servicios para privilegios
│   │   ├── rewardService.ts  # Servicios para recompensas
│   │   ├── tasksService.ts   # Servicios para tareas
│   │   └── usersService.ts   # Servicios para usuarios
│   ├── types/                # Definiciones de tipos TypeScript
│   │   ├── familyTypes.ts    # Tipos para familia
│   │   ├── faqsTypes.ts      # Tipos para FAQs
│   │   ├── privilegeTypes.ts # Tipos para privilegios
│   │   ├── rewardTypes.ts    # Tipos para recompensas
│   │   ├── taskTypes.ts      # Tipos para tareas
│   │   └── uiTypes.ts        # Tipos para UI
│   ├── __tests__/           # Tests unitarios
│   │   └── App.test.tsx
│   ├── App.tsx              # Componente principal
│   ├── firebase.ts          # Configuración de Firebase
│   ├── globals.css          # Estilos globales
│   ├── main.tsx             # Punto de entrada
│   ├── theme.css            # Estilos de tema
│   └── vite-env.d.ts        # Tipos de ambiente Vite
├── .gitignore               # Archivos ignorados por Git
├── eslint.config.js         # Configuración de ESLint
├── index.html              # HTML principal
├── package.json            # Dependencias y scripts
├── postcss.config.js       # Configuración de PostCSS
├── README.md               # Documentación
├── tailwind.config.js      # Configuración de Tailwind
├── tsconfig.app.json       # Configuración de TypeScript para la app
├── tsconfig.json           # Configuración principal de TypeScript
├── tsconfig.node.json      # Configuración de TypeScript para Node
├── vite.config.ts          # Configuración de Vite
└── vitest.setup.ts         # Configuración de pruebas
```

## Descripción de la Estructura

Este proyecto está organizado siguiendo una estructura modular y escalable:

- **`components/`**: Contiene todos los componentes React organizados por funcionalidad
  - `auth/`: Componentes relacionados con la autenticación
  - `dashboard/`: Componentes específicos del panel de control
  - `ui/`: Componentes de interfaz de usuario reutilizables

- **`hooks/`**: Hooks personalizados de React para lógica reutilizable
  - Incluye hooks para autenticación, gestión de adolescentes y roles

- **`services/`**: Capa de servicios para interactuar con APIs
  - Servicios separados para cada entidad principal (familia, FAQs, privilegios, etc.)

- **`types/`**: Definiciones de tipos TypeScript
  - Tipos organizados por dominio (familia, tareas, recompensas, etc.)

- **Archivos de Configuración**: En la raíz del proyecto
  - Configuraciones para TypeScript, Vite, ESLint, etc.
  - Archivos de estilo globales y temas
