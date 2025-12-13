const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Matchmaking event:', JSON.stringify(event, null, 2));

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

    // Extract user info from Cognito JWT
    const claims = event.requestContext?.authorizer?.claims;
    const userId = claims?.sub;
    const username = claims?.['cognito:username'] || claims?.preferred_username || 'Unknown';
    
    if (!userId) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    if (path === '/join-queue' && httpMethod === 'POST') {
      return await joinMatchmakingQueue(userId, username, JSON.parse(body || '{}'));
    }

    if (path === '/leave-queue' && httpMethod === 'POST') {
      return await leaveMatchmakingQueue(userId);
    }

    if (path === '/find-match' && httpMethod === 'POST') {
      return await findMatch(userId, username, JSON.parse(body || '{}'));
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Matchmaking error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function joinMatchmakingQueue(userId, username, queueData) {
  try {
    const { skillLevel = 0, difficulty = 'Medium' } = queueData;
    
    // Add player to matchmaking queue
    const queueItem = {
      userId,
      username,
      skillLevel,
      difficulty,
      joinedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 300 // 5 minutes TTL
    };

    await dynamodb.send(new PutCommand({
      TableName: process.env.MATCHMAKING_TABLE,
      Item: queueItem
    }));

    console.log('Player joined queue:', { userId, username, skillLevel, difficulty });

    // Try to find a match immediately
    const match = await findMatchForPlayer(userId, username, skillLevel, difficulty);
    
    if (match) {
      // Remove both players from queue
      await Promise.all([
        dynamodb.send(new DeleteCommand({
          TableName: process.env.MATCHMAKING_TABLE,
          Key: { userId }
        })),
        dynamodb.send(new DeleteCommand({
          TableName: process.env.MATCHMAKING_TABLE,
          Key: { userId: match.userId }
        }))
      ]);

      // Notify both players via WebSocket
      await notifyMatchFound(userId, match);
      await notifyMatchFound(match.userId, { userId, username, skillLevel });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: true, 
          matchFound: true,
          opponent: {
            username: match.username,
            skillLevel: match.skillLevel
          }
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true, 
        matchFound: false,
        estimatedWait: 30 
      })
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

    console.log('Player left queue:', userId);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Leave queue error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to leave queue' })
    };
  }
}

async function findMatchForPlayer(userId, username, skillLevel, difficulty) {
  try {
    // Get all players in queue for the same difficulty
    const result = await dynamodb.send(new ScanCommand({
      TableName: process.env.MATCHMAKING_TABLE,
      FilterExpression: 'difficulty = :difficulty AND userId <> :userId',
      ExpressionAttributeValues: {
        ':difficulty': difficulty,
        ':userId': userId
      }
    }));

    const availablePlayers = result.Items || [];
    
    if (availablePlayers.length === 0) {
      return null;
    }

    // Find skill-matched opponent (within 200 points)
    const skillMatched = availablePlayers.find(player => 
      Math.abs(player.skillLevel - skillLevel) <= 200
    );

    // Return best match or first available player
    return skillMatched || availablePlayers[0];

  } catch (error) {
    console.error('Find match error:', error);
    return null;
  }
}

async function findMatch(userId, username, searchData) {
  try {
    const { skillLevel = 0, difficulty = 'Medium' } = searchData;
    
    const match = await findMatchForPlayer(userId, username, skillLevel, difficulty);
    
    if (match) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          matchFound: true,
          opponent: {
            username: match.username,
            skillLevel: match.skillLevel
          }
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        matchFound: false,
        playersInQueue: await getQueueSize(difficulty)
      })
    };

  } catch (error) {
    console.error('Find match error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to find match' })
    };
  }
}

async function getQueueSize(difficulty) {
  try {
    const result = await dynamodb.send(new ScanCommand({
      TableName: process.env.MATCHMAKING_TABLE,
      FilterExpression: 'difficulty = :difficulty',
      ExpressionAttributeValues: {
        ':difficulty': difficulty
      },
      Select: 'COUNT'
    }));

    return result.Count || 0;
  } catch (error) {
    console.error('Get queue size error:', error);
    return 0;
  }
}

async function notifyMatchFound(userId, opponent) {
  try {
    // Get user's WebSocket connection
    const connections = await dynamodb.send(new QueryCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));

    if (!connections.Items || connections.Items.length === 0) {
      console.log('No WebSocket connection found for user:', userId);
      return;
    }

    const apiGateway = new ApiGatewayManagementApiClient({
      endpoint: process.env.WEBSOCKET_ENDPOINT
    });

    // Send match notification to all user connections
    await Promise.all(connections.Items.map(async (connection) => {
      try {
        await apiGateway.send(new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify({
            type: 'match_found',
            opponent: {
              username: opponent.username,
              skillLevel: opponent.skillLevel,
              highScore: opponent.skillLevel
            }
          })
        }));
        console.log('Match notification sent to:', userId);
      } catch (err) {
        if (err.statusCode === 410) {
          // Connection is stale, remove it
          await dynamodb.send(new DeleteCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: connection.connectionId }
          }));
        }
        console.error('Failed to send match notification:', err);
      }
    }));

  } catch (error) {
    console.error('Notify match found error:', error);
  }
}