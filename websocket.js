const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log('WebSocket event:', JSON.stringify(event, null, 2));
  
  const { connectionId, routeKey } = event.requestContext;
  const userId = event.queryStringParameters?.userId;

  try {
    if (routeKey === '$connect') {
      console.log('WebSocket connect:', { connectionId, userId });
      
      if (!userId) {
        console.error('Missing userId in connect');
        return { statusCode: 400, body: 'Missing userId' };
      }
      
      await dynamodb.send(new PutCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Item: {
          connectionId,
          userId,
          connectedAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + 86400 // 24 hours
        }
      }));
      
      console.log('WebSocket connection stored');
      return { statusCode: 200, body: 'Connected' };
    }
    
    if (routeKey === '$disconnect') {
      console.log('WebSocket disconnect:', { connectionId });
      
      await dynamodb.send(new DeleteCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId }
      }));
      
      console.log('WebSocket connection removed');
      return { statusCode: 200, body: 'Disconnected' };
    }
    
    console.log('Unknown route:', routeKey);
    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('WebSocket error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Function to send notification to user
exports.sendNotification = async (userId, message) => {
  try {
    const connections = await dynamodb.send(new QueryCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));

    const apiGateway = new ApiGatewayManagementApiClient({
      endpoint: process.env.WEBSOCKET_ENDPOINT
    });

    await Promise.all(connections.Items.map(async (connection) => {
      try {
        await apiGateway.send(new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify(message)
        }));
      } catch (err) {
        if (err.statusCode === 410) {
          // Connection is stale, remove it
          await dynamodb.send(new DeleteCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: connection.connectionId }
          }));
        }
      }
    }));
  } catch (error) {
    console.error('Send notification error:', error);
  }
};