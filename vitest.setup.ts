import '@testing-library/jest-dom'; // Extensiones de Testing Library

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
