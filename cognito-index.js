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

    // Update stats
    const { score, mode, level, mistakes = 0, isEndurance = false } = gameData;
    
    currentData.stats.gamesPlayed += 1;
    currentData.stats.totalPoints += score;
    currentData.stats.difficultyPlays[level] = (currentData.stats.difficultyPlays[level] || 0) + 1;
    
    if (isEndurance) {
      currentData.stats.enduranceHighScore = Math.max(currentData.stats.enduranceHighScore, score);
    } else {
      currentData.stats.highScore = Math.max(currentData.stats.highScore, score);
    }
    
    currentData.stats.correctAnswers += Math.floor(score / 100);
    currentData.stats.incorrectAnswers += mistakes;
    
    if (mistakes === 0 && !isEndurance) {
      currentData.stats.perfectRounds += 1;
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