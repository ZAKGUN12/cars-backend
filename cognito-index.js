// Updated: 2024-01-15
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

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
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

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

    // New rival challenge endpoints
    if (path === '/matchmaking/join-queue' && httpMethod === 'POST') {
      return await joinMatchmakingQueue(userId, JSON.parse(body || '{}'), userProfile);
    }

    if (path === '/matchmaking/leave-queue' && httpMethod === 'POST') {
      return await leaveMatchmakingQueue(userId);
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
      console.log('User not found by userId, checking by email:', userProfile.email);
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
      if (existingUsername && !existingUsername.startsWith('Google_') && existingUsername !== userProfile.username) {
        gameData.profile.username = existingUsername;
      }
      
      // Ensure authMethod is set for existing users
      if (!gameData.profile.authMethod) {
        gameData.profile.authMethod = userProfile.authMethod;
      }
    }
    
    if (!gameData.stats.gears) gameData.stats.gears = 20;
    if (!gameData.stats.xp) gameData.stats.xp = 0;
    if (!gameData.stats.level) gameData.stats.level = 1;
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
      if (existingUsername && !existingUsername.startsWith('Google_') && existingUsername !== userProfile.username) {
        currentData.profile.username = existingUsername;
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
    
    // Basic score validation
    if (score > MAX_POINTS_PER_GAME || score < 0) {
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
      // Handle hint usage
      currentData.stats.gears = Math.max(0, currentData.stats.gears - hintCost);
    } else if (mode === 'powerup' && powerUpType) {
      // Handle powerup usage
      if (currentData.stats.powerUps[powerUpType] > 0) {
        currentData.stats.powerUps[powerUpType] -= 1;
      }
    } else if (mode === 'purchase' && purchaseData) {
      // Handle powerup purchase
      const { powerUp, cost } = purchaseData;
      if (currentData.stats.gears >= cost) {
        currentData.stats.gears -= cost;
        currentData.stats.powerUps[powerUp] = (currentData.stats.powerUps[powerUp] || 0) + 1;
      }
    } else {
      // Handle game stats with proper number validation
      currentData.stats.gamesPlayed = Number(currentData.stats.gamesPlayed || 0) + 1;
      currentData.stats.totalPoints = Number(currentData.stats.totalPoints || 0) + Number(score || 0);
      currentData.stats.difficultyPlays[level] = Number(currentData.stats.difficultyPlays[level] || 0) + 1;
      
      if (isEndurance) {
        currentData.stats.enduranceHighScore = Math.max(Number(currentData.stats.enduranceHighScore || 0), Number(score || 0));
      } else {
        currentData.stats.highScore = Math.max(Number(currentData.stats.highScore || 0), Number(score || 0));
      }
      
      currentData.stats.correctAnswers = Number(currentData.stats.correctAnswers || 0) + Number(correctCount || 0);
      currentData.stats.incorrectAnswers = Number(currentData.stats.incorrectAnswers || 0) + Number(mistakes || 0);
      
      const isPerfectGame = !isEndurance && mistakes === 0;
      if (isPerfectGame) {
        currentData.stats.perfectRounds += 1;
      }
      
      // Optimized XP and level progression with realistic values
      const validScore = Number(score || 0);
      const baseXp = Math.floor(validScore / 10);
      const timeBonus = Math.max(0, Math.floor((validScore % 1000) / 100));
      const xpGained = baseXp + timeBonus + (isPerfectGame ? 25 : 0);
      
      const baseGears = Math.floor(validScore / 50);
      const gearsGained = baseGears + (isPerfectGame ? 10 : 0);
      
      const XP_PER_LEVEL = 500;
      const GEARS_PER_LEVEL_UP = 25;
      const PERFECT_BONUS_POINTS = 30;
      
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
      
      // Handle journey progress
      if (mode === 'Journey' && journeyData) {
        console.log('Processing journey data:', JSON.stringify(journeyData));
        try {
          const { levelId, stars, completed, score: journeyScore } = journeyData;
          
          // Validate journey data
          if (!levelId || typeof stars !== 'number' || typeof completed !== 'boolean' || typeof journeyScore !== 'number') {
            console.error('Invalid journey data:', journeyData);
            throw new Error('Invalid journey data format');
          }
          
          const existing = currentData.stats.journeyProgress[levelId];
          
          console.log('Journey progress update:', {
            levelId,
            stars,
            completed,
            journeyScore,
            existing
          });
          
          // Always update completion status if level is completed for the first time
          // Or if better score is achieved
          if (!existing || existing.score < journeyScore || (!existing.completed && completed)) {
            currentData.stats.journeyProgress[levelId] = {
              stars: Math.max(stars, existing?.stars || 0),
              score: Math.max(journeyScore, existing?.score || 0),
              completed: completed || (existing?.completed || false)
            };
            console.log('Journey progress updated:', currentData.stats.journeyProgress[levelId]);
          }
        } catch (journeyError) {
          console.error('Journey data processing error:', journeyError);
          // Don't throw the error, just log it and continue with the rest of the update
          console.warn('Continuing with game stats update despite journey error');
        }
      }
      
      // Add to game history
      currentData.stats.gameHistory.unshift({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        mode,
        level,
        score,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 10 games
      currentData.stats.gameHistory = currentData.stats.gameHistory.slice(0, 10);
    }
    currentData.updatedAt = new Date().toISOString();

    // Save updated data with retry
    await retryOperation(() => 
      dynamodb.send(new PutCommand({
        TableName: process.env.GAME_DATA_TABLE,
        Item: currentData
      }))
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(currentData)
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
          winRate: item.stats.gamesPlayed > 0 ? Math.round((item.stats.correctAnswers / (item.stats.correctAnswers + item.stats.incorrectAnswers)) * 100) || 0 : 0,
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

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        leaderboard: players.slice(0, 10), // Top 10 for leaderboard
        rivals: players, // All 50 for rival selection
        totalPlayers: result.Items.length
      })
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
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const challengerName = userProfile.username || userProfile.name || 'Unknown Player';
    const challenge = {
      challengeId,
      creatorId: userId,
      creatorName: challengerName,
      challengerName: challengerName, // Add this for frontend compatibility
      targetPlayerId: challengeData.targetPlayerId,
      targetPlayerName: challengeData.targetPlayerName,
      gameMode: challengeData.gameMode || 'Classic',
      difficulty: challengeData.difficulty || 'Medium',
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
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Item)
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
        body: JSON.stringify({ error: 'Not authorized to accept this challenge' })
      };
    }
    
    // Check if expired
    if (new Date(challenge.expiresAt) < new Date()) {
      return {
        statusCode: 410,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Challenge expired' })
      };
    }
    
    // Update challenge status
    await retryOperation(() => 
      dynamodb.send(new PutCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Item: {
          ...challenge,
          status: 'accepted',
          acceptedAt: new Date().toISOString()
        }
      }))
    );
    
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
          level: challenge.difficulty
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

// New rival challenge functions
async function joinMatchmakingQueue(userId, queueData, userProfile) {
  try {
    const queueEntry = {
      userId,
      username: userProfile.username || userProfile.name,
      skillLevel: queueData.skillLevel || 1,
      preferredDifficulty: queueData.difficulty || 'Medium',
      joinedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 300 // 5 minutes
    };
    
    await dynamodb.send(new PutCommand({
      TableName: process.env.MATCHMAKING_TABLE,
      Item: queueEntry
    }));
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, estimatedWait: 15 })
    };
  } catch (error) {
    console.error('Join queue error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to join queue' })
    };
  }
}

async function leaveMatchmakingQueue(userId) {
  try {
    await dynamodb.send(new DeleteCommand({
      TableName: process.env.MATCHMAKING_TABLE,
      Key: { userId }
    }));
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to leave queue' })
    };
  }
}

