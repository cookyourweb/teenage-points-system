//privilegeTypes.ts
export interface PrivilegeHistory {
  dateUnlocked: string;  // Fecha en la que se desbloqueó el privilegio
  unlockedBy: string;  // ID del usuario (hijo) que desbloqueó el privilegio
}

export interface Privilege {
  privilegioId?: string;
  name: string;
  description: string;
  points: number;
  unlocked: boolean;
  history?: PrivilegeHistory[];  // Historial de desbloqueo del privilegio
}
