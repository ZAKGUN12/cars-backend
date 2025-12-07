const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

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
    
    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Extract user ID from Cognito JWT
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Route handling
    if (path === '/gamedata') {
      if (httpMethod === 'GET') {
        return await getGameData(userId);
      } else if (httpMethod === 'POST') {
        return await updateGameData(userId, JSON.parse(body));
      }
    }

    if (path === '/leaderboard' && httpMethod === 'GET') {
      return await getLeaderboard();
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
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function getGameData(userId) {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: process.env.GAME_DATA_TABLE,
      Key: { userId }
    }));

    const gameData = result.Item || {
      userId,
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
    if (!gameData.stats.gears) gameData.stats.gears = 20;
    if (!gameData.stats.xp) gameData.stats.xp = 0;
    if (!gameData.stats.level) gameData.stats.level = 1;
    if (!gameData.stats.powerUps) gameData.stats.powerUps = { timeFreeze: 0, clueGiver: 0 };
    if (!gameData.stats.journeyProgress) gameData.stats.journeyProgress = {};

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

async function updateGameData(userId, gameData) {
  try {
    // Get existing data
    const existing = await dynamodb.send(new GetCommand({
      TableName: process.env.GAME_DATA_TABLE,
      Key: { userId }
    }));

    const currentData = existing.Item || {
      userId,
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
    if (!currentData.stats.gears) currentData.stats.gears = 20;
    if (!currentData.stats.xp) currentData.stats.xp = 0;
    if (!currentData.stats.level) currentData.stats.level = 1;
    if (!currentData.stats.powerUps) currentData.stats.powerUps = { timeFreeze: 0, clueGiver: 0 };
    if (!currentData.stats.journeyProgress) currentData.stats.journeyProgress = {};

    // Update stats
    const { score, mode, level, mistakes = 0, isEndurance = false, bonusData, journeyData, hintCost, powerUpType, purchaseData } = gameData;
    
    if (mode === 'bonus' && bonusData) {
      // Handle daily bonus
      currentData.stats.gears += bonusData.gears;
      currentData.stats.lastBonusDate = bonusData.lastBonusDate;
      currentData.stats.loginStreak = bonusData.loginStreak;
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
      
      currentData.stats.correctAnswers += Math.floor(score / 25); // Adjusted for new scoring
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
      
      const XP_PER_LEVEL = 500; // Reduced from 2500
      const GEARS_PER_LEVEL_UP = 25; // Reduced from 50
      
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
        const { levelId, stars, completed, score: journeyScore } = journeyData;
        const existing = currentData.stats.journeyProgress[levelId];
        
        // Only update if better score or first attempt
        if (!existing || existing.score < journeyScore) {
          currentData.stats.journeyProgress[levelId] = {
            stars,
            score: journeyScore,
            completed
          };
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

    // Save updated data
    await dynamodb.send(new PutCommand({
      TableName: process.env.GAME_DATA_TABLE,
      Item: currentData
    }));

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
    const result = await dynamodb.send(new ScanCommand({
      TableName: process.env.GAME_DATA_TABLE
    }));

    const leaderboard = result.Items
      .map(item => ({
        username: item.username || 'Anonymous',
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