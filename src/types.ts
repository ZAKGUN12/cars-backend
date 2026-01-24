// Type definitions for Vehicle Guesser Backend

export interface Vehicle {
  brand: string;
  model: string;
  year: number;
}

export interface VehicleData {
  id: string;
  vehicle: Vehicle;
  imageKey: string;
  imagePart: string;
  brandOptions: string[];
  modelOptions: string[];
  yearOptions: number[];
  level: 'Easy' | 'Medium' | 'Hard';
  difficulty: number;
  tags: string[];
}

export interface VehicleDatabase {
  easy: VehicleData[];
  medium: VehicleData[];
  hard: VehicleData[];
}

export interface UserProfile {
  email: string;
  username: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
  authMethod: 'google' | 'email';
}

export interface GameStats {
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
  gameHistory: GameHistoryEntry[];
  lastBonusDate: string;
  loginStreak: number;
  journeyProgress: Record<string, JourneyProgress>;
}

export interface GameHistoryEntry {
  id: string;
  date: string;
  mode: string;
  level: string;
  score: number;
  mistakes: number;
  won: boolean;
  timeSpent: number | null;
  timestamp: string;
}

export interface JourneyProgress {
  stars: number;
  score: number;
  completed: boolean;
}

export interface GameData {
  userId: string;
  profile: UserProfile;
  stats: GameStats;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
}

export interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  body: string | null;
  queryStringParameters?: Record<string, string>;
  requestContext?: {
    authorizer?: {
      claims?: Record<string, string>;
    };
  };
}

export interface APIResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface UpdateGameDataRequest {
  score?: number;
  mode: string;
  level?: string;
  mistakes?: number;
  isEndurance?: boolean;
  bonusData?: BonusData;
  journeyData?: JourneyData;
  hintCost?: number;
  powerUpType?: string;
  purchaseData?: PurchaseData;
  profileData?: ProfileData;
  correctCount?: number;
  timeSpent?: number;
}

export interface BonusData {
  gears: number;
  lastBonusDate: string;
  loginStreak: number;
}

export interface JourneyData {
  levelId: string;
  stars: number;
  completed: boolean;
  score: number;
}

export interface PurchaseData {
  powerUp: string;
  cost: number;
}

export interface ProfileData {
  username: string;
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
  startTime: string | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
  ttl: number;
  acceptedAt?: string;
  declinedAt?: string;
}

export interface VehiclePuzzle {
  id: string;
  vehicle: Vehicle;
  imageUrl: string;
  brandOptions: string[];
  modelOptions: string[];
  yearOptions: number[];
  difficulty: number;
  tags: string[];
  imagePart?: string;
}
