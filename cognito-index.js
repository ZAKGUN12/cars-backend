const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
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
      
      return await setupUsername(userId, requestData.username, userProfile);
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

    if (path === '/leaderboard' && httpMethod === 'GET') {
      return await getLeaderboard();
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
    const result = await retryOperation(() => 
      dynamodb.send(new GetCommand({
        TableName: process.env.GAME_DATA_TABLE,
        Key: { userId }
      }))
    );

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
    
    if (!currentData.stats.gears) currentData.stats.gears = 20;
    if (!currentData.stats.xp) currentData.stats.xp = 0;
    if (!currentData.stats.level) currentData.stats.level = 1;
    if (!currentData.stats.powerUps) currentData.stats.powerUps = { timeFreeze: 0, clueGiver: 0 };
    if (!currentData.stats.journeyProgress) currentData.stats.journeyProgress = {};
    if (!currentData.stats.difficultyPlays) currentData.stats.difficultyPlays = { Easy: 0, Medium: 0, Hard: 0 };

    // Update stats
    const { score, mode, level, mistakes = 0, isEndurance = false, bonusData, journeyData, hintCost, powerUpType, purchaseData, profileData, correctCount = 0 } = gameData;
    
    // Validate score (anti-cheat) - Allow higher scores for journey mode
    const MAX_POINTS_PER_VEHICLE = 210;
    const MAX_POINTS_PER_GAME = mode === 'Journey' ? MAX_POINTS_PER_VEHICLE * 10 : MAX_POINTS_PER_VEHICLE * 5; // Journey can have up to 10 rounds
    if (score > MAX_POINTS_PER_GAME) {
      console.warn(`Suspicious score detected: ${score} for user ${userId} in mode ${mode}`);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid score value' })
      };
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
      // Handle game stats
      currentData.stats.gamesPlayed += 1;
      currentData.stats.totalPoints += score;
      currentData.stats.difficultyPlays[level] = (currentData.stats.difficultyPlays[level] || 0) + 1;
      
      if (isEndurance) {
        currentData.stats.enduranceHighScore = Math.max(currentData.stats.enduranceHighScore, score);
      } else {
        currentData.stats.highScore = Math.max(currentData.stats.highScore, score);
      }
      
      currentData.stats.correctAnswers += correctCount;
      currentData.stats.incorrectAnswers += mistakes;
      
      const isPerfectGame = !isEndurance && mistakes === 0;
      if (isPerfectGame) {
        currentData.stats.perfectRounds += 1;
      }
      
      // Optimized XP and level progression with realistic values
      const baseXp = Math.floor(score / 10); // 1 XP per 10 points
      const timeBonus = Math.max(0, Math.floor((score % 1000) / 100)); // Time bonus XP
      const xpGained = baseXp + timeBonus + (isPerfectGame ? 25 : 0);
      
      const baseGears = Math.floor(score / 50); // 1 gear per 50 points
      const gearsGained = baseGears + (isPerfectGame ? 10 : 0);
      
      const XP_PER_LEVEL = 500;
      const GEARS_PER_LEVEL_UP = 25;
      const PERFECT_BONUS_POINTS = 30;
      
      let newXp = currentData.stats.xp + xpGained;
      let newLevel = currentData.stats.level;
      let newGears = currentData.stats.gears + gearsGained;
      
      if (newXp >= XP_PER_LEVEL) {
        const levelsGained = Math.floor(newXp / XP_PER_LEVEL);
        newLevel += levelsGained;
        newXp = newXp % XP_PER_LEVEL;
        newGears += (GEARS_PER_LEVEL_UP * levelsGained);
      }
      
      currentData.stats.xp = newXp;
      currentData.stats.level = newLevel;
      currentData.stats.gears = newGears;
      
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

    const leaderboard = result.Items
      .map(item => ({
        username: item.profile?.username || item.profile?.name || 'Anonymous',
        picture: item.profile?.picture,
        highScore: item.stats.highScore || 0,
        level: item.stats.level || 1,
        gamesPlayed: item.stats.gamesPlayed || 0
      }))
      .sort((a, b) => b.highScore - a.highScore)
      .slice(0, 10)
      .map((user, index) => ({
        rank: index + 1,
        ...user
      }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(leaderboard)
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
    const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const challenge = {
      challengeId,
      creatorId: userId,
      creatorName: userProfile.username || userProfile.name,
      ...challengeData,
      createdAt: new Date().toISOString(),
      expiresAt: expirationTime.toISOString(),
      ttl: Math.floor(expirationTime.getTime() / 1000) // TTL in seconds
    };
    
    await retryOperation(() => 
      dynamodb.send(new PutCommand({
        TableName: process.env.CHALLENGE_TABLE,
        Item: challenge
      }))
    );
    
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