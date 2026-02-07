import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent, APIResponse, UserProfile, GameData, UpdateGameDataRequest, VehicleData } from './types';
import { VEHICLE_DATABASE } from './vehicleDatabase';
import { S3_CONFIG } from './config';
import { successResponse, errorResponse, parseJSON, validateRequired } from './utils';

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'eu-west-1',
  maxAttempts: 3,
  retryMode: 'adaptive'
});

const dynamodb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://dw78cwmd7ajty.cloudfront.net',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

const rateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_MINUTE = 100;

// Track used vehicles per user session to prevent duplicates
const usedVehiclesPerUser = new Map<string, Set<string>>();
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes
const sessionTimestamps = new Map<string, number>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || [];
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) return false;
  
  recentRequests.push(now);
  rateLimits.set(userId, recentRequests);
  return true;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('Retry failed');
}

export const handler = async (event: APIGatewayEvent): Promise<APIResponse> => {
  try {
    const { httpMethod, path, body } = event;
    
    if (httpMethod === 'OPTIONS') {
      return successResponse('');
    }

    if (path === '/leaderboard' && httpMethod === 'GET') {
      return await getLeaderboard();
    }

    if (path === '/vehicles/puzzle' && httpMethod === 'POST') {
      const data = parseJSON(body, { level: 'easy' });
      validateRequired(data.level, 'level');
      const claims = event.requestContext?.authorizer?.claims;
      const userId = claims?.sub;
      return await generateVehiclePuzzle(data.level, userId);
    }

    const claims = event.requestContext?.authorizer?.claims;
    const userId = validateRequired(claims?.sub, 'userId');
    
    if (!checkRateLimit(userId)) {
      return errorResponse('Rate limit exceeded', 429);
    }

    const userProfile: UserProfile = {
      email: claims?.email || '',
      username: claims?.['cognito:username'] || '',
      name: claims?.name || '',
      picture: claims?.picture,
      emailVerified: claims?.email_verified === 'true',
      authMethod: claims?.['cognito:username']?.startsWith('Google_') ? 'google' : 'email'
    };

    if (path === '/gamedata') {
      if (httpMethod === 'GET') return await getGameData(userId, userProfile);
      if (httpMethod === 'POST') {
        const gameData = parseJSON<UpdateGameDataRequest>(body, {} as UpdateGameDataRequest);
        return await updateGameData(userId, gameData, userProfile);
      }
    }

    return errorResponse('Not found', 404);

  } catch (error) {
    console.error('Lambda error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(message, 500);
  }
};

async function getGameData(userId: string, userProfile: UserProfile): Promise<APIResponse> {
  try {
    const result = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.GAME_DATA_TABLE,
        Key: { userId }
      }))
    );

    const gameData: GameData = result.Item as GameData || {
      userId,
      profile: userProfile,
      stats: {
        highScore: 0,
        enduranceHighScore: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        totalPoints: 0,
        difficultyPlays: { Easy: 0, Medium: 0, Hard: 0 },
        gears: 20,
        xp: 0,
        level: 1,
        powerUps: { timeFreeze: 0, clueGiver: 0 },
        correctAnswers: 0,
        incorrectAnswers: 0,
        perfectRounds: 0,
        gameHistory: [],
        lastBonusDate: '',
        loginStreak: 0,
        journeyProgress: {}
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return successResponse(gameData);
  } catch (error) {
    console.error('Get game data error:', error);
    return errorResponse('Failed to get game data');
  }
}

async function updateGameData(userId: string, gameData: UpdateGameDataRequest, userProfile: UserProfile): Promise<APIResponse> {
  try {
    const existing = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.GAME_DATA_TABLE,
        Key: { userId }
      }))
    );

    const currentData = existing.Item as GameData || {
      userId,
      profile: userProfile,
      stats: {
        highScore: 0,
        enduranceHighScore: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        totalPoints: 0,
        difficultyPlays: { Easy: 0, Medium: 0, Hard: 0 },
        gears: 20,
        xp: 0,
        level: 1,
        powerUps: { timeFreeze: 0, clueGiver: 0 },
        correctAnswers: 0,
        incorrectAnswers: 0,
        perfectRounds: 0,
        gameHistory: [],
        lastBonusDate: '',
        loginStreak: 0,
        journeyProgress: {}
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Handle power-up purchase
    if (gameData.mode === 'purchase' && gameData.purchaseData) {
      const { powerUp, cost } = gameData.purchaseData;
      
      if (!powerUp || typeof cost !== 'number') {
        return errorResponse('Invalid purchase data');
      }
      
      if (currentData.stats.gears < cost) {
        return errorResponse('Insufficient gears');
      }
      
      currentData.stats.gears -= cost;
      currentData.stats.powerUps[powerUp as keyof typeof currentData.stats.powerUps] = 
        (currentData.stats.powerUps[powerUp as keyof typeof currentData.stats.powerUps] || 0) + 1;
    }

    currentData.updatedAt = new Date().toISOString();

    const updateResult = await retryOperation(() => 
      dynamodb.send(new UpdateCommand({
        TableName: process.env.GAME_DATA_TABLE,
        Key: { userId },
        UpdateExpression: 'SET stats = :stats, profile = :profile, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':stats': currentData.stats,
          ':profile': currentData.profile,
          ':updatedAt': currentData.updatedAt
        },
        ReturnValues: 'ALL_NEW'
      }))
    );

    return successResponse(updateResult.Attributes);
  } catch (error) {
    console.error('Update game data error:', error);
    return errorResponse('Failed to update game data');
  }
}

async function getLeaderboard(): Promise<APIResponse> {
  try {
    const result = await retryOperation(() => 
      dynamodb.send(new ScanCommand({ TableName: process.env.GAME_DATA_TABLE }))
    );

    const players = (result.Items as GameData[])
      .map(item => ({
        userId: item.userId,
        username: item.profile?.username || 'Anonymous',
        highScore: item.stats?.highScore || 0,
        level: item.stats?.level || 1
      }))
      .sort((a, b) => b.highScore - a.highScore)
      .slice(0, 10);

    return successResponse({ leaderboard: players });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return errorResponse('Failed to get leaderboard');
  }
}

async function generateVehiclePuzzle(level: string, userId?: string): Promise<APIResponse> {
  try {
    const levelKey = level.toLowerCase() as 'easy' | 'medium' | 'hard';
    const vehicles = VEHICLE_DATABASE[levelKey] || [];
    
    if (!vehicles.length) {
      return errorResponse('No vehicles available', 404);
    }
    
    // Clean up expired sessions
    const now = Date.now();
    for (const [uid, timestamp] of sessionTimestamps.entries()) {
      if (now - timestamp > SESSION_EXPIRY) {
        usedVehiclesPerUser.delete(uid);
        sessionTimestamps.delete(uid);
      }
    }
    
    // Get or create user's used vehicles set
    const sessionKey = userId || 'anonymous';
    if (!usedVehiclesPerUser.has(sessionKey)) {
      usedVehiclesPerUser.set(sessionKey, new Set());
    }
    const usedVehicles = usedVehiclesPerUser.get(sessionKey)!;
    sessionTimestamps.set(sessionKey, now);
    
    // Filter out already used vehicles
    const availableVehicles = vehicles.filter((v: VehicleData) => !usedVehicles.has(v.id));
    
    // If all vehicles used, reset for this user
    if (availableVehicles.length === 0) {
      console.log(`All ${levelKey} vehicles used for ${sessionKey}, resetting...`);
      usedVehicles.clear();
      availableVehicles.push(...vehicles);
    }
    
    const randomVehicle = availableVehicles[Math.floor(Math.random() * availableVehicles.length)];
    usedVehicles.add(randomVehicle.id);
    
    const imageUrl = `${S3_CONFIG.BASE_URL}/${randomVehicle.imageKey}`;
    
    const puzzle = {
      id: randomVehicle.id,
      vehicle: randomVehicle.vehicle,
      imageUrl,
      brandOptions: shuffleArray([...randomVehicle.brandOptions]),
      modelOptions: shuffleArray([...randomVehicle.modelOptions]),
      yearOptions: shuffleArray([...randomVehicle.yearOptions]),
      difficulty: randomVehicle.difficulty,
      tags: randomVehicle.tags
    };
    
    return successResponse(puzzle);
  } catch (error) {
    console.error('Generate puzzle error:', error);
    return errorResponse('Failed to generate puzzle');
  }
}
