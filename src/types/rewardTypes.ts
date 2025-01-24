export interface RewardHistory {
  date: string; // Date when the reward was unlocked or task was completed
  userId: string; // ID of the user (child) who completed the task or unlocked the privilege
  pointsEarned: number; // Points earned for completing the task or unlocking the privilege
}

export interface Reward {
  id?: string; // Optional ID for the reward
  name: string; // Name of the reward or task
  description: string; // Description of the reward or task
  points: number; // Points required for the reward or earned from the task
  unlocked: boolean; // Indicates if the reward is unlocked
  history?: RewardHistory[]; // History of unlocking or completing the reward/task
}
