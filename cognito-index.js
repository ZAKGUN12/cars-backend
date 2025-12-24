// Updated: 2024-01-15
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

// S3 Configuration
const S3_CONFIG = {
  BUCKET_NAME: 'vehicle-guesser-1764962592',
  REGION: 'eu-west-1',
  BASE_URL: 'https://vehicle-guesser-1764962592.s3.eu-west-1.amazonaws.com',
  PATHS: {
    VEHICLES: 'images/vehicles',
    BRANDS: 'images/brands',
    ICONS: 'images/icons',
    THUMBNAILS: 'images/thumbnails'
  }
};

// Vehicle database - organized by difficulty with new S3 paths
const VEHICLE_DATABASE = {
  easy: [
    {
      id: 'easy_001',
      vehicle: { brand: 'Toyota', model: 'Camry', year: 2020 },
      imageKey: 'images/vehicles/easy/toyota-camry-2020.jpg',
      imagePart: 'headlight',
      brandOptions: ['Toyota', 'Honda', 'Ford', 'Chevrolet'],
      modelOptions: ['Camry', 'Corolla', 'Prius', 'Highlander'],
      yearOptions: [2020, 2019, 2015, 2010],
      level: 'Easy',
      difficulty: 2,
      tags: ['sedan', 'mainstream']
    },
    {
      id: 'easy_002',
      vehicle: { brand: 'Honda', model: 'Civic', year: 2019 },
      imageKey: 'images/vehicles/easy/honda-civic-2019.jpg',
      imagePart: 'grille',
      brandOptions: ['Honda', 'Toyota', 'Nissan', 'Hyundai'],
      modelOptions: ['Civic', 'Accord', 'CR-V', 'Pilot'],
      yearOptions: [2019, 2020, 2017, 2014],
      level: 'Easy',
      difficulty: 1,
      tags: ['sedan', 'compact']
    },
    {
      id: 'easy_003',
      vehicle: { brand: 'Ford', model: 'F-150', year: 2023 },
      imageKey: 'images/vehicles/easy/ford-f150-2023-taillight.jpg',
      imagePart: 'taillight',
      brandOptions: ['Ford', 'Chevrolet', 'Ram', 'GMC'],
      modelOptions: ['F-150', 'Mustang', 'Explorer', 'Escape'],
      yearOptions: [2023, 2020, 2017, 2014],
      level: 'Easy',
      difficulty: 2,
      tags: ['truck']
    }
  ],
  medium: [
    {
      id: 'medium_001',
      vehicle: { brand: 'BMW', model: 'X5', year: 2020 },
      imageKey: 'images/vehicles/medium/bmw-x5-2020.jpg',
      imagePart: 'badge',
      brandOptions: ['BMW', 'Audi', 'Mercedes-Benz', 'Lexus'],
      modelOptions: ['X5', 'X3', '3 Series', '5 Series'],
      yearOptions: [2020, 2019, 2021, 2018],
      level: 'Medium',
      difficulty: 5,
      tags: ['luxury', 'suv']
    },
    {
      id: 'medium_002',
      vehicle: { brand: 'Mercedes-Benz', model: 'C-Class', year: 2020 },
      imageKey: 'images/vehicles/medium/mercedes-c-class-2020.jpg',
      imagePart: 'grille',
      brandOptions: ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus'],
      modelOptions: ['C-Class', 'E-Class', 'GLC', 'GLE'],
      yearOptions: [2020, 2021, 2019, 2018],
      level: 'Medium',
      difficulty: 6,
      tags: ['luxury', 'sedan']
    }
  ],
  hard: [
    {
      id: 'hard_001',
      vehicle: { brand: 'Porsche', model: '911 GT3', year: 2020 },
      imageKey: 'images/vehicles/hard/porsche-911gt3-2020-exhaust.jpg',
      imagePart: 'exhaust',
      brandOptions: ['Porsche', 'Ferrari', 'Lamborghini', 'McLaren'],
      modelOptions: ['911 GT3', '911 Turbo', 'Cayman GT4', 'Boxster'],
      yearOptions: [2020, 2019, 2018, 2017],
      level: 'Hard',
      difficulty: 9,
      tags: ['sports', 'exotic', 'track']
    }
  ]
};

// Blacklisted images (broken/missing)
const brokenImages = new Set();

// Shuffle array utility
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Enhanced data validation
const validateStats = (stats) => {
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
    throw new Error('Invalid high score');
  }
};

const generateSecureId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Rate limiting
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 100;

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || [];
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false; // Rate limit exceeded
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimits.set(userId, recentRequests);
  
  return true; // Request allowed
}
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'eu-west-1',
  maxAttempts: 3,
  retryMode: 'adaptive'
});
const dynamodb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

// Retry utility function
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

// Simple in-memory cache for leaderboard
let leaderboardCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path, body } = event;
    
    // Handle CORS preflight - must be before any other logic
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: ''
      };
    }

    // Public endpoints that don't require authentication
    if (path === '/leaderboard' && httpMethod === 'GET') {
      return await getLeaderboard();
    }
    
    if (path === '/check-username' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required', code: 'MISSING_BODY' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body', code: 'INVALID_JSON' })
        };
      }
      
      return await checkUsernameExists(requestData.username);
    }
    
    if (path === '/update-activity' && httpMethod === 'POST') {
      // Extract user info from Cognito JWT for activity update
      const activityClaims = event.requestContext?.authorizer?.claims;
      const activityUserId = activityClaims?.sub;
      
      // Update user activity timestamp
      if (activityUserId) {
        try {
          const existing = await retryOperation(() => 
            dynamodb.send(new GetCommand({
              TableName: process.env.GAME_DATA_TABLE,
              Key: { userId: activityUserId }
            }))
          );
          
          if (existing.Item) {
            existing.Item.updatedAt = new Date().toISOString();
            existing.Item.lastActivity = new Date().toISOString();
            await retryOperation(() => 
              dynamodb.send(new PutCommand({
                TableName: process.env.GAME_DATA_TABLE,
                Item: existing.Item
              }))
            );
          }
        } catch (error) {
          console.warn('Failed to update activity:', error);
        }
      }
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true })
      };
    }

    // Extract user info from Cognito JWT
    const claims = event.requestContext?.authorizer?.claims;
    const userId = claims?.sub;
    if (!userId) {
      console.log('No user ID found in claims:', JSON.stringify(claims, null, 2));
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized - Please login again', code: 'MISSING_USER_ID' })
      };
    }
    
    // Rate limiting check
    if (!checkRateLimit(userId)) {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' })
      };
    }
    
    // Extract user profile from Cognito claims
    const isGoogleUser = claims?.['cognito:username']?.startsWith('Google_');
    const userProfile = {
      email: claims?.email,
      username: claims?.['cognito:username'] || claims?.preferred_username,
      name: claims?.name,
      picture: claims?.picture,
      emailVerified: claims?.email_verified === 'true',
      authMethod: isGoogleUser ? 'google' : 'email'
    };
    
    // Validate user ID format
    if (!/^[a-f0-9-]{36}$/.test(userId)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid user ID format', code: 'INVALID_USER_ID' })
      };
    }

    // Route handling
    if (path === '/gamedata') {
      if (httpMethod === 'GET') {
        return await getGameData(userId, userProfile);
      } else if (httpMethod === 'POST') {
        if (!body) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Request body is required', code: 'MISSING_BODY' })
          };
        }
        
        let gameData;
        try {
          gameData = JSON.parse(body);
        } catch (parseError) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid JSON in request body', code: 'INVALID_JSON' })
          };
        }
        
        return await updateGameData(userId, gameData, userProfile);
      }
    }

    if (path === '/setup-username' && httpMethod === 'POST') {
      console.log('Setup username request received for user:', userId);
      
      if (!body) {
        console.error('Setup username: Missing request body');
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required', code: 'MISSING_BODY' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
        console.log('Setup username request data:', requestData);
      } catch (parseError) {
        console.error('Setup username: Invalid JSON in request body:', parseError);
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body', code: 'INVALID_JSON' })
        };
      }
      
      console.log('Calling setupUsername function...');
      const result = await setupUsername(userId, requestData.username, userProfile);
      console.log('Setup username result:', result);
      return result;
    }

    if (path === '/check-email' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required', code: 'MISSING_BODY' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body', code: 'INVALID_JSON' })
        };
      }
      
      return await checkEmailExists(requestData.email);
    }



    if (path === '/create-challenge' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }
      
      let challengeData;
      try {
        challengeData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      return await createChallenge(userId, challengeData, userProfile);
    }

    if (path === '/get-challenge' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      return await getChallenge(requestData.challengeId);
    }

    if (path === '/my-challenges' && httpMethod === 'GET') {
      return await getMyChallenges(userId);
    }

    if (path === '/challenge-status' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      return await getChallengeStatus(userId, requestData.challengeId);
    }

    if (path === '/accept-challenge' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      return await acceptChallenge(userId, requestData.challengeId);
    }

    if (path === '/decline-challenge' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      return await declineChallenge(userId, requestData.challengeId);
    }

    // Quick match endpoint - shows online players for direct challenges
    if (path === '/quick-match' && httpMethod === 'GET') {
      return await getOnlinePlayersForQuickMatch(userId);
    }



    if (path === '/notifications' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: `data: ${JSON.stringify({type: 'connected', userId})}

`
      };
    }

    // Vehicle API endpoints - make public for better performance
    if (path === '/vehicles' && httpMethod === 'GET') {
      const level = event.queryStringParameters?.level;
      if (!level) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Level parameter is required' })
        };
      }
      return await getVehiclesByLevel(level);
    }
    
    if (path === '/vehicles/puzzle' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      return await generateVehiclePuzzle(requestData.level);
    }
    
    if (path === '/vehicles/report-broken' && httpMethod === 'POST') {
      if (!body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }
      
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      return await reportBrokenImage(requestData.imageUrl);
    }

    if (path.startsWith('/images/') && httpMethod === 'GET') {
      return await getVehicleImage(path);
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Lambda error:', error);
    
    // Handle specific AWS errors
    if (error.name === 'ResourceNotFoundException') {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' })
      };
    }
    
    if (error.name === 'ValidationException') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Validation error', code: 'VALIDATION_ERROR' })
      };
    }
    
    if (error.name === 'ThrottlingException') {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Too many requests', code: 'THROTTLED' })
      };
    }
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
    };
  }
};

async function getGameData(userId, userProfile) {
  try {
    let result = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.GAME_DATA_TABLE,
        Key: { userId }
      }))
    );

    // Check by email for account linking if no user found OR if user has auto-generated username
    const hasAutoGeneratedUsername = result.Item && result.Item.profile && result.Item.profile.username && 
      (result.Item.profile.username.startsWith('Google_') || result.Item.profile.username.includes('@'));
    
    if ((!result.Item || hasAutoGeneratedUsername) && userProfile.email) {
      console.log('User not found by userId or has auto-generated username, checking by email:', userProfile.email);
      const existingUserByEmail = await retryOperation(() => 
        dynamodb.send(new ScanCommand({
          TableName: process.env.GAME_DATA_TABLE,
          FilterExpression: '#profile.#email = :email',
          ExpressionAttributeNames: {
            '#profile': 'profile',
            '#email': 'email'
          },
          ExpressionAttributeValues: {
            ':email': userProfile.email
          }
        }))
      );
      
      if (existingUserByEmail.Items && existingUserByEmail.Items.length > 0) {
        const existingUser = existingUserByEmail.Items[0];
        
        // Only link if the existing user has a custom username and current user doesn't
        const existingHasCustomUsername = existingUser.profile && existingUser.profile.username && 
          !existingUser.profile.username.startsWith('Google_') && !existingUser.profile.username.includes('@');
        
        if (existingHasCustomUsername && existingUser.userId !== userId) {
          console.log('Found existing user by email with custom username, creating linked account');
          
          // Create new record with current userId but preserve existing data
          const linkedUser = {
            ...existingUser,
            userId: userId, // Use current userId
            updatedAt: new Date().toISOString()
          };
          
          // Save the linked account
          await retryOperation(() => 
            dynamodb.send(new PutCommand({
              TableName: process.env.GAME_DATA_TABLE,
              Item: linkedUser
            }))
          );
          
          result.Item = linkedUser;
          console.log('Account linked successfully for user:', userId);
        }
      }
    }

    const gameData = result.Item || {
      userId,
      profile: {
        email: userProfile.email,
        username: userProfile.username,
        name: userProfile.name,
        picture: userProfile.picture,
        emailVerified: userProfile.emailVerified,
        authMethod: userProfile.authMethod
      },
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

    // Check if user exists by email first (for account linking)
    if (!gameData.userId) {
      const existingUserByEmail = await retryOperation(() => 
        dynamodb.send(new ScanCommand({
          TableName: process.env.GAME_DATA_TABLE,
          FilterExpression: '#profile.#email = :email',
          ExpressionAttributeNames: {
            '#profile': 'profile',
            '#email': 'email'
          },
          ExpressionAttributeValues: {
            ':email': userProfile.email
          }
        }))
      );
      
      if (existingUserByEmail.Items && existingUserByEmail.Items.length > 0) {
        // Found existing user with same email, merge data
        const existingUser = existingUserByEmail.Items[0];
        gameData = existingUser;
        console.log('Found existing user by email, merging data:', existingUser.userId);
      }
    }

    // Ensure all required properties exist (migration for existing users)
    if (!gameData.profile) {
      gameData.profile = {
        email: userProfile.email,
        username: userProfile.username,
        name: userProfile.name,
        picture: userProfile.picture,
        emailVerified: userProfile.emailVerified,
        authMethod: userProfile.authMethod
      };
    } else {
      // Update profile with latest info from Cognito, but preserve custom username
      const existingUsername = gameData.profile.username;
      gameData.profile = { ...gameData.profile, ...userProfile };
      
      // Preserve custom username if it exists and is not a Cognito auto-generated one
      if (existingUsername && !existingUsername.startsWith('Google_') && !existingUsername.includes('@') && existingUsername !== userProfile.username) {
        gameData.profile.username = existingUsername;
        console.log('Preserved custom username:', existingUsername, 'for user:', userId);
      }
      
      // Ensure authMethod is set for existing users
      if (!gameData.profile.authMethod) {
        gameData.profile.authMethod = userProfile.authMethod;
      }
    }
    
    if (!gameData.stats.gears) gameData.stats.gears = 20;
    if (!gameData.stats.xp) gameData.stats.xp = 0;
    if (!gameData.stats.level) gameData.stats.level = 1;
    if (!gameData.stats.gamesWon) gameData.stats.gamesWon = 0;
    if (!gameData.stats.powerUps) gameData.stats.powerUps = { timeFreeze: 0, clueGiver: 0 };
    if (!gameData.stats.journeyProgress) gameData.stats.journeyProgress = {};
    if (!gameData.stats.difficultyPlays) gameData.stats.difficultyPlays = { Easy: 0, Medium: 0, Hard: 0 };
    if (!gameData.stats.gameHistory) gameData.stats.gameHistory = [];

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(gameData)
    };
  } catch (error) {
    console.error('Get game data error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get game data' })
    };
  }
}

async function updateGameData(userId, gameData, userProfile) {
  try {
    // Get existing data with retry
    const existing = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.GAME_DATA_TABLE,
        Key: { userId }
      }))
    );

    const currentData = existing.Item || {
      userId,
      profile: {
        email: userProfile.email,
        username: userProfile.username,
        name: userProfile.name,
        picture: userProfile.picture,
        emailVerified: userProfile.emailVerified,
        authMethod: userProfile.authMethod
      },
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
      createdAt: new Date().toISOString()
    };

    // Ensure all required properties exist (migration for existing users)
    if (!currentData.profile) {
      currentData.profile = {
        email: userProfile.email,
        username: userProfile.username,
        name: userProfile.name,
        picture: userProfile.picture,
        emailVerified: userProfile.emailVerified,
        authMethod: userProfile.authMethod
      };
    } else {
      // Update profile with latest info from Cognito, but preserve custom username
      const existingUsername = currentData.profile.username;
      currentData.profile = { ...currentData.profile, ...userProfile };
      
      // Preserve custom username if it exists and is not a Cognito auto-generated one
      if (existingUsername && !existingUsername.startsWith('Google_') && !existingUsername.includes('@') && existingUsername !== userProfile.username) {
        currentData.profile.username = existingUsername;
        console.log('Preserved custom username:', existingUsername, 'for user:', userId);
      }
      
      // Ensure authMethod is set for existing users
      if (!currentData.profile.authMethod) {
        currentData.profile.authMethod = userProfile.authMethod;
      }
    }
    
    // Ensure all numeric fields are valid numbers
    currentData.stats.gears = Number(currentData.stats.gears) || 20;
    currentData.stats.xp = Number(currentData.stats.xp) || 0;
    currentData.stats.level = Number(currentData.stats.level) || 1;
    currentData.stats.highScore = Number(currentData.stats.highScore) || 0;
    currentData.stats.enduranceHighScore = Number(currentData.stats.enduranceHighScore) || 0;
    currentData.stats.gamesPlayed = Number(currentData.stats.gamesPlayed) || 0;
    currentData.stats.gamesWon = Number(currentData.stats.gamesWon) || 0;
    currentData.stats.totalPoints = Number(currentData.stats.totalPoints) || 0;
    currentData.stats.correctAnswers = Number(currentData.stats.correctAnswers) || 0;
    currentData.stats.incorrectAnswers = Number(currentData.stats.incorrectAnswers) || 0;
    currentData.stats.perfectRounds = Number(currentData.stats.perfectRounds) || 0;
    if (!currentData.stats.powerUps) currentData.stats.powerUps = { timeFreeze: 0, clueGiver: 0 };
    currentData.stats.powerUps.timeFreeze = Number(currentData.stats.powerUps.timeFreeze) || 0;
    currentData.stats.powerUps.clueGiver = Number(currentData.stats.powerUps.clueGiver) || 0;
    if (!currentData.stats.journeyProgress) currentData.stats.journeyProgress = {};
    if (!currentData.stats.difficultyPlays) currentData.stats.difficultyPlays = { Easy: 0, Medium: 0, Hard: 0 };
    currentData.stats.difficultyPlays.Easy = Number(currentData.stats.difficultyPlays.Easy) || 0;
    currentData.stats.difficultyPlays.Medium = Number(currentData.stats.difficultyPlays.Medium) || 0;
    currentData.stats.difficultyPlays.Hard = Number(currentData.stats.difficultyPlays.Hard) || 0;
    if (!currentData.stats.gameHistory) currentData.stats.gameHistory = [];

    // Update stats
    const { score, mode, level, mistakes = 0, isEndurance = false, bonusData, journeyData, hintCost, powerUpType, purchaseData, profileData, correctCount = 0 } = gameData;
    
    // Enhanced server-side score validation (anti-cheat)
    const MAX_POINTS_PER_VEHICLE = 210;
    const MAX_POINTS_PER_GAME = mode === 'Journey' ? MAX_POINTS_PER_VEHICLE * 10 : MAX_POINTS_PER_VEHICLE * 5;
    const MIN_TIME_PER_ROUND = 3; // Minimum 3 seconds per round
    const MAX_PERFECT_STREAK = 10; // Maximum consecutive perfect games
    
    // SERVER-SIDE SCORE CALCULATION (ANTI-CHEAT)
    let serverCalculatedScore = 0;
    let serverCalculatedGears = 0;
    let serverCalculatedXP = 0;
    
    if (mode !== 'bonus' && mode !== 'profile_update' && mode !== 'hint' && mode !== 'powerup' && mode !== 'purchase') {
      // Recalculate score on server to prevent manipulation
      const basePoints = isEndurance ? 10 : 25;
      const maxTimeBonus = 10 * 2; // Max 10 seconds * 2 multiplier
      const maxComboBonus = 5 * 5; // Max 5 combo * 5 multiplier
      const perfectBonus = (mistakes === 0 && !isEndurance) ? 30 : 0;
      
      serverCalculatedScore = basePoints + maxTimeBonus + maxComboBonus + perfectBonus;
      
      // Validate against client score (allow 10% variance for network delays)
      const variance = Math.abs(score - serverCalculatedScore) / serverCalculatedScore;
      if (variance > 0.1) {
        console.warn(`Score mismatch: client=${score}, server=${serverCalculatedScore}, variance=${variance}`);
        // Use server calculated score
        score = serverCalculatedScore;
      }
      
      // Server-side gear calculation
      serverCalculatedGears = Math.floor(serverCalculatedScore / 50) + (mistakes === 0 ? 10 : 0);
      
      // Server-side XP calculation
      const baseXp = Math.floor(serverCalculatedScore / 10);
      serverCalculatedXP = baseXp + (mistakes === 0 ? 25 : 0);
    }
    
    // Basic score validation with tighter limits
    const actualMaxScore = mode === 'Journey' ? 210 * 10 : 210 * 5;
    if (score > actualMaxScore || score < 0) {
      console.warn(`Invalid score detected: ${score} for user ${userId} in mode ${mode}`);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid score value' })
      };
    }
    
    // Time-based validation (if provided)
    if (gameData.timeSpent && gameData.timeSpent < MIN_TIME_PER_ROUND) {
      console.warn(`Suspiciously fast completion: ${gameData.timeSpent}s for user ${userId}`);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid completion time' })
      };
    }
    
    // Perfect game streak validation
    if (mistakes === 0 && currentData.stats.gameHistory) {
      const recentPerfectGames = currentData.stats.gameHistory
        .slice(0, MAX_PERFECT_STREAK)
        .filter(game => game.mistakes === 0).length;
      
      if (recentPerfectGames >= MAX_PERFECT_STREAK) {
        console.warn(`Suspicious perfect streak for user ${userId}`);
        // Don't block, but flag for review
      }
    }
    
    if (mode === 'bonus' && bonusData) {
      // Handle daily bonus
      currentData.stats.gears += bonusData.gears;
      currentData.stats.lastBonusDate = bonusData.lastBonusDate;
      currentData.stats.loginStreak = bonusData.loginStreak;
    } else if (mode === 'profile_update' && profileData) {
      // Handle profile update (username setup)
      if (profileData.username) {
        currentData.profile.username = profileData.username;
        currentData.profile.name = profileData.username;
      }
    } else if (mode === 'hint' && hintCost) {
      // Handle hint usage with validation
      const FIXED_HINT_COST = 5; // Server-enforced cost
      if (hintCost !== FIXED_HINT_COST) {
        console.warn(`Invalid hint cost: ${hintCost} vs ${FIXED_HINT_COST}`);
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid hint cost' })
        };
      }
      currentData.stats.gears = Math.max(0, currentData.stats.gears - FIXED_HINT_COST);
    } else if (mode === 'powerup' && powerUpType) {
      // Handle powerup usage
      if (currentData.stats.powerUps[powerUpType] > 0) {
        currentData.stats.powerUps[powerUpType] -= 1;
      }
    } else if (mode === 'purchase' && purchaseData) {
      // Handle powerup purchase with validation
      const { powerUp, cost } = purchaseData;
      
      // Validate powerup type and cost
      const validPowerUps = { timeFreeze: 10, clueGiver: 15 }; // Fixed costs
      const actualCost = validPowerUps[powerUp];
      
      if (!actualCost || cost !== actualCost) {
        console.warn(`Invalid powerup purchase: ${powerUp} cost ${cost} vs ${actualCost}`);
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid purchase data' })
        };
      }
      
      if (currentData.stats.gears >= actualCost) {
        currentData.stats.gears -= actualCost;
        currentData.stats.powerUps[powerUp] = (currentData.stats.powerUps[powerUp] || 0) + 1;
      } else {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Insufficient gears' })
        };
      }
    } else {
      // Handle game stats with proper number validation
      currentData.stats.gamesPlayed = Number(currentData.stats.gamesPlayed || 0) + 1;
      currentData.stats.totalPoints = Number(currentData.stats.totalPoints || 0) + Number(score || 0);
      currentData.stats.difficultyPlays[level] = Number(currentData.stats.difficultyPlays[level] || 0) + 1;
      
      // Determine if game was won (score > 0 and completed)
      const gameWon = Number(score || 0) > 0;
      if (gameWon) {
        currentData.stats.gamesWon = Number(currentData.stats.gamesWon || 0) + 1;
      }
      
      if (isEndurance) {
        currentData.stats.enduranceHighScore = Math.max(Number(currentData.stats.enduranceHighScore || 0), Number(score || 0));
      } else {
        currentData.stats.highScore = Math.max(Number(currentData.stats.highScore || 0), Number(score || 0));
      }
      
      currentData.stats.correctAnswers = Number(currentData.stats.correctAnswers || 0) + Number(correctCount || 0);
      currentData.stats.incorrectAnswers = Number(currentData.stats.incorrectAnswers || 0) + Number(mistakes || 0);
      
      // Perfect game: completed with no mistakes and minimum score
      const isPerfectGame = !isEndurance && mistakes === 0 && Number(score || 0) >= 50;
      if (isPerfectGame) {
        currentData.stats.perfectRounds += 1;
      }
      
      // Use server-calculated values for security
      const validScore = serverCalculatedScore || Number(score || 0);
      const xpGained = serverCalculatedXP || (Math.floor(validScore / 10) + (mistakes === 0 ? 25 : 0));
      const gearsGained = serverCalculatedGears || (Math.floor(validScore / 50) + (mistakes === 0 ? 10 : 0));
      
      const XP_PER_LEVEL = 500;
      const GEARS_PER_LEVEL_UP = 25;
      
      let newXp = Number(currentData.stats.xp || 0) + Number(xpGained || 0);
      let newLevel = Number(currentData.stats.level || 1);
      let newGears = Number(currentData.stats.gears || 0) + Number(gearsGained || 0);
      
      // Ensure all values are valid numbers
      newXp = isNaN(newXp) ? 0 : newXp;
      newLevel = isNaN(newLevel) ? 1 : newLevel;
      newGears = isNaN(newGears) ? 0 : newGears;
      
      if (newXp >= XP_PER_LEVEL) {
        const levelsGained = Math.floor(newXp / XP_PER_LEVEL);
        newLevel += levelsGained;
        newXp = newXp % XP_PER_LEVEL;
        newGears += GEARS_PER_LEVEL_UP * levelsGained;
      }
      
      currentData.stats.xp = Math.max(0, Math.floor(newXp));
      currentData.stats.level = Math.max(1, Math.floor(newLevel));
      currentData.stats.gears = Math.max(0, Math.floor(newGears));
      
      // Handle journey progress with idempotent updates
      if (mode === 'Journey' && journeyData) {
        try {
          const { levelId, stars, completed, score: journeyScore } = journeyData;
          
          // Validate journey data with strict checks
          if (!levelId || typeof levelId !== 'string' || !/^level_\d+$/.test(levelId)) {
            throw new Error('Invalid levelId format');
          }
          if (typeof stars !== 'number' || stars < 0 || stars > 3) {
            throw new Error('Invalid stars value');
          }
          if (typeof completed !== 'boolean') {
            throw new Error('Invalid completed value');
          }
          if (typeof journeyScore !== 'number' || journeyScore < 0 || journeyScore > 210) {
            throw new Error('Invalid journey score');
          }
          
          // Validate stars align with score thresholds
          const expectedStars = journeyScore >= 180 ? 3 : journeyScore >= 120 ? 2 : journeyScore >= 60 ? 1 : 0;
          if (stars > expectedStars) {
            throw new Error('Stars do not align with score');
          }
          
          const existing = currentData.stats.journeyProgress[levelId];
          
          // Idempotent update: only update if better or new
          if (!existing || existing.score < journeyScore || (!existing.completed && completed)) {
            currentData.stats.journeyProgress[levelId] = {
              stars: Math.max(stars, existing?.stars || 0),
              score: Math.max(journeyScore, existing?.score || 0),
              completed: completed || (existing?.completed || false)
            };
          }
        } catch (journeyError) {
          console.error('Journey data processing error:', journeyError);
        }
      }
      
      // Add to game history with secure ID
      currentData.stats.gameHistory.unshift({
        id: generateSecureId(),
        date: new Date().toLocaleDateString(),
        mode,
        level,
        score: Math.floor(Number(score)), // Ensure integer
        mistakes: Number(mistakes || 0),
        won: gameWon,
        timeSpent: gameData.timeSpent || null,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 10 games
      currentData.stats.gameHistory = currentData.stats.gameHistory.slice(0, 10);
    }
    // Validate stats before saving
    try {
      validateStats(currentData.stats);
    } catch (validationError) {
      console.error('Stats validation failed:', validationError.message);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: validationError.message })
      };
    }
    
    currentData.updatedAt = new Date().toISOString();

    // Use atomic update instead of full item replacement
    const updateParams = {
      TableName: process.env.GAME_DATA_TABLE,
      Key: { userId },
      UpdateExpression: 'SET stats = :stats, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':stats': currentData.stats,
        ':updatedAt': currentData.updatedAt
      },
      ConditionExpression: 'attribute_exists(userId)', // Ensure record exists
      ReturnValues: 'ALL_NEW'
    };

    // Save updated data with atomic operation
    const updateResult = await retryOperation(() => 
      dynamodb.send(new UpdateCommand(updateParams))
    );
    
    // Invalidate leaderboard cache on score/username update
    if (score > 0 || mode === 'Journey' || mode === 'profile_update') {
      leaderboardCache = null;
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(updateResult.Attributes)
    };
  } catch (error) {
    console.error('Update game data error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to update game data' })
    };
  }
}

async function getLeaderboard() {
  try {
    // Check cache first
    const now = Date.now();
    if (leaderboardCache && (now - cacheTimestamp) < CACHE_TTL) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'X-Cache': 'HIT' },
        body: JSON.stringify(leaderboardCache)
      };
    }

    const result = await retryOperation(() => 
      dynamodb.send(new ScanCommand({
        TableName: process.env.GAME_DATA_TABLE
      }))
    );

    const players = result.Items
      .map(item => {
        // Use username from database table
        let displayName = 'Anonymous';
        
        if (item.username) {
          // Use username field from database table (like "zekscaler", "icem")
          displayName = item.username;
        } else if (item.profile?.username && !item.profile.username.startsWith('Google_')) {
          // Fallback to profile username if set
          displayName = item.profile.username;
        } else if (item.userId) {
          // Generate UID from database userId as last resort
          const uid = item.userId.replace(/-/g, '').substring(0, 8).toUpperCase();
          displayName = `UID_${uid}`;
        }
        
        return {
          userId: item.userId,
          username: displayName,
          picture: item.profile?.picture,
          highScore: item.stats.highScore || 0,
          level: item.stats.level || 1,
          gamesPlayed: item.stats.gamesPlayed || 0,
          totalPoints: item.stats.totalPoints || 0,
          winRate: item.stats.gamesPlayed > 0 ? Math.round((item.stats.gamesWon / item.stats.gamesPlayed) * 100) : 0,
          lastActive: item.lastActivity || item.updatedAt || item.createdAt,
          isOnline: (item.lastActivity || item.updatedAt) && (Date.now() - new Date(item.lastActivity || item.updatedAt).getTime()) < 180000 // 3 minutes
        };
      })
      .filter(player => player.username !== 'Anonymous' && player.gamesPlayed >= 0) // Show all players with usernames
      .sort((a, b) => b.highScore - a.highScore)
      .slice(0, 50) // Show top 50 for rival challenges
      .map((user, index) => ({
        rank: index + 1,
        ...user
      }));

    const response = {
      leaderboard: players.slice(0, 10),
      rivals: players,
      totalPlayers: result.Items.length
    };
    
    // Update cache
    leaderboardCache = response;
    cacheTimestamp = now;
    
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'X-Cache': 'MISS' },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get leaderboard' })
    };
  }
}

async function setupUsername(userId, username, userProfile) {
  try {
    // Validate username format
    if (!username || typeof username !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Username is required' })
      };
    }
    
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Username must be 3-20 characters' })
      };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Username can only contain letters, numbers, and underscores' })
      };
    }
    
    // Check if username already exists (reuse the new function)
    const usernameCheck = await checkUsernameExists(trimmedUsername);
    if (usernameCheck.statusCode !== 200) {
      return usernameCheck;
    }
    
    const usernameCheckResult = JSON.parse(usernameCheck.body);
    if (usernameCheckResult.exists) {
      // Check if it's the same user updating their username
      const allUsers = await retryOperation(() => 
        dynamodb.send(new ScanCommand({
          TableName: process.env.GAME_DATA_TABLE
        }))
      );
      
      const existingUser = allUsers.Items?.find(item => {
        const storedUsername = item.profile?.username;
        return storedUsername && storedUsername.toLowerCase() === trimmedUsername.toLowerCase() && item.userId === userId;
      });
      
      if (!existingUser) {
        return {
          statusCode: 409,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Username already taken' })
        };
      }
    }
    
    // Update user profile with new username
    const gameData = {
      mode: 'profile_update',
      profileData: { username: trimmedUsername }
    };
    
    return await updateGameData(userId, gameData, userProfile);
    
  } catch (error) {
    console.error('Setup username error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to setup username' })
    };
  }
}

async function checkEmailExists(email) {
  try {
    if (!email || typeof email !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }
    
    // Check if email exists in any user profile
    const existingUsers = await retryOperation(() => 
      dynamodb.send(new ScanCommand({
        TableName: process.env.GAME_DATA_TABLE,
        FilterExpression: '#profile.#email = :email',
        ExpressionAttributeNames: {
          '#profile': 'profile',
          '#email': 'email'
        },
        ExpressionAttributeValues: {
          ':email': email.toLowerCase()
        }
      }))
    );
    
    const exists = existingUsers.Items && existingUsers.Items.length > 0;
    let authMethod = null;
    
    if (exists) {
      const user = existingUsers.Items[0];
      authMethod = user.profile?.authMethod || 'unknown';
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ exists, authMethod })
    };
    
  } catch (error) {
    console.error('Check email exists error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to check email' })
    };
  }
}

async function checkUsernameExists(username) {
  try {
    if (!username || typeof username !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Username is required' })
      };
    }
    
    const trimmedUsername = username.trim().toLowerCase();
    
    // Get all users and check case-insensitive
    const allUsers = await retryOperation(() => 
      dynamodb.send(new ScanCommand({
        TableName: process.env.GAME_DATA_TABLE
      }))
    );
    
    // Check if any username matches case-insensitively
    const exists = allUsers.Items?.some(item => {
      const storedUsername = item.profile?.username;
      return storedUsername && storedUsername.toLowerCase() === trimmedUsername;
    }) || false;
    
    console.log(`Username check: "${trimmedUsername}" exists: ${exists}`);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ exists })
    };
    
  } catch (error) {
    console.error('Check username exists error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to check username' })
    };
  }
}

async function createChallenge(userId, challengeData, userProfile) {
  try {
    // Get the user's actual username from database
    const userResult = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.GAME_DATA_TABLE,
        Key: { userId }
      }))
    );
    
    const challengerName = userResult.Item?.profile?.username || userProfile.username || userProfile.name || 'Unknown Player';
    
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const challenge = {
      challengeId,
      creatorId: userId,
      creatorName: challengerName,
      challengerName: challengerName, // Add this for frontend compatibility
      targetPlayerId: challengeData.targetPlayerId,
      targetPlayerName: challengeData.targetPlayerName,
      gameMode: challengeData.gameMode || 'Classic',
      difficulty: challengeData.difficulty || 'Medium',
      puzzle: challengeData.puzzle, // Store the puzzle data
      performance: challengeData.performance || [], // Store creator's performance
      startTime: challengeData.startTime || null, // Store the synchronized start time
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expirationTime.toISOString(),
      ttl: Math.floor(expirationTime.getTime() / 1000)
    };
    
    await retryOperation(() => 
      dynamodb.send(new PutCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Item: challenge
      }))
    );
    
    console.log('Challenge created:', {
      challengeId,
      from: challengerName,
      to: challengeData.targetPlayerName,
      creatorId: userId,
      targetId: challengeData.targetPlayerId,
      hasPuzzle: !!challengeData.puzzle,
      puzzleKeys: challengeData.puzzle ? Object.keys(challengeData.puzzle) : null
    });
    
    // Trigger real-time WebSocket notification
    try {
      const { sendNotification } = require('./websocket');
      await sendNotification(challengeData.targetPlayerId, {
        type: 'new_challenge',
        challengeId,
        challengerName,
        gameMode: challenge.gameMode,
        difficulty: challenge.difficulty,
        createdAt: challenge.createdAt
      });
    } catch (notifyError) {
      console.warn('Failed to send WebSocket notification:', notifyError);
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ challengeId, success: true })
    };
  } catch (error) {
    console.error('Create challenge error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to create challenge' })
    };
  }
}

async function getChallenge(challengeId) {
  try {
    const result = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Key: { challengeId }
      }))
    );
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Challenge not found' })
      };
    }
    
    // Check if expired
    if (new Date(result.Item.expiresAt) < new Date()) {
      return {
        statusCode: 410,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Challenge expired' })
      };
    }
    
    const challenge = result.Item;
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...challenge,
        // Ensure all required fields are present
        puzzle: challenge.puzzle || null,
        performance: challenge.performance || [],
        startTime: challenge.startTime || null
      })
    };
  } catch (error) {
    console.error('Get challenge error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get challenge' })
    };
  }
}

async function getMyChallenges(userId) {
  try {
    const result = await retryOperation(() => 
      dynamodb.send(new ScanCommand({
        TableName: process.env.CHALLENGE_TABLE,
        FilterExpression: 'targetPlayerId = :userId AND #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':status': 'pending'
        }
      }))
    );
    
    console.log('getMyChallenges result for user', userId, ':', {
      challengeCount: result.Items?.length || 0,
      challenges: result.Items?.map(c => ({
        id: c.challengeId,
        from: c.challengerName,
        createdAt: c.createdAt
      })) || []
    });
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ challenges: result.Items || [] })
    };
  } catch (error) {
    console.error('Get my challenges error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get challenges' })
    };
  }
}

async function acceptChallenge(userId, challengeId) {
  try {
    // Validate challengeId
    if (!challengeId || typeof challengeId !== 'string') {
      console.error('Accept challenge: Missing or invalid challengeId:', challengeId);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Challenge ID is required', code: 'MISSING_CHALLENGE_ID' })
      };
    }
    
    console.log('Accepting challenge:', challengeId, 'for user:', userId);
    
    // Get the challenge
    const result = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Key: { challengeId }
      }))
    );
    
    if (!result.Item) {
      console.log('Challenge not found:', challengeId);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Challenge not found' })
      };
    }
    
    const challenge = result.Item;
    console.log('Challenge found:', {
      id: challengeId,
      targetId: challenge.targetPlayerId,
      currentUserId: userId,
      status: challenge.status
    });
    
    // Verify user is the target
    if (challenge.targetPlayerId !== userId) {
      console.log('User not authorized to accept challenge:', {
        challengeTargetId: challenge.targetPlayerId,
        currentUserId: userId
      });
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Not authorized to accept this challenge' })
      };
    }
    
    // Check if expired
    if (new Date(challenge.expiresAt) < new Date()) {
      console.log('Challenge expired:', challengeId);
      return {
        statusCode: 410,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Challenge expired' })
      };
    }
    
    // Set synchronized start time (5 seconds from now)
    const startTime = new Date(Date.now() + 5000).toISOString();
    
    // Update challenge status with start time
    const updatedChallenge = {
      ...challenge,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      startTime: startTime
    };
    
    await retryOperation(() => 
      dynamodb.send(new PutCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Item: updatedChallenge
      }))
    );
    
    console.log('Challenge accepted successfully:', challengeId, 'with start time:', startTime);
    console.log('Challenge puzzle data:', {
      hasPuzzle: !!challenge.puzzle,
      puzzleKeys: challenge.puzzle ? Object.keys(challenge.puzzle) : null,
      puzzle: challenge.puzzle
    });
    
    // Return challenge data for starting the game
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        challengeData: {
          challengeId,
          challengerName: challenge.creatorName,
          gameMode: challenge.gameMode,
          difficulty: challenge.difficulty,
          level: challenge.difficulty, // Map difficulty to level for frontend compatibility
          puzzle: challenge.puzzle,
          performance: challenge.performance || [],
          startTime: startTime
        }
      })
    };
  } catch (error) {
    console.error('Accept challenge error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to accept challenge' })
    };
  }
}

async function declineChallenge(userId, challengeId) {
  try {
    // Get the challenge
    const result = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Key: { challengeId }
      }))
    );
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Challenge not found' })
      };
    }
    
    const challenge = result.Item;
    
    // Verify user is the target
    if (challenge.targetPlayerId !== userId) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Not authorized to decline this challenge' })
      };
    }
    
    // Update challenge status
    await retryOperation(() => 
      dynamodb.send(new PutCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Item: {
          ...challenge,
          status: 'declined',
          declinedAt: new Date().toISOString()
        }
      }))
    );
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Decline challenge error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to decline challenge' })
    };
  }
}

async function getVehicleImage(path) {
  try {
    const imageKey = path.replace('/images/', '');
    const s3Url = `https://vehicle-guesser-1764962592.s3.eu-west-1.amazonaws.com/images/${imageKey}`;
    
    return {
      statusCode: 302,
      headers: {
        ...corsHeaders,
        'Location': s3Url,
        'Cache-Control': 'public, max-age=86400'
      }
    };
  } catch (error) {
    console.error('Get image error:', error);
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Image not found' })
    };
  }
}




// Quick match function - returns only online players
async function getChallengeStatus(userId, challengeId) {
  try {
    const result = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Key: { challengeId }
      }))
    );
    
    if (!result.Item) {
      console.log('Challenge status check - challenge not found:', challengeId);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Challenge not found' })
      };
    }
    
    const challenge = result.Item;
    
    // Verify user is the creator
    if (challenge.creatorId !== userId) {
      console.log('Challenge status check - user not authorized:', {
        challengeCreatorId: challenge.creatorId,
        currentUserId: userId
      });
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Not authorized to check this challenge' })
      };
    }
    
    console.log('Challenge status check successful:', {
      challengeId,
      status: challenge.status,
      createdAt: challenge.createdAt,
      acceptedAt: challenge.acceptedAt || null
    });
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        challengeId,
        status: challenge.status,
        createdAt: challenge.createdAt,
        acceptedAt: challenge.acceptedAt || null
      })
    };
  } catch (error) {
    console.error('Get challenge status error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get challenge status' })
    };
  }
}

async function getOnlinePlayersForQuickMatch(currentUserId) {
  try {
    const result = await retryOperation(() => 
      dynamodb.send(new ScanCommand({
        TableName: process.env.GAME_DATA_TABLE
      }))
    );

    const onlinePlayers = result.Items
      .filter(item => {
        // Exclude current user
        if (item.userId === currentUserId) return false;
        
        // Check if player is online (active within last 3 minutes)
        const lastActivity = item.lastActivity || item.updatedAt;
        if (!lastActivity) return false;
        
        const isOnline = (Date.now() - new Date(lastActivity).getTime()) < 180000; // 3 minutes
        return isOnline;
      })
      .map(item => {
        let displayName = 'Anonymous';
        
        if (item.username) {
          displayName = item.username;
        } else if (item.profile?.username && !item.profile.username.startsWith('Google_')) {
          displayName = item.profile.username;
        } else if (item.userId) {
          const uid = item.userId.replace(/-/g, '').substring(0, 8).toUpperCase();
          displayName = `UID_${uid}`;
        }
        
        return {
          userId: item.userId,
          username: displayName,
          picture: item.profile?.picture,
          highScore: item.stats?.highScore || 0,
          level: item.stats?.level || 1,
          gamesPlayed: item.stats?.gamesPlayed || 0,
          winRate: item.stats?.gamesPlayed > 0 ? 
            Math.round((item.stats?.gamesWon / item.stats?.gamesPlayed) * 100) : 0,
          lastActive: lastActivity,
          skillLevel: item.stats?.highScore || 0
        };
      })
      .filter(player => player.username !== 'Anonymous')
      .sort((a, b) => b.highScore - a.highScore)
      .slice(0, 20); // Show top 20 online players

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        onlinePlayers,
        totalOnline: onlinePlayers.length
      })
    };
  } catch (error) {
    console.error('Get online players error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get online players' })
    };
  }
}

// Vehicle API functions
async function getVehiclesByLevel(level) {
  try {
    const levelKey = level.toLowerCase();
    const vehicles = VEHICLE_DATABASE[levelKey] || [];
    
    // Filter out broken images
    const availableVehicles = vehicles.filter(v => !brokenImages.has(v.imageKey));
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        vehicles: availableVehicles,
        total: availableVehicles.length,
        level: level,
        lastUpdated: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Get vehicles by level error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get vehicles' })
    };
  }
}

async function generateVehiclePuzzle(level) {
  try {
    const levelKey = level.toLowerCase();
    const vehicles = VEHICLE_DATABASE[levelKey] || [];
    const availableVehicles = vehicles.filter(v => !brokenImages.has(v.imageKey));
    
    if (!availableVehicles.length) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: `No vehicles available for level: ${level}` })
      };
    }
    
    // Select random vehicle
    const randomVehicle = availableVehicles[Math.floor(Math.random() * availableVehicles.length)];
    
    // Build full image URL
    const imageUrl = `${S3_CONFIG.BASE_URL}/${randomVehicle.imageKey}`;
    
    const puzzle = {
      id: randomVehicle.id,
      vehicle: randomVehicle.vehicle,
      imageUrl: imageUrl,
      brandOptions: shuffleArray([...randomVehicle.brandOptions]),
      modelOptions: shuffleArray([...randomVehicle.modelOptions]),
      yearOptions: shuffleArray([...randomVehicle.yearOptions]),
      difficulty: randomVehicle.difficulty,
      tags: randomVehicle.tags
    };
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(puzzle)
    };
  } catch (error) {
    console.error('Generate vehicle puzzle error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to generate puzzle' })
    };
  }
}

async function reportBrokenImage(imageUrl) {
  try {
    const imageKey = imageUrl.replace(S3_CONFIG.BASE_URL + '/', '');
    brokenImages.add(imageKey);
    
    console.log(`Marked image as broken: ${imageKey}`);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: 'Image reported as broken' })
    };
  } catch (error) {
    console.error('Report broken image error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to report broken image' })
    };
  }
}