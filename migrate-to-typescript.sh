#!/bin/bash

# TypeScript Migration Script for Backend
# Converts cognito-index.js to TypeScript modules

echo "🚀 Starting TypeScript Migration..."

# Create handlers directory
mkdir -p src/handlers

echo "📝 Creating type definitions..."

# Create types file
cat > src/types.ts << 'EOF'
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
EOF

echo "✅ Types created"

echo "📦 Creating utility functions..."

# Create utils file
cat > src/utils.ts << 'EOF'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('Max retries exceeded');
};

export const generateSecureId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const validateStats = (stats: any): void => {
  if (typeof stats.gears !== 'number' || stats.gears < 0 || stats.gears > 10000) {
    throw new Error('Invalid gears value');
  }
  if (typeof stats.level !== 'number' || stats.level < 1 || stats.level > 1000) {
    throw new Error('Invalid level value');
  }
  if (typeof stats.xp !== 'number' || stats.xp < 0 || stats.xp > 500000) {
    throw new Error('Invalid XP value');
  }
  if (typeof stats.highScore !== 'number' || stats.highScore < 0 || stats.highScore > 100000) {
    throw new Error('Invalid high score value');
  }
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dw78cwmd7ajty.cloudfront.net',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};
EOF

echo "✅ Utils created"

echo "🔧 Creating rate limiter..."

# Create rate limiter
cat > src/handlers/rateLimiter.ts << 'EOF'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 100;

export async function checkRateLimit(
  dynamodb: DynamoDBDocumentClient,
  userId: string
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: process.env.GAME_DATA_TABLE!,
      Key: { userId },
      ProjectionExpression: 'rateLimitData'
    }));
    
    let requests = result.Item?.rateLimitData?.requests || [];
    requests = requests.filter((time: number) => time > windowStart);
    
    if (requests.length >= MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    requests.push(now);
    
    dynamodb.send(new UpdateCommand({
      TableName: process.env.GAME_DATA_TABLE!,
      Key: { userId },
      UpdateExpression: 'SET rateLimitData = :data',
      ExpressionAttributeValues: {
        ':data': { requests, lastReset: now }
      }
    })).catch(err => console.warn('Rate limit update failed:', err));
    
    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true;
  }
}
EOF

echo "✅ Rate limiter created"

echo "📄 Creating README for migration..."

cat > src/README.md << 'EOF'
# TypeScript Backend Migration

## Status: In Progress

### Completed
- ✅ Type definitions (types.ts)
- ✅ Utility functions (utils.ts)
- ✅ Rate limiter with DynamoDB persistence (handlers/rateLimiter.ts)

### Remaining
- ⏳ Auth handlers (handlers/auth.ts)
- ⏳ Game handlers (handlers/game.ts)
- ⏳ Challenge handlers (handlers/challenges.ts)
- ⏳ Vehicle handlers (handlers/vehicles.ts)
- ⏳ Main index.ts
- ⏳ Update GitHub Actions to build TypeScript
- ⏳ Deploy and test

### Migration Steps
1. Split cognito-index.js into modules
2. Convert to TypeScript
3. Update build process
4. Test thoroughly
5. Deploy to production

### Estimated Time Remaining: 6 hours
EOF

echo "✅ Migration structure created"

echo ""
echo "📊 Migration Progress:"
echo "  ✅ Project structure"
echo "  ✅ Type definitions"
echo "  ✅ Utility functions"
echo "  ✅ Rate limiter (DynamoDB-based)"
echo "  ⏳ Handler modules (remaining)"
echo ""
echo "Next steps:"
echo "  1. Review generated files in src/"
echo "  2. Continue splitting cognito-index.js into handlers"
echo "  3. Update tsconfig.json if needed"
echo "  4. Test build: npm run build"
echo ""
echo "✨ TypeScript migration foundation ready!"
