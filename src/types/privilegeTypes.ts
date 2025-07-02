//src/types/privilegeTypes.ts
export interface PrivilegeHistory {
  dateUnlocked: string;  // Fecha en la que se desbloqueó el privilegio
  unlockedBy: string;  // ID del usuario (hijo) que desbloqueó el privilegio
}

export interface Privilege {
  id?: string;  // ID principal del privilegio
  privilegioId?: string;  // ID alternativo para compatibilidad (corregido sin "s")
  name: string;
  description: string;
  points: number;  // Puntos necesarios unificados
  unlocked: boolean;
  history?: PrivilegeHistory[];  // Historial de desbloqueo del privilegio
  lastUpdated?: string;
  
  // Propiedades legacy para compatibilidad
  puntosNecesarios?: number;  // Deprecado, usar "points"
  pointsRequired?: number;    // Deprecado, usar "points"
}

export interface PrivilegioCanjeado extends Privilege {
  date: string;
  childId: string;
}

export interface ConnectionError {
  message: string;
  code: string;
  timestamp: string;
}