import '@testing-library/jest-dom'; // Extensiones de Testing Library
import { configure } from '@testing-library/react';
import { expect } from 'vitest';
import * as matchersAxe from 'vitest-axe/matchers';

// toHaveNoViolations para las pantallas nuevas (vitest-axe)
expect.extend(matchersAxe);

// findBy/waitFor esperan 1 s por defecto: bajo carga de la suite entera no alcanza. Solo tolerancia, no relaja ninguna aserción.
configure({ asyncUtilTimeout: 5000 });

// Mock de import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_FIREBASE_API_KEY: 'AIzaSyBCOhnmdai2REhbqoRLYIXPTk8gRE-omTw',
    VITE_FIREBASE_AUTH_DOMAIN: 'sistema-puntos.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'sistema-puntos',
    VITE_FIREBASE_STORAGE_BUCKET: 'sistema-puntos.firebasestorage.app',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '529757462737',
    VITE_FIREBASE_APP_ID: '1:529757462737:web:59d18f419a5d393e0ce5f0',
  },
});
