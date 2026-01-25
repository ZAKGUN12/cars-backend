export interface User {
  userId: string;
  profile: UserProfile;
  stats: UserStats;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
}

export interface UserProfile {
  email: string;
  username: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
  authMethod: 'google' | 'email';
}

export interface UserStats {
  highScore: number;
  enduranceHighScore: number;
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  difficultyPlays: { Easy: number; Medium: number; Hard: number };
  gears: number;
  xp: number;
  level: number;
  powerUps: { timeFreeze: number; clueGiver: number };
  correctAnswers: number;
  incorrectAnswers: number;
  perfectRounds: number;
  gameHistory: GameHistoryItem[];
  lastBonusDate: string;
  loginStreak: number;
  journeyProgress: Record<string, JourneyProgress>;
}

export interface JourneyProgress {
  stars: number;
  score: number;
  completed: boolean;
}

export interface GameHistoryItem {
  id: string;
  date: string;
  mode: string;
  level: string;
  score: number;
  mistakes: number;
  won: boolean;
  timeSpent?: number;
  timestamp: string;
}

export interface Challenge {
  challengeId: string;
  creatorId: string;
  creatorName: string;
  challengerName: string;
  targetPlayerId: string;
  targetPlayerName: string;
  gameMode: string;
  difficulty: string;
  puzzle: any;
  performance: any[];
  startTime?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: string;
  expiresAt: string;
  ttl: number;
}

export interface RateLimitData {
  requests: number[];
  lastReset: number;
}
